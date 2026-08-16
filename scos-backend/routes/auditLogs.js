const router = require('express').Router();
const AuditLog = require('../models/AuditLog');
const { auth, requireRole } = require('../middleware/auth');

// GET /api/audit-logs — admin only
router.get('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const { severity } = req.query;
    const filter = {};
    if (severity && severity !== 'all') filter.severity = severity;

    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/audit-logs — internal use
router.post('/', auth, async (req, res) => {
  try {
    const log = await AuditLog.create(req.body);
    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
