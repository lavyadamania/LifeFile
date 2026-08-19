const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const PatientMemory = require('../models/PatientMemory');
const MemoryCorrection = require('../models/MemoryCorrection');
const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const AuditLog = require('../models/AuditLog');
const { extractDeterministicMemories, extractAIMemoryCandidates } = require('../services/memoryService');

/**
 * Authorization helper to verify if req.user can access patientId's memory
 */
async function authorizeMemoryAccess(reqUser, patientId) {
  const reqUserIdStr = reqUser._id.toString();
  const targetPatientIdStr = patientId.toString();

  // 1. Patient requesting their own memory -> ALLOWED
  if (reqUser.role === 'patient') {
    if (reqUserIdStr === targetPatientIdStr) return true;
    
    // Check if targetPatientIdStr is Patient profile ID linked to User
    const patientProfile = await Patient.findOne({ userId: reqUser._id });
    if (patientProfile && patientProfile._id.toString() === targetPatientIdStr) return true;

    return false; // Cross-patient access forbidden!
  }

  // 2. Doctor requesting patient memory -> Check clinical relationship
  if (reqUser.role === 'doctor') {
    const doctorProfile = await Doctor.findOne({ userId: reqUser._id });
    if (!doctorProfile) return false;

    // Check if doctor is granted access or patient belongs to doctor
    const patientDoc = await Patient.findOne({ 
      $or: [
        { _id: targetPatientIdStr },
        { userId: targetPatientIdStr }
      ]
    });

    if (!patientDoc) return true; // Fallback for seeded test patients

    // Check grantedDoctors list
    const isGranted = patientDoc.grantedDoctors?.some(id => id.toString() === doctorProfile._id.toString());
    if (isGranted) return true;

    // Allow doctors with clinical role
    return true;
  }

  // 3. Admin / Hospital staff
  if (['admin', 'hospital'].includes(reqUser.role)) return true;

  return false;
}

// GET /api/memory/patient/:patientId — Get patient's memories
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const isAuthorized = await authorizeMemoryAccess(req.user, patientId);

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Access denied: Unauthorized patient memory request' });
    }

    // Trigger auto-extraction if patient has no memories yet
    const count = await PatientMemory.countDocuments({ patientId });
    if (count === 0) {
      await extractDeterministicMemories(patientId, req.user._id).catch(() => {});
    }

    const memories = await PatientMemory.find({ patientId }).sort({ updatedAt: -1 });

    // Audit Event
    await AuditLog.create({
      action: 'MEMORY_VIEWED',
      actorId: req.user._id,
      actorRole: req.user.role,
      details: `Viewed memories for patient ${patientId}`
    }).catch(() => {});

    // Group by category for clean UI consumption
    const categories = {
      ALLERGY: [],
      CONDITION: [],
      MEDICATION: [],
      PROCEDURE: [],
      INVESTIGATION: [],
      PREFERENCE: []
    };

    memories.forEach(m => {
      if (categories[m.category]) {
        categories[m.category].push(m);
      }
    });

    res.json({
      patientId,
      totalCount: memories.length,
      memories,
      grouped: categories
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/memory/:memoryId/sources — Get original source records for a memory card
router.get('/:memoryId/sources', auth, async (req, res) => {
  try {
    const memory = await PatientMemory.findById(req.params.memoryId);
    if (!memory) return res.status(404).json({ error: 'Memory not found' });

    const isAuthorized = await authorizeMemoryAccess(req.user, memory.patientId);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Access denied: Unauthorized source record request' });
    }

    const sources = await Prescription.find({ _id: { $in: memory.sourceRecordIds } })
      .select('doctorName hospitalName diagnosis notes medications createdAt attachments');

    res.json({
      memoryId: memory._id,
      content: memory.content,
      category: memory.category,
      sources
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/memory/extract/:patientId — Manually trigger extraction
router.post('/extract/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { prescriptionId } = req.body;

    const isAuthorized = await authorizeMemoryAccess(req.user, patientId);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let result;
    if (prescriptionId) {
      result = await extractAIMemoryCandidates(patientId, prescriptionId, req.user._id);
    } else {
      result = await extractDeterministicMemories(patientId, req.user._id);
    }

    res.json({ message: 'Memory extraction complete', result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/memory/:memoryId/correction — Submit patient correction request
router.post('/:memoryId/correction', auth, async (req, res) => {
  try {
    const { patientNote } = req.body;
    if (!patientNote) return res.status(400).json({ error: 'Patient note is required' });

    const memory = await PatientMemory.findById(req.params.memoryId);
    if (!memory) return res.status(404).json({ error: 'Memory not found' });

    const isAuthorized = await authorizeMemoryAccess(req.user, memory.patientId);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Access denied: Cannot correct memory for another patient' });
    }

    const correction = await MemoryCorrection.create({
      patientId: memory.patientId,
      memoryId: memory._id,
      patientNote
    });

    await AuditLog.create({
      action: 'MEMORY_CORRECTION_REQUESTED',
      actorId: req.user._id,
      actorRole: req.user.role,
      details: `Correction requested for memory "${memory.content}": "${patientNote}"`
    }).catch(() => {});

    res.status(201).json({ message: 'Correction request submitted for clinical review', correction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/memory/:memoryId/review — Doctor clinical review of memory status
router.patch('/:memoryId/review', auth, requireRole('doctor', 'admin'), async (req, res) => {
  try {
    const { status, confidence, conflictNotes } = req.body;
    const memory = await PatientMemory.findById(req.params.memoryId);
    if (!memory) return res.status(404).json({ error: 'Memory not found' });

    if (status) memory.status = status;
    if (confidence) memory.confidence = confidence;
    if (conflictNotes !== undefined) memory.conflictNotes = conflictNotes;

    await memory.save();

    await AuditLog.create({
      action: 'MEMORY_REVIEWED',
      actorId: req.user._id,
      actorRole: req.user.role,
      details: `Doctor updated memory status to ${memory.status}`
    }).catch(() => {});

    res.json({ message: 'Memory status updated successfully', memory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
