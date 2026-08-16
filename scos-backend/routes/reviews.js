const router = require('express').Router();
const Review = require('../models/Review');
const Doctor = require('../models/Doctor');
const { auth } = require('../middleware/auth');

// GET /api/reviews/:doctorId
router.get('/:doctorId', async (req, res) => {
  try {
    const reviews = await Review.find({ doctorId: req.params.doctorId })
      .populate('patientId', 'name')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reviews — patient submits review
router.post('/', auth, async (req, res) => {
  try {
    const review = await Review.create({
      ...req.body,
      patientId: req.user._id,
    });

    // Update doctor average rating
    const reviews = await Review.find({ doctorId: req.body.doctorId });
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await Doctor.findByIdAndUpdate(req.body.doctorId, {
      rating: Math.round(avg * 10) / 10,
      reviewCount: reviews.length,
    });

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
