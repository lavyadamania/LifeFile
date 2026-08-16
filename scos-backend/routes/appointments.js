const router = require('express').Router();
const Appointment = require('../models/Appointment');
const { auth } = require('../middleware/auth');
const { produceEvent } = require('../services/kafka');

// GET /api/appointments
router.get('/', auth, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'patient') filter.patientId = req.user._id;
    if (req.user.role === 'doctor') {
      const Doctor = require('../models/Doctor');
      const docProfile = await Doctor.findOne({ userId: req.user._id });
      if (docProfile) filter.doctorId = docProfile._id;
      else filter.doctorId = req.user._id; // Fallback
    }

    const { status, hospitalId } = req.query;
    if (status) filter.status = status;
    if (hospitalId && hospitalId !== 'all') {
      if (hospitalId === 'private') filter.hospitalId = null;
      else filter.hospitalId = hospitalId;
    }

    const appointments = await Appointment.find(filter)
      .populate('patientId', 'name email')
      .sort({ createdAt: -1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/appointments — book
router.post('/', auth, async (req, res) => {
  try {
    const appointment = await Appointment.create({
      ...req.body,
      patientId: req.user._id,
    });

    // Produce Kafka event
    await produceEvent('scos.appointments', {
      action: 'BOOKED',
      appointmentId: appointment._id,
      patientName: req.user.name,
      doctorName: appointment.doctorName,
      date: appointment.date,
      time: appointment.time,
      hospitalId: appointment.hospitalId || null,
      hospitalName: appointment.hospitalName || '',
    });

    res.status(201).json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/appointments/:id — reschedule
router.put('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true }
    );
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    await produceEvent('scos.appointments', {
      action: 'RESCHEDULED',
      appointmentId: appointment._id,
      newDate: appointment.date,
      newTime: appointment.time,
    });

    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/appointments/:id — cancel
router.delete('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status: 'Cancelled' },
      { new: true }
    );
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    await produceEvent('scos.appointments', {
      action: 'CANCELLED',
      appointmentId: appointment._id,
    });

    res.json({ message: 'Appointment cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/appointments/walkin — doctor creates walk-in appointment on behalf of patient
router.post('/walkin', auth, async (req, res) => {
  try {
    const { patientId, doctorId, doctorName, date, time, spec } = req.body;
    if (!patientId) return res.status(400).json({ error: 'patientId is required' });

    const appointment = await Appointment.create({
      patientId,
      doctorId: doctorId || req.user._id,
      doctorName: doctorName || req.user.name,
      spec: spec || '',
      date: date || new Date().toISOString().split('T')[0],
      time: time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      status: 'Confirmed',
      isWalkin: true,
    });

    await produceEvent('scos.appointments', {
      action: 'WALKIN_CREATED',
      appointmentId: appointment._id,
      doctorName: appointment.doctorName,
      date: appointment.date,
      time: appointment.time,
    });

    res.status(201).json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/appointments/missed — get appointments whose date has passed and status is still Confirmed/Pending
router.get('/missed', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    let filter = {
      date: { $lt: today },
      status: { $in: ['Confirmed', 'Pending'] },
    };

    if (req.user.role === 'patient') {
      filter.patientId = req.user._id;
    }
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

    const missed = await Appointment.find(filter)
      .populate('patientId', 'name email')
      .sort({ date: -1 });
    res.json(missed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/appointments/:id/status — update status to Missed or Postponed
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status, postponedDate, postponedTime } = req.body;
    if (!['Missed', 'Postponed', 'Completed'].includes(status)) {
      return res.status(400).json({ error: 'Status must be Missed, Postponed, or Completed' });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    if (status === 'Postponed' && postponedDate && postponedTime) {
      // Create a new appointment with the postponed date/time
      const newAppointment = await Appointment.create({
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        doctorName: appointment.doctorName,
        spec: appointment.spec,
        date: postponedDate,
        time: postponedTime,
        status: 'Confirmed',
        location: appointment.location,
        hospitalId: appointment.hospitalId || null,
        hospitalName: appointment.hospitalName || '',
      });

      // Mark old appointment as Postponed
      appointment.status = 'Postponed';
      appointment.postponedTo = postponedDate;
      await appointment.save();

      await produceEvent('scos.appointments', {
        action: 'POSTPONED',
        oldAppointmentId: appointment._id,
        newAppointmentId: newAppointment._id,
        newDate: postponedDate,
        newTime: postponedTime,
      });

      return res.json({ old: appointment, new: newAppointment });
    }

    // Mark as Missed (expired)
    appointment.status = 'Missed';
    await appointment.save();

    await produceEvent('scos.appointments', {
      action: 'MISSED',
      appointmentId: appointment._id,
    });

    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
