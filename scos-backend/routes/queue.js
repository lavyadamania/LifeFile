const router = require('express').Router();
const { produceEvent } = require('../services/kafka');
const { auth } = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { calculateCEP } = require('../services/dynamicPriority');
const { getPatientETA } = require('../services/queueETA');

// GET /api/queue/list — authoritative backend queue calculation
router.get('/list', auth, async (req, res) => {
  try {
    const { doctorId, date, hospitalId } = req.query; 
    if (!doctorId) return res.status(400).json({ error: 'doctorId is required' });
    
    const utcToday = new Date().toISOString().split('T')[0];
    const localToday = new Date().toLocaleDateString('en-CA');
    const datesToMatch = date ? [date] : Array.from(new Set([utcToday, localToday]));

    const filter = {
      doctorId,
      date: { $in: datesToMatch },
      status: { $in: ['Pending', 'Confirmed', 'In_Progress'] }
    };

    if (hospitalId && hospitalId !== 'all') {
      filter.hospitalId = hospitalId === 'private' ? null : hospitalId;
    }

    const appointments = await Appointment.find(filter).populate('patientId', 'name');
    const currentTime = new Date();

    let nowServing = null;
    const pendingAppointments = [];

    appointments.forEach(appt => {
      const priorityDetails = calculateCEP(appt, currentTime);
      const apptObj = {
        _id: appt._id,
        id: appt._id,
        patientId: appt.patientId ? appt.patientId._id : null,
        patientName: appt.patientId && appt.patientId.name ? appt.patientId.name : appt.patientName,
        baseToken: appt.baseToken,
        tokenNumber: appt.baseToken,
        triageLevel: appt.triageLevel,
        missedCalls: appt.missedCalls,
        status: appt.status,
        time: appt.time,
        hospitalId: appt.hospitalId,
        hospitalName: appt.hospitalName,
        priority: priorityDetails
      };

      if (appt.status === 'In_Progress') {
        nowServing = apptObj;
      } else {
        pendingAppointments.push(apptObj);
      }
    });

    // Sort descending by ACPA priority score
    pendingAppointments.sort((a, b) => b.priority.score - a.priority.score);

    // Assign 1-based dynamic queuePosition without modifying permanent tokenNumber!
    pendingAppointments.forEach((item, index) => {
      item.queuePosition = index + 1;
    });

    res.json({
      nowServing,
      waitingQueue: pendingAppointments,
      totalWaiting: pendingAppointments.length,
      queueVersion: Date.now()
    });
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
    
    if (['Completed', 'Cancelled'].includes(targetAppt.status)) {
      return res.json({ status: targetAppt.status, eta: null });
    }

    const today = targetAppt.date;
    const doctorId = targetAppt.doctorId;

    const appointments = await Appointment.find({
      doctorId,
      date: today,
      status: { $in: ['Pending', 'Confirmed'] }
    });

    const currentTime = new Date();
    
    const queue = appointments.map(appt => ({
      _id: appt._id,
      patientName: appt.patientName,
      baseToken: appt.baseToken,
      priority: calculateCEP(appt, currentTime)
    }));

    queue.sort((a, b) => b.priority.score - a.priority.score);

    const etaDetails = getPatientETA(queue, appointmentId);

    if (!etaDetails) {
      return res.status(404).json({ error: 'Patient not currently in dynamic queue' });
    }

    const topToken = etaDetails.topTokenInQueue;
    const targetPatientInQueue = queue[etaDetails.queuePosition - 1];

    res.json({
      status: targetAppt.status,
      patientName: targetPatientInQueue ? targetPatientInQueue.patientName : targetAppt.patientName,
      tokenNumber: targetAppt.baseToken,
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
      patientName: patientName || (req.user ? req.user.name : ''),
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

// POST /api/queue/call-next — doctor calls/starts consultation for EXACT appointmentId
router.post('/call-next', auth, async (req, res) => {
  try {
    const { doctorId, patientId, appointmentId, hospitalId, hospitalName } = req.body;
    
    // Auto-complete or skip any currently in-progress consultation for this doctor
    const existingInConsult = await Appointment.find({ doctorId, status: 'In_Progress' });
    for (const oldAppt of existingInConsult) {
       oldAppt.status = 'Pending';
       oldAppt.missedCalls = (oldAppt.missedCalls || 0) + 1;
       await oldAppt.save();
    }

    let targetAppt = null;

    // Target EXACT appointmentId if provided
    if (appointmentId) {
      targetAppt = await Appointment.findById(appointmentId);
    }

    // Fallback: pick top candidate in ACPA waiting list if no specific appointmentId clicked
    if (!targetAppt) {
      const utcToday = new Date().toISOString().split('T')[0];
      const localToday = new Date().toLocaleDateString('en-CA');
      const datesToMatch = Array.from(new Set([utcToday, localToday]));

      const filter = {
        doctorId,
        date: { $in: datesToMatch },
        status: { $in: ['Pending', 'Confirmed'] }
      };
      if (hospitalId && hospitalId !== 'all') {
        filter.hospitalId = hospitalId === 'private' ? null : hospitalId;
      }

      const pending = await Appointment.find(filter);
      if (pending.length > 0) {
        const currentTime = new Date();
        pending.sort((a, b) => calculateCEP(b, currentTime).score - calculateCEP(a, currentTime).score);
        targetAppt = pending[0];
      }
    }

    if (!targetAppt) {
      return res.status(404).json({ error: 'No patient available to call' });
    }

    // Set status to In_Progress for THIS EXACT APPOINTMENT
    targetAppt.status = 'In_Progress';
    await targetAppt.save();

    await produceEvent('scos.queue.updates', {
      action: 'CALL_NEXT',
      doctorId,
      patientId: targetAppt.patientId,
      appointmentId: targetAppt._id,
      tokenNumber: targetAppt.baseToken,
      hospitalId: targetAppt.hospitalId || null,
      hospitalName: targetAppt.hospitalName || '',
      timestamp: new Date().toISOString(),
    });

    res.json({ message: 'Patient started consultation', targetAppt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/queue/skip — mark exact appointment as skipped
router.post('/skip', auth, async (req, res) => {
  try {
    const { doctorId, patientId, appointmentId, hospitalId, hospitalName } = req.body;
    let targetAppt = null;
    if (appointmentId) {
      targetAppt = await Appointment.findById(appointmentId);
    }
    if (targetAppt) {
      targetAppt.missedCalls = (targetAppt.missedCalls || 0) + 1;
      targetAppt.status = 'Pending';
      await targetAppt.save();
    }

    await produceEvent('scos.queue.updates', {
      action: 'SKIP_PATIENT',
      doctorId,
      patientId: targetAppt ? targetAppt.patientId : patientId,
      appointmentId: targetAppt ? targetAppt._id : appointmentId,
      hospitalId: hospitalId || (targetAppt ? targetAppt.hospitalId : null),
      hospitalName: hospitalName || (targetAppt ? targetAppt.hospitalName : ''),
      timestamp: new Date().toISOString(),
    });

    res.json({ message: 'Patient skipped and penalized' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/queue/complete — mark exact consultation complete
router.post('/complete', auth, async (req, res) => {
  try {
    const { doctorId, patientId, appointmentId, hospitalId, hospitalName } = req.body;
    let targetAppt = null;
    if (appointmentId) {
       targetAppt = await Appointment.findByIdAndUpdate(appointmentId, { status: 'Completed' }, { new: true });
    }

    await produceEvent('scos.queue.updates', {
      action: 'CONSULTATION_COMPLETE',
      doctorId,
      patientId: targetAppt ? targetAppt.patientId : patientId,
      appointmentId: targetAppt ? targetAppt._id : appointmentId,
      hospitalId: hospitalId || (targetAppt ? targetAppt.hospitalId : null),
      hospitalName: hospitalName || (targetAppt ? targetAppt.hospitalName : ''),
      timestamp: new Date().toISOString(),
    });

    res.json({ message: 'Consultation marked complete' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/queue/resync-demo — Recalibrate demo appointment timestamps to current clock time
router.post('/resync-demo', async (req, res) => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const formatTime = (d) => {
      let h = d.getHours(), m = d.getMinutes();
      const meridian = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${meridian}`;
    };

    const currentMins = now.getHours() * 60 + now.getMinutes();
    const timeNowMinus10 = new Date(now.getTime() - Math.min(10, Math.max(1, currentMins - 2)) * 60000);
    const minsToMidnight = (24 * 60 - 1) - currentMins;
    const plus5Offset = Math.min(5, Math.max(1, Math.floor(minsToMidnight * 0.2)));
    const plus45Offset = Math.min(45, Math.max(15, Math.floor(minsToMidnight * 0.9)));
    const timeNowPlus5 = new Date(now.getTime() + plus5Offset * 60000);
    const timeNowPlus45 = new Date(now.getTime() + plus45Offset * 60000);

    // Update Token 101 (Emergency Triage 5)
    await Appointment.updateMany({ baseToken: 101 }, { date: todayStr, time: formatTime(timeNowMinus10), status: 'Pending' });
    // Update Token 102 (Active Check-In Window)
    await Appointment.updateMany({ baseToken: 102 }, { date: todayStr, time: formatTime(timeNowPlus5), status: 'Confirmed' });
    // Update Token 103 (Locked Too Early Window)
    await Appointment.updateMany({ baseToken: 103 }, { date: todayStr, time: formatTime(timeNowPlus45), status: 'Confirmed' });

    await produceEvent('scos.queue.updates', { action: 'DEMO_RESYNC', timestamp: now.toISOString() });
    res.json({ message: 'Demo presentation clock resynced to current time', date: todayStr, now: formatTime(now) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
