const router = require('express').Router();
const Patient = require('../models/Patient');
const { auth } = require('../middleware/auth');

// GET /api/patients/me
router.get('/me', auth, async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id })
      .populate('grantedDoctors')
      .populate('currentHospital', 'name address phone');
    if (!patient) return res.status(404).json({ error: 'Patient profile not found' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patients/search?q=<name> — doctor searches patients by name
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const User = require('../models/User');
    const users = await User.find({
      name: { $regex: q, $options: 'i' },
      role: 'patient',
    }).select('name email _id').limit(10);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patients/:id (e.g. for doctor to view patient if granted access)
router.get('/:id', auth, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient profile not found' });
    // TODO: access check here if needed
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/patients/me
router.put('/me', auth, async (req, res) => {
  try {
    const patient = await Patient.findOneAndUpdate(
      { userId: req.user._id },
      { $set: req.body },
      { new: true, upsert: true }
    ).populate('grantedDoctors').populate('currentHospital', 'name address phone');
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/patients/me/hospital — set or change current hospital
router.put('/me/hospital', auth, async (req, res) => {
  try {
    const { hospitalId } = req.body;
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

    // If already at a hospital, close the old history entry
    if (patient.currentHospital) {
      const openEntry = patient.hospitalHistory.find(
        h => h.hospitalId?.toString() === patient.currentHospital?.toString() && !h.leftAt
      );
      if (openEntry) openEntry.leftAt = new Date();
    }

    if (hospitalId) {
      // Look up hospital name
      const Hospital = require('../models/Hospital');
      const hospital = await Hospital.findById(hospitalId);
      const hospitalName = hospital ? hospital.name : '';

      patient.currentHospital = hospitalId;
      patient.hospitalHistory.push({
        hospitalId,
        hospitalName,
        joinedAt: new Date(),
        leftAt: null,
      });
    } else {
      // Unregister from hospital
      patient.currentHospital = null;
    }

    await patient.save();
    const updated = await Patient.findById(patient._id)
      .populate('grantedDoctors')
      .populate('currentHospital', 'name address phone');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
