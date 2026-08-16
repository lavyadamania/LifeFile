const router = require('express').Router();
const Prescription = require('../models/Prescription');
const { auth } = require('../middleware/auth');
const { produceEvent } = require('../services/kafka');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- Attachment upload setup ---
const attDir = path.join(__dirname, '..', 'uploads', 'attachments');
if (!fs.existsSync(attDir)) fs.mkdirSync(attDir, { recursive: true });

const attStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, attDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const attUpload = multer({ storage: attStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/prescriptions/upload-attachment — upload X-ray, lab report, MRI
router.post('/upload-attachment', auth, attUpload.single('attachment'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = `/uploads/attachments/${req.file.filename}`;
    const fileType = req.body.type || 'other';
    res.json({
      filename: req.file.originalname,
      url,
      type: fileType,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/prescriptions/patient/:patientId — get prescriptions for a specific patient (doctor view)
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ patientId: req.params.patientId })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(prescriptions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/prescriptions/hospital/:hospitalId/patient/:patientId
router.get('/hospital/:hospitalId/patient/:patientId', auth, async (req, res) => {
  try {
    const prescriptions = await Prescription.find({
      hospitalId: req.params.hospitalId,
      patientId: req.params.patientId,
    }).sort({ createdAt: -1 });
    res.json(prescriptions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/prescriptions
router.get('/', auth, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'patient') filter.patientId = req.user._id;
    if (req.user.role === 'doctor') {
      const Doctor = require('../models/Doctor');
      const docProfile = await Doctor.findOne({ userId: req.user._id });
      if (docProfile) filter.doctorId = docProfile._id;
      else filter.doctorId = req.user._id;
    }

    const { hospitalId } = req.query;
    if (hospitalId && hospitalId !== 'all') {
      if (hospitalId === 'private') filter.hospitalId = null;
      else filter.hospitalId = hospitalId;
    }

    const prescriptions = await Prescription.find(filter).sort({ createdAt: -1 });
    res.json(prescriptions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/prescriptions — doctor creates
router.post('/', auth, async (req, res) => {
  try {
    // Remove invalid ObjectId values like 'new' or 'DOC-1'
    const data = { ...req.body };
    if (!data.patientId || data.patientId === 'new' || data.patientId.length < 12) {
      delete data.patientId;
    }

    // Force doctorId and doctorName to match the authenticated user
    if (req.user.role === 'doctor') {
      const Doctor = require('../models/Doctor');
      const docProfile = await Doctor.findOne({ userId: req.user._id });
      data.doctorId = docProfile ? docProfile._id : req.user._id;
      data.doctorName = docProfile ? docProfile.name : req.user.name;
    } else {
      if (!data.doctorId || data.doctorId === 'DOC-1' || data.doctorId.length < 12) {
        data.doctorId = req.user._id;
      }
      data.doctorName = data.doctorName || req.user.name;
    }

    const prescription = await Prescription.create(data);

    // Produce Kafka event
    await produceEvent('scos.prescriptions', {
      action: 'PRESCRIPTION_CREATED',
      prescriptionId: prescription._id,
      doctorName: data.doctorName,
      patientName: data.patientName || 'Walk-in Patient',
      diagnosis: data.diagnosis,
      hospitalId: data.hospitalId || null,
      hospitalName: data.hospitalName || '',
    });

    res.status(201).json(prescription);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
