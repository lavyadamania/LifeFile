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
    // Prevent mass assignment of sensitive immutable fields
    const { _id, userId, hospitalHistory, currentHospital, ...safeData } = req.body;

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
    // Flexible patient lookup by Patient._id OR User._id
    let patient = null;
    if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      patient = await Patient.findById(req.params.id);
      if (!patient) {
        patient = await Patient.findOne({ userId: req.params.id });
      }
    }
    if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

    if (req.user.role === 'patient' && patient.userId.toString() !== req.user._id.toString()) {
       return res.status(403).json({ error: 'Access denied' });
    }

    const Prescription = require('../models/Prescription');
    const prescriptions = await Prescription.find({ 
      $or: [{ patientId: patient._id }, { patientId: patient.userId }] 
    }).sort({ createdAt: -1 });

    const MedicalRecord = require('../models/MedicalRecord');
    const records = await MedicalRecord.find({ 
      $or: [{ patientId: patient._id }, { patientId: patient.userId }] 
    });

    const PatientMemory = require('../models/PatientMemory');
    const memories = await PatientMemory.find({ 
      $or: [{ patientId: patient._id }, { patientId: patient.userId }] 
    });

    let prompt = `You are an expert medical AI assistant. Summarize the following patient's medical history into a concise, professional clinical summary. Use Markdown formatting.\n\n`;
    prompt += `Patient Name: ${patient.name}\n`;
    prompt += `Age: ${patient.age || 'N/A'}, Gender: ${patient.gender || 'N/A'}, Blood Group: ${patient.bloodGroup || 'N/A'}\n\n`;
    
    prompt += `Known Medical Facts & Memories:\n`;
    if (memories.length === 0) prompt += "None.\n";
    memories.forEach(m => {
      prompt += `- [${m.category}] ${m.content} (Status: ${m.status})\n`;
    });

    prompt += `\nPast Prescriptions & Diagnoses:\n`;
    if (prescriptions.length === 0) prompt += "None.\n";
    prescriptions.forEach(p => {
      const medsStr = p.medications ? p.medications.map(m => `${m.name} (${m.dosage})`).join(', ') : 'None';
      prompt += `- Date: ${new Date(p.createdAt).toLocaleDateString()}, Doctor: Dr. ${p.doctorName}, Diagnosis: ${p.diagnosis}, Medications: ${medsStr}\n`;
    });

    prompt += `\nUploaded Medical Records & Diagnostics:\n`;
    if (records.length === 0) prompt += "None.\n";
    records.forEach(r => {
      prompt += `- ${r.title} (Type: ${r.type})\n`;
    });

    const apiKey = process.env.GEMINI_API_KEY;
    let summaryText = "";

    if (apiKey) {
      try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        summaryText = response.text();
      } catch (aiErr) {
        console.warn(`⚠️ Gemini API Notice (${aiErr.message || 'Quota'}): Generating SCOS Deterministic Clinical Summary.`);
      }
    }

    if (!summaryText) {
      // Deterministic Summary Engine when Gemini API key is missing or quota paused
      summaryText = `### 📋 Comprehensive Clinical AI Summary\n\n`;
      summaryText += `**Patient Profile:** ${patient.name} (${patient.age ? `${patient.age} yrs` : 'Age N/A'}, ${patient.gender || 'Gender N/A'}, Blood Group: **${patient.bloodGroup || 'N/A'}**)\n\n`;

      if (memories.length > 0) {
        summaryText += `#### 🧠 Extracted Clinical Memory Facts (${memories.length})\n`;
        memories.forEach(m => {
          const badge = m.status === 'CONFLICTED' ? '⚠️ ALLERGY CONFLICT' : '✅ ACTIVE';
          summaryText += `- **[${m.category}]** ${m.content} *(${badge})*\n`;
        });
        summaryText += `\n`;
      }

      summaryText += `#### 💊 Prescription & Diagnostic History (${prescriptions.length} Records)\n`;
      if (prescriptions.length === 0) {
        summaryText += `- No past prescription records found.\n`;
      } else {
        prescriptions.forEach(p => {
          const dateStr = new Date(p.createdAt).toLocaleDateString();
          summaryText += `- **${dateStr}** (Dr. ${p.doctorName}): **${p.diagnosis}**\n`;
          if (p.medications && p.medications.length > 0) {
            summaryText += `  - *Medications:* ${p.medications.map(m => `${m.name} (${m.dosage})`).join(', ')}\n`;
          }
        });
      }

      summaryText += `\n#### 📂 Uploaded Diagnostics & Medical Imaging (${records.length} Scans)\n`;
      if (records.length === 0) {
        summaryText += `- No external medical scans or lab records uploaded.\n`;
      } else {
        records.forEach(r => {
          summaryText += `- **${r.title}** *(${r.type.toUpperCase()})*\n`;
        });
      }
    }

    res.json({ summary: summaryText });
  } catch (err) {
    console.error("Patient summary route error:", err.message);
    res.status(500).json({ error: "Failed to generate patient summary." });
  }
});

module.exports = router;
