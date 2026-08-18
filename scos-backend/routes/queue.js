const router = require('express').Router();
const { produceEvent } = require('../services/kafka');
const { auth } = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const User = require('../models/User'); // Required for populate
const { calculateCEP } = require('../services/dynamicPriority');
const { getPatientETA } = require('../services/queueETA');

// GET /api/queue/list — authoritative backend queue calculation (DWPA)
router.get('/list', auth, async (req, res) => {
  try {
    const { doctorId, date, hospitalId } = req.query; 
    if (!doctorId) return res.status(400).json({ error: 'doctorId is required' });
    
    const utcToday = new Date().toISOString().split('T')[0];
    const localToday = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
    const datesToMatch = date ? [date] : Array.from(new Set([utcToday, localToday]));

    const filter = {
      doctorId,
      date: { $in: datesToMatch },
      status: { $in: ['Pending', 'Confirmed'] }
    };

    if (hospitalId && hospitalId !== 'all') {
      filter.hospitalId = hospitalId === 'private' ? null : hospitalId;
    }

    // Fetch all pending/confirmed appointments for today for this doctor
    const appointments = await Appointment.find(filter).populate('patientId', 'name');

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

// GET /api/queue/patient/:appointmentId — specific patient ETA tracking
router.get('/patient/:appointmentId', auth, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const targetAppt = await Appointment.findById(appointmentId);
    if (!targetAppt) return res.status(404).json({ error: 'Appointment not found' });
    
    // We only calculate ETA for pending/confirmed
    if (['Completed', 'Cancelled'].includes(targetAppt.status)) {
      return res.json({ status: targetAppt.status, eta: null });
    }

    const today = targetAppt.date;
    const doctorId = targetAppt.doctorId;

    // Fetch the full pending queue to mathematically find position
    const appointments = await Appointment.find({
      doctorId,
      date: today,
      status: { $in: ['Pending', 'Confirmed'] }
    });

    const currentTime = new Date();
    
    // Calculate ACPA score for EVERYONE
    const queue = appointments.map(appt => ({
      _id: appt._id,
      patientName: appt.patientName,
      baseToken: appt.baseToken,
      priority: calculateCEP(appt, currentTime)
    }));

    // Sort descending by ACPA score
    queue.sort((a, b) => b.priority.score - a.priority.score);

    // Use ETA engine
    const etaDetails = getPatientETA(queue, appointmentId);

    if (!etaDetails) {
      return res.status(404).json({ error: 'Patient not currently in dynamic queue' });
    }

    // Identify the currently serving token for the UI.
    // If the patient is #3, they see the top of the queue's token.
    const topToken = etaDetails.topTokenInQueue;
    const targetPatientInQueue = queue[etaDetails.queuePosition - 1];

    // Return SECURE payload (no other patient names!)
    res.json({
      status: targetAppt.status,
      patientName: targetPatientInQueue.patientName,
      tokenNumber: targetPatientInQueue.baseToken,
      nowServingToken: topToken,
      queuePosition: etaDetails.queuePosition,
      estimatedWait: etaDetails.estimatedWait,
      updatedAt: new Date().toISOString()
    });

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
    const { doctorId, patientId, appointmentId, hospitalId, hospitalName } = req.body;
    let apptHospitalId = hospitalId || null;
    let apptHospitalName = hospitalName || '';
    if (appointmentId) {
      const appt = await Appointment.findById(appointmentId);
      if (appt) {
        appt.missedCalls = (appt.missedCalls || 0) + 1;
        await appt.save();
        if (!apptHospitalId) apptHospitalId = appt.hospitalId;
        if (!apptHospitalName) apptHospitalName = appt.hospitalName;
      }
    }
    await produceEvent('scos.queue.updates', {
      action: 'SKIP_PATIENT',
      doctorId,
      patientId,
      appointmentId,
      hospitalId: apptHospitalId,
      hospitalName: apptHospitalName,
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
