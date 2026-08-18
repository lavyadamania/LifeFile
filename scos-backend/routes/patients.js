const router = require('express').Router();
const Patient = require('../models/Patient');
const MedicalRecord = require('../models/MedicalRecord');
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
    // Prevent mass assignment of sensitive fields
    const { _id, userId, hospitalHistory, currentHospital, grantedDoctors, ...safeData } = req.body;

    const patient = await Patient.findOneAndUpdate(
      { userId: req.user._id },
      { $set: safeData },
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

// --- Medical Records ---

// POST /api/patients/records
router.post('/records', auth, async (req, res) => {
  try {
    const { title, type, fileUrl, password } = req.body;
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const isPasswordProtected = !!password;
    const record = await MedicalRecord.create({
      patientId: patient._id,
      title,
      type,
      fileUrl,
      isPasswordProtected,
      password: isPasswordProtected ? password : null
    });

    // Don't send back password hash
    const recordObj = record.toObject();
    delete recordObj.password;
    if (isPasswordProtected) delete recordObj.fileUrl; // Hide URL if protected

    res.status(201).json(recordObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patients/records
router.get('/records', auth, async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const records = await MedicalRecord.find({ patientId: patient._id }).sort({ createdAt: -1 });
    
    // Strip fileUrl if password protected
    const safeRecords = records.map(r => {
      const obj = r.toObject();
      delete obj.password;
      if (obj.isPasswordProtected) delete obj.fileUrl;
      return obj;
    });

    res.json(safeRecords);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/patients/records/:id/verify
router.post('/records/:id/verify', auth, async (req, res) => {
  try {
    const { password } = req.body;
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });

    if (!record.isPasswordProtected) {
      return res.json({ fileUrl: record.fileUrl });
    }

    const isValid = await record.comparePassword(password);
    if (!isValid) return res.status(401).json({ error: 'Invalid password' });

    res.json({ fileUrl: record.fileUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patients/:id/ai-summary
router.get('/:id/ai-summary', auth, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    if (req.user.role === 'patient' && patient.userId.toString() !== req.user._id.toString()) {
       return res.status(403).json({ error: 'Access denied' });
    }

    const Prescription = require('../models/Prescription');
    const prescriptions = await Prescription.find({ patientId: patient._id }).sort({ createdAt: -1 });

    const MedicalRecord = require('../models/MedicalRecord');
    const records = await MedicalRecord.find({ patientId: patient._id });

    let prompt = `You are an expert medical AI assistant. Summarize the following patient's medical history into a concise, professional clinical summary. Use Markdown. Highlight chronic conditions, active medications, recent diagnoses, and health trends.\n\n`;
    prompt += `Patient Name: ${patient.name}\n\n`;
    prompt += `Past Prescriptions & Diagnoses:\n`;
    if (prescriptions.length === 0) prompt += "None.\n";
    prescriptions.forEach(p => {
      prompt += `- Date: ${new Date(p.createdAt).toLocaleDateString()}, Doctor: Dr. ${p.doctorName}, Diagnosis: ${p.diagnosis}, Medications: ${p.medications.map(m => `${m.name} (${m.dosage})`).join(', ')}\n`;
    });
    prompt += `\nMedical Records Uploaded:\n`;
    if (records.length === 0) prompt += "None.\n";
    records.forEach(r => {
      prompt += `- ${r.title} (${r.type})\n`;
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({ summary: "⚠️ **AI Not Configured**: Please add a `GEMINI_API_KEY` to the backend `.env` file to enable AI Summarization." });
    }

    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
    });

    res.json({ summary: response.text });
  } catch (err) {
    console.log("AI summary patientId:", req.params.id);
    console.error("AI SUMMARY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
