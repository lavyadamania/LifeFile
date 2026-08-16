const router = require('express').Router();
const Doctor = require('../models/Doctor');
const JoinRequest = require('../models/JoinRequest');
const { auth, requireRole } = require('../middleware/auth');

// GET /api/doctors — list all (public)
router.get('/', async (req, res) => {
  try {
    const { search, spec } = req.query;
    const filter = {};
    if (spec && spec !== 'All') filter.specialization = spec;
    const { hospitalId } = req.query;
    if (hospitalId) filter.hospitals = hospitalId;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { specialization: { $regex: search, $options: 'i' } },
      ];
    }
    const doctors = await Doctor.find(filter).populate('hospitals', 'name _id').sort({ createdAt: -1 });
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/doctors/me — get logged-in doctor profile
router.get('/me', auth, async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id }).populate('hospitals', 'name _id');
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/doctors/me/requests — get my applications
router.get('/me/requests', auth, requireRole('doctor'), async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });
    const requests = await JoinRequest.find({ doctorId: doctor._id }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/doctors/:id
router.get('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/doctors — admin only
router.post('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const doctor = await Doctor.create(req.body);
    res.status(201).json(doctor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/doctors/:id — admin or the doctor themselves
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Not authorized to update doctors' });
    }
    
    let doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    
    if (req.user.role === 'doctor' && doctor.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to update this doctor profile' });
    }

    doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/doctors/:id — admin only
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    await Doctor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Doctor removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/doctors/upload-signature — upload digital signature image
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const sigDir = path.join(__dirname, '..', 'uploads', 'signatures');
if (!fs.existsSync(sigDir)) fs.mkdirSync(sigDir, { recursive: true });

const sigStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, sigDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `sig-${req.user._id}-${Date.now()}${ext}`);
  },
});

const sigFileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed for signatures.'), false);
  }
};

const sigUpload = multer({ 
  storage: sigStorage, 
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: sigFileFilter
});

router.post('/upload-signature', auth, sigUpload.single('signature'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = `/uploads/signatures/${req.file.filename}`;

    // Save to doctor profile
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (doctor) {
      doctor.signatureImage = url;
      await doctor.save();
    }

    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
