const router = require('express').Router();
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Prescription = require('../models/Prescription');
const JoinRequest = require('../models/JoinRequest');
const { auth, requireRole } = require('../middleware/auth');

// GET /api/hospitals — list all (public, searchable)
router.get('/', async (req, res) => {
  try {
    const { search, department } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }
    if (department) {
      filter.departments = { $regex: department, $options: 'i' };
    }
    const hospitals = await Hospital.find(filter)
      .populate('doctors', 'name specialization rating status')
      .sort({ createdAt: -1 });
    res.json(hospitals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/hospitals/me — get my hospital profile
router.get('/me', auth, requireRole('hospital'), async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user.id })
      .populate('doctors', 'name specialization rating reviewCount status hours location bio experience schedule hospitals');
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    res.json(hospital);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/hospitals/me — update my hospital profile
router.put('/me', auth, requireRole('hospital'), async (req, res) => {
  try {
    const hospital = await Hospital.findOneAndUpdate(
      { userId: req.user.id },
      req.body,
      { new: true }
    );
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    res.json(hospital);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/hospitals/me/requests — get pending requests
router.get('/me/requests', auth, requireRole('hospital'), async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user.id });
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    const requests = await JoinRequest.find({ hospitalId: hospital._id }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/hospitals/me/requests/:reqId — approve or reject request
router.put('/me/requests/:reqId', auth, requireRole('hospital'), async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const request = await JoinRequest.findById(req.params.reqId);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const hospital = await Hospital.findOne({ userId: req.user.id });
    if (!hospital || request.hospitalId.toString() !== hospital._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    request.status = status;
    await request.save();

    if (status === 'approved') {
      const doctor = await Doctor.findById(request.doctorId);
      if (doctor && !doctor.hospitals.includes(hospital._id)) {
        doctor.hospitals.push(hospital._id);
        await doctor.save();
      }
      if (!hospital.doctors.includes(doctor._id)) {
        hospital.doctors.push(doctor._id);
        await hospital.save();
      }
    }

    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/hospitals/:id — get details with populated doctors
router.get('/:id', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id)
      .populate('doctors', 'name specialization rating reviewCount status hours location bio experience schedule hospitals');
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    res.json(hospital);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hospitals — create (admin only)
router.post('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const hospital = await Hospital.create(req.body);
    res.status(201).json(hospital);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/hospitals/:id — update (admin only)
router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    res.json(hospital);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/hospitals/:id — delete (admin only)
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

    // Remove hospital reference from all affiliated doctors
    await Doctor.updateMany(
      { hospitals: req.params.id },
      { $pull: { hospitals: req.params.id } }
    );

    await Hospital.findByIdAndDelete(req.params.id);
    res.json({ message: 'Hospital deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/hospitals/:id/doctors — add or remove a doctor from hospital roster (admin or hospital itself)
router.put('/:id/doctors', auth, async (req, res) => {
  try {
    const { doctorId, action } = req.body; // action: 'add' or 'remove'
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

    if (req.user.role !== 'admin' && hospital.userId?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    if (action === 'add') {
      // Add doctor to hospital roster (avoid duplicates)
      if (!hospital.doctors.includes(doctorId)) {
        hospital.doctors.push(doctorId);
        await hospital.save();
      }
      // Add hospital to doctor's affiliations (avoid duplicates)
      if (!doctor.hospitals) doctor.hospitals = [];
      if (!doctor.hospitals.map(h => h.toString()).includes(req.params.id)) {
        doctor.hospitals.push(req.params.id);
        await doctor.save();
      }
    } else if (action === 'remove') {
      hospital.doctors = hospital.doctors.filter(d => d.toString() !== doctorId);
      await hospital.save();
      if (doctor.hospitals) {
        doctor.hospitals = doctor.hospitals.filter(h => h.toString() !== req.params.id);
        await doctor.save();
      }
    } else {
      return res.status(400).json({ error: 'action must be "add" or "remove"' });
    }

    const updated = await Hospital.findById(req.params.id)
      .populate('doctors', 'name specialization rating status');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hospitals/:id/hire — hire (register) a new doctor and affiliate with this hospital
router.post('/:id/hire', auth, async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

    if (req.user.role !== 'admin' && hospital.userId?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, email, password, specialization } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }

    // Check if user already exists
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ error: 'Email already registered' });

    // Create User account
    const user = await User.create({ name, email, password, role: 'doctor' });

    // Create Doctor profile with hospital affiliation
    const defaultDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => ({
      day: d, isAvailable: d !== 'Sun', startTime: '09:00', endTime: '17:00'
    }));
    const doctor = await Doctor.create({
      userId: user._id,
      name: user.name,
      specialization: specialization || 'General Practice',
      schedule: { isSameEveryday: true, days: defaultDays },
      hospitals: [hospital._id],
    });

    // Add doctor to hospital roster
    hospital.doctors.push(doctor._id);
    await hospital.save();

    const updated = await Hospital.findById(req.params.id)
      .populate('doctors', 'name specialization rating status');

    res.status(201).json({
      message: `Dr. ${name} hired and affiliated with ${hospital.name}`,
      doctor,
      hospital: updated,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hospitals/:id/apply — doctor applies to hospital
router.post('/:id/apply', auth, requireRole('doctor'), async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

    const doctor = await Doctor.findOne({ userId: req.user.id });
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });

    // Check if already applied
    const existing = await JoinRequest.findOne({ doctorId: doctor._id, hospitalId: hospital._id, status: 'pending' });
    if (existing) return res.status(400).json({ error: 'Application already pending' });

    // Check if already in roster
    if (hospital.doctors.includes(doctor._id)) {
      return res.status(400).json({ error: 'You are already in this hospital roster' });
    }

    const request = await JoinRequest.create({
      doctorId: doctor._id,
      doctorName: doctor.name,
      hospitalId: hospital._id,
      hospitalName: hospital.name,
      status: 'pending'
    });

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hospitals/:id/doctors/:doctorId/unavailable — mark doctor unavailable
router.post('/:id/doctors/:doctorId/unavailable', auth, async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

    if (req.user.role !== 'admin' && hospital.userId?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { date, reason } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    const doctor = await Doctor.findById(req.params.doctorId);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    if (!doctor.unavailableDates) doctor.unavailableDates = [];
    doctor.unavailableDates.push({ date, hospitalId: hospital._id, reason: reason || 'Holiday' });
    await doctor.save();

    res.json(doctor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/hospitals/:id/records/:patientId — get all prescriptions for a patient at this hospital
router.get('/:id/records/:patientId', auth, async (req, res) => {
  try {
    const prescriptions = await Prescription.find({
      hospitalId: req.params.id,
      patientId: req.params.patientId,
    }).sort({ createdAt: -1 });
    res.json(prescriptions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
