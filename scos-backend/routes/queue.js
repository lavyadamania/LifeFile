const router = require('express').Router();
const { produceEvent } = require('../services/kafka');
const { auth } = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const User = require('../models/User'); // Required for populate
const { calculateCEP } = require('../services/dynamicPriority');

// GET /api/queue/list — authoritative backend queue calculation (DWPA)
router.get('/list', auth, async (req, res) => {
  try {
    const { doctorId, date } = req.query; 
    if (!doctorId) return res.status(400).json({ error: 'doctorId is required' });
    
    const today = date || new Date().toISOString().split('T')[0];

    // Fetch all pending/confirmed appointments for today for this doctor
    const appointments = await Appointment.find({
      doctorId,
      date: today,
      status: { $in: ['Pending', 'Confirmed'] }
    }).populate('patientId', 'name');

    const currentTime = new Date();
    
    // Map and calculate CEP
    const queue = appointments.map(appt => {
      const priorityDetails = calculateCEP(appt, currentTime);
      return {
        _id: appt._id, // appointmentId
        patientId: appt.patientId ? appt.patientId._id : null,
        patientName: appt.patientId && appt.patientId.name ? appt.patientId.name : 'Unknown Patient',
        baseToken: appt.baseToken,
        triageLevel: appt.triageLevel,
        missedCalls: appt.missedCalls,
        status: appt.status,
        hospitalId: appt.hospitalId,
        hospitalName: appt.hospitalName,
        priority: priorityDetails
      };
    });

    // Sort descending by DWPA score
    queue.sort((a, b) => b.priority.score - a.priority.score);

    res.json(queue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/queue/add — add patient to queue
router.post('/add', auth, async (req, res) => {
  try {
    const { patientId, patientName, doctorId, hospitalId, hospitalName } = req.body;
    await produceEvent('scos.queue.updates', {
      action: 'ADD_TO_QUEUE',
      patientId,
      patientName: patientName || req.user.name,
      doctorId,
      hospitalId: hospitalId || null,
      hospitalName: hospitalName || '',
      timestamp: new Date().toISOString(),
    });
    res.json({ message: 'Added to queue' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/queue/call-next — doctor calls next patient
router.post('/call-next', auth, async (req, res) => {
  try {
    const { doctorId, patientId, appointmentId, hospitalId, hospitalName } = req.body;
    await produceEvent('scos.queue.updates', {
      action: 'CALL_NEXT',
      doctorId,
      patientId,
      appointmentId,
      hospitalId: hospitalId || null,
      hospitalName: hospitalName || '',
      timestamp: new Date().toISOString(),
    });
    res.json({ message: 'Next patient called' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/queue/skip — doctor marks patient as no-show/skipped (DWPA Penalty)
router.post('/skip', auth, async (req, res) => {
  try {
    const { doctorId, patientId, appointmentId } = req.body;
    if (appointmentId) {
      const appt = await Appointment.findById(appointmentId);
      if (appt) {
        appt.missedCalls = (appt.missedCalls || 0) + 1;
        await appt.save();
      }
    }
    await produceEvent('scos.queue.updates', {
      action: 'SKIP_PATIENT',
      doctorId,
      patientId,
      appointmentId,
      timestamp: new Date().toISOString(),
    });
    res.json({ message: 'Patient skipped and penalized' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/queue/complete — mark consultation complete
router.post('/complete', auth, async (req, res) => {
  try {
    const { doctorId, patientId, appointmentId, hospitalId, hospitalName } = req.body;
    
    // Remove from DWPA queue by marking status Completed
    if (appointmentId) {
       await Appointment.findByIdAndUpdate(appointmentId, { status: 'Completed' });
    }

    await produceEvent('scos.queue.updates', {
      action: 'CONSULTATION_COMPLETE',
      doctorId,
      patientId,
      appointmentId,
      hospitalId: hospitalId || null,
      hospitalName: hospitalName || '',
      timestamp: new Date().toISOString(),
    });
    res.json({ message: 'Consultation marked complete' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
