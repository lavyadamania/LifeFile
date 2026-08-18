const router = require('express').Router();
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const mongoose = require('mongoose');

function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
    try {
      return new mongoose.Types.ObjectId(id);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function getIdMatch(id) {
  const objId = toObjectId(id);
  if (objId) {
    return { $in: [objId, String(id)] };
  }
  return id;
}


// ────────────────────────────────────────────
// ADMIN ANALYTICS — /api/analytics/admin
// ────────────────────────────────────────────
router.get('/admin', auth, requireRole('admin'), async (req, res) => {
  try {
    // ── 1. Growth over last 30 days (patient registrations) ──
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const patientGrowth = await User.aggregate([
      { $match: { role: 'patient', createdAt: { $gte: thirtyDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    // ── 2. Appointments by status (all time) ──
    const appointmentsByStatus = await Appointment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // ── 3. Appointments trend (last 30 days) ──
    const appointmentTrend = await Appointment.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
        missed: { $sum: { $cond: [{ $eq: ['$status', 'Missed'] }, 1, 0] } },
      }},
      { $sort: { _id: 1 } }
    ]);

    // ── 4. Doctors by specialization ──
    const doctorsBySpec = await Doctor.aggregate([
      { $group: { _id: '$specialization', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // ── 5. Top hospitals by appointment volume ──
    const hospitalLoad = await Appointment.aggregate([
      { $match: { hospitalId: { $ne: null } } },
      { $group: { _id: '$hospitalName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

    // ── 6. Overall KPIs ──
    const totalPatients = await User.countDocuments({ role: 'patient' });
    const totalDoctors = await Doctor.countDocuments();
    const totalHospitals = await Hospital.countDocuments();
    const totalAppointments = await Appointment.countDocuments();
    const completedAppointments = await Appointment.countDocuments({ status: 'Completed' });
    const totalPrescriptions = await Prescription.countDocuments();
    
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = await Appointment.countDocuments({ date: today });

    // ── 7. Peak hours distribution ──
    const peakHours = await Appointment.aggregate([
      { $addFields: { hour: { $substr: ['$time', 0, 2] } } },
      { $group: { _id: '$hour', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // ── 8. Walk-in vs Booked ratio ──
    const walkinCount = await Appointment.countDocuments({ isWalkin: true });
    const bookedCount = await Appointment.countDocuments({ isWalkin: false });

    res.json({
      kpis: {
        totalPatients,
        totalDoctors,
        totalHospitals,
        totalAppointments,
        completedAppointments,
        totalPrescriptions,
        todayAppointments,
        completionRate: totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0,
      },
      patientGrowth,
      appointmentsByStatus,
      appointmentTrend,
      doctorsBySpec,
      hospitalLoad,
      peakHours,
      walkinVsBooked: { walkin: walkinCount, booked: bookedCount },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────
// DOCTOR ANALYTICS — /api/analytics/doctor
// ────────────────────────────────────────────
router.get('/doctor', auth, requireRole('doctor'), async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ $or: [{ userId: req.user._id }, { userId: req.user.id }] });
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });
    const doctorId = doctor._id;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // ── 1. Appointment trend (last 30 days) ──
    const appointmentTrend = await Appointment.aggregate([
      { $match: { doctorId, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
      }},
      { $sort: { _id: 1 } }
    ]);

    // ── 2. Status breakdown ──
    const statusBreakdown = await Appointment.aggregate([
      { $match: { doctorId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // ── 3. Top diagnoses ──
    const topDiagnoses = await Prescription.aggregate([
      { $match: { doctorId, diagnosis: { $ne: '' } } },
      { $group: { _id: '$diagnosis', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

    // ── 4. Top prescribed medications ──
    const topMeds = await Prescription.aggregate([
      { $match: { doctorId } },
      { $unwind: '$medications' },
      { $group: { _id: '$medications.name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

    // ── 5. KPIs ──
    const totalAppointments = await Appointment.countDocuments({ doctorId });
    const completedAppointments = await Appointment.countDocuments({ doctorId, status: 'Completed' });
    const totalPrescriptions = await Prescription.countDocuments({ doctorId });
    const uniquePatients = await Appointment.distinct('patientId', { doctorId });
    
    const today = new Date().toISOString().split('T')[0];
    const todayAppts = await Appointment.countDocuments({ doctorId, date: today });

    // ── 6. Patients per hospital ──
    const hospitalDistribution = await Appointment.aggregate([
      { $match: { doctorId, hospitalName: { $ne: '' } } },
      { $group: { _id: '$hospitalName', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // ── 7. Weekly heatmap (day of week distribution) ──
    const weeklyPattern = await Appointment.aggregate([
      { $match: { doctorId } },
      { $addFields: { dayOfWeek: { $dayOfWeek: '$createdAt' } } },
      { $group: { _id: '$dayOfWeek', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      kpis: {
        totalAppointments,
        completedAppointments,
        totalPrescriptions,
        uniquePatients: uniquePatients.length,
        todayAppts,
        completionRate: totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0,
        rating: doctor.rating || 0,
        reviewCount: doctor.reviewCount || 0,
      },
      appointmentTrend,
      statusBreakdown,
      topDiagnoses,
      topMeds,
      hospitalDistribution,
      weeklyPattern,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────
// HOSPITAL ANALYTICS — /api/analytics/hospital
// ────────────────────────────────────────────
router.get('/hospital', auth, requireRole('hospital'), async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ $or: [{ userId: req.user._id }, { userId: req.user.id }] }).populate('doctors');
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // ── 1. Appointment trend at this hospital ──
    const appointmentTrend = await Appointment.aggregate([
      { $match: { hospitalId: hospital._id, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
        walkin: { $sum: { $cond: [{ $eq: ['$isWalkin', true] }, 1, 0] } },
      }},
      { $sort: { _id: 1 } }
    ]);

    // ── 2. Doctor-wise appointment load ──
    const doctorLoad = await Appointment.aggregate([
      { $match: { hospitalId: hospital._id } },
      { $group: { _id: '$doctorName', total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } } } },
      { $sort: { total: -1 } }
    ]);

    // ── 3. Status breakdown ──
    const statusBreakdown = await Appointment.aggregate([
      { $match: { hospitalId: hospital._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // ── 4. Department distribution (from doctors' specializations) ──
    const departmentLoad = [];
    if (hospital.doctors && hospital.doctors.length > 0) {
      const specs = {};
      for (const doc of hospital.doctors) {
        const spec = doc.specialization || 'General';
        if (!specs[spec]) specs[spec] = 0;
        specs[spec]++;
      }
      for (const [name, count] of Object.entries(specs)) {
        departmentLoad.push({ _id: name, count });
      }
      departmentLoad.sort((a, b) => b.count - a.count);
    }

    // ── 5. Peak hours ──
    const peakHours = await Appointment.aggregate([
      { $match: { hospitalId: hospital._id } },
      { $addFields: { hour: { $substr: ['$time', 0, 2] } } },
      { $group: { _id: '$hour', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // ── 6. KPIs ──
    const totalAppointments = await Appointment.countDocuments({ hospitalId: hospital._id });
    const completedAppointments = await Appointment.countDocuments({ hospitalId: hospital._id, status: 'Completed' });
    const totalPrescriptions = await Prescription.countDocuments({ hospitalId: hospital._id });
    const uniquePatients = await Appointment.distinct('patientId', { hospitalId: hospital._id });
    const today = new Date().toISOString().split('T')[0];
    const todayAppts = await Appointment.countDocuments({ hospitalId: hospital._id, date: today });
    const walkinCount = await Appointment.countDocuments({ hospitalId: hospital._id, isWalkin: true });

    res.json({
      kpis: {
        totalDoctors: hospital.doctors?.length || 0,
        totalAppointments,
        completedAppointments,
        totalPrescriptions,
        uniquePatients: uniquePatients.length,
        todayAppts,
        walkinCount,
        completionRate: totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0,
        departments: hospital.departments?.length || 0,
      },
      appointmentTrend,
      doctorLoad,
      statusBreakdown,
      departmentLoad,
      peakHours,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────
// PATIENT ANALYTICS — /api/analytics/patient
// ────────────────────────────────────────────
router.get('/patient', auth, requireRole('patient'), async (req, res) => {
  try {
    const patientIdMatch = getIdMatch(req.user._id || req.user.id);

    // ── 1. Appointment history by month ──
    const appointmentHistory = await Appointment.aggregate([
      { $match: { patientId: patientIdMatch } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
      }},
      { $sort: { _id: 1 } },
      { $limit: 12 }
    ]);

    // ── 2. Status breakdown ──
    const statusBreakdown = await Appointment.aggregate([
      { $match: { patientId: patientIdMatch } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // ── 3. Doctors visited ──
    const doctorsVisited = await Appointment.aggregate([
      { $match: { patientId: patientIdMatch, status: 'Completed' } },
      { $group: { _id: '$doctorName', count: { $sum: 1 }, spec: { $first: '$spec' } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // ── 4. Hospitals visited ──
    const hospitalsVisited = await Appointment.aggregate([
      { $match: { patientId: patientIdMatch, hospitalName: { $ne: '' } } },
      { $group: { _id: '$hospitalName', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // ── 5. Medications received ──
    const medications = await Prescription.aggregate([
      { $match: { patientId: patientIdMatch } },
      { $unwind: '$medications' },
      { $group: { _id: '$medications.name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // ── 6. KPIs ──
    const totalAppointments = await Appointment.countDocuments({ patientId: patientIdMatch });
    const completedAppointments = await Appointment.countDocuments({ patientId: patientIdMatch, status: 'Completed' });
    const totalPrescriptions = await Prescription.countDocuments({ patientId: patientIdMatch });
    const uniqueDoctors = await Appointment.distinct('doctorId', { patientId: patientIdMatch });

    res.json({
      kpis: {
        totalAppointments,
        completedAppointments,
        totalPrescriptions,
        uniqueDoctors: uniqueDoctors.length,
      },
      appointmentHistory,
      statusBreakdown,
      doctorsVisited,
      hospitalsVisited,
      medications,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
