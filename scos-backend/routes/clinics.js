const router = require('express').Router();
const Clinic = require('../models/Clinic');
const { auth, requireRole } = require('../middleware/auth');

// GET /api/clinics
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }
    const clinics = await Clinic.find(filter).sort({ createdAt: -1 });
    res.json(clinics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clinics — admin only
router.post('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const clinic = await Clinic.create(req.body);
    res.status(201).json(clinic);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/clinics/:id — admin only
router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const clinic = await Clinic.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!clinic) return res.status(404).json({ error: 'Clinic not found' });
    res.json(clinic);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
