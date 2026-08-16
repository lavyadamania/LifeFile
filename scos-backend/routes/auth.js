const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Hospital = require('../models/Hospital');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Prevent privilege escalation to admin via direct API hit
    if (!['patient', 'doctor', 'hospital'].includes(role)) {
      return res.status(403).json({ error: 'Invalid or unauthorized role for registration' });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ error: 'Email already registered' });

    const user = await User.create({ name, email, password, role });
    
    // Automatically create a doctor profile if the user is a doctor
    if (role === 'doctor') {
      const defaultDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => ({
        day: d, isAvailable: d !== 'Sun', startTime: '09:00', endTime: '17:00'
      }));
      await Doctor.create({
        userId: user._id,
        name: user.name,
        specialization: 'General Practice',
        schedule: { isSameEveryday: true, days: defaultDays },
      });
    }

    // Automatically create a patient profile if the user is a patient
    if (role === 'patient') {
      await Patient.create({
        userId: user._id,
        name: user.name,
      });
    }

    // Automatically create a hospital profile if the user is a hospital
    if (role === 'hospital') {
      await Hospital.create({
        userId: user._id,
        name: user.name,
        address: req.body.address || 'Address pending',
        phone: req.body.phone || 'Phone pending',
        email: user.email,
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

    // If role is specified, check it matches
    if (role && user.role !== role) {
      return res.status(403).json({ error: `This account does not have ${role} access` });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
