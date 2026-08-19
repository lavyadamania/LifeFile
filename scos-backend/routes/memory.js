const router = require('express').Router();
const mongoose = require('mongoose');
const { auth, requireRole } = require('../middleware/auth');
const User = require('../models/User');
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
  if (!reqUser || !patientId) return false;
  
  const reqUserIdStr = reqUser._id.toString();
  const targetIdStr = patientId.toString();

  // 1. PATIENT ROLE: Can ONLY access their own memory
  if (reqUser.role === 'patient') {
    // Direct User ID match
    if (reqUserIdStr === targetIdStr) return true;

    // Check if targetIdStr matches Patient profile linked to reqUser
    const patientProfile = await Patient.findOne({ userId: reqUser._id });
    if (patientProfile && patientProfile._id.toString() === targetIdStr) return true;

    // Check if targetIdStr is User document and reqUser is Patient profile linked to it
    const targetUser = await User.findById(targetIdStr);
    if (targetUser && targetUser._id.toString() === reqUserIdStr) return true;

    return false; // STRICT DENIAL: Patient A attempting to access Patient B's memory
  }

  // 2. DOCTOR ROLE: Must have verified clinical relationship with patient
  if (reqUser.role === 'doctor') {
    const doctorProfile = await Doctor.findOne({ userId: reqUser._id });
    const doctorProfileId = doctorProfile ? doctorProfile._id : null;

    // Find target patient document (by Patient _id or User _id)
    const patientDoc = await Patient.findOne({
      $or: [
        { _id: targetIdStr },
        { userId: targetIdStr }
      ]
    });

    const targetPatientId = patientDoc ? patientDoc._id : (mongoose.Types.ObjectId.isValid(targetIdStr) ? targetIdStr : null);
    const targetUserId = patientDoc ? patientDoc.userId : targetIdStr;

    // Check if explicit permission granted
    if (patientDoc && patientDoc.grantedDoctors && doctorProfileId) {
      if (patientDoc.grantedDoctors.some(id => id.toString() === doctorProfileId.toString())) {
        return true;
      }
    }

    // Check assigned doctor
    if (patientDoc && patientDoc.assignedDoctor && doctorProfileId) {
      if (patientDoc.assignedDoctor.toString() === doctorProfileId.toString()) {
        return true;
      }
    }

    // Check prior prescriptions written by this doctor for target patient
    const docIds = [reqUser._id, doctorProfileId].filter(Boolean);
    const patIds = [targetPatientId, targetUserId].filter(Boolean);

    if (docIds.length > 0 && patIds.length > 0) {
      const hasPrescription = await Prescription.exists({
        doctorId: { $in: docIds },
        patientId: { $in: patIds }
      });
      if (hasPrescription) return true;

      const Appointment = require('../models/Appointment');
      const hasAppointment = await Appointment.exists({
        doctorId: { $in: docIds },
        patientId: { $in: patIds }
      });
      if (hasAppointment) return true;
    }

    return false; // DENY: Unauthorized doctor with no clinical relationship
  }

  // 3. ADMIN / HOSPITAL STAFF: System-wide clinical audit access
  if (['admin', 'hospital'].includes(reqUser.role)) {
    return true;
  }

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
