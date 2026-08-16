const router = require('express').Router();
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Clinic = require('../models/Clinic');
const Appointment = require('../models/Appointment');
const { auth, requireRole } = require('../middleware/auth');

// GET /api/stats — admin dashboard KPIs
router.get('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const totalPatients = await User.countDocuments({ role: 'patient' });
    const activeDoctors = await Doctor.countDocuments({ status: 'Active' });
    const todayAppointments = await Appointment.countDocuments({
      status: { $in: ['Confirmed', 'Pending'] }
    });
    const activeClinics = await Clinic.countDocuments({ status: 'active' });

    res.json({
      totalPatients,
      activeDoctors,
      todayAppointments,
      activeClinics,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
