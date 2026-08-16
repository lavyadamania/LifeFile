const router = require('express').Router();
const { produceEvent } = require('../services/kafka');
const { auth } = require('../middleware/auth');

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
    const { doctorId, patientId, hospitalId, hospitalName } = req.body;
    await produceEvent('scos.queue.updates', {
      action: 'CALL_NEXT',
      doctorId,
      patientId,
      hospitalId: hospitalId || null,
      hospitalName: hospitalName || '',
      timestamp: new Date().toISOString(),
    });
    res.json({ message: 'Next patient called' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/queue/complete — mark consultation complete
router.post('/complete', auth, async (req, res) => {
  try {
    const { doctorId, patientId, hospitalId, hospitalName } = req.body;
    await produceEvent('scos.queue.updates', {
      action: 'CONSULTATION_COMPLETE',
      doctorId,
      patientId,
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
