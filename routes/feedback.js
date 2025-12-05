const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');

// POST - Submit feedback
router.post('/', async (req, res) => {
    try {
        const { rating, comment, employeeId } = req.body;
        const newFeedback = new Feedback({ rating, comment, employeeId });
        await newFeedback.save();
        res.status(201).json({ message: 'Feedback submitted successfully' });
    } catch (error) {
        console.error('Error saving feedback:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET - Get all feedback (for admin)
router.get('/', async (req, res) => {
    try {
        const feedbacks = await Feedback.find().sort({ createdAt: -1 });
        res.json(feedbacks);
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
