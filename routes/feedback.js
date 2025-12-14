const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');

// POST - Submit feedback
router.post('/', async (req, res) => {
    try {
        const { type, comment, employeeId, clientId } = req.body;

        if (!clientId) {
            return res.status(400).json({ error: 'Client ID is required' });
        }

        // Check for existing feedback from this client in the last 60 minutes
        const sixtyMinutesAgo = new Date(Date.now() - 1 * 1 * 1000);
        const existingFeedback = await Feedback.findOne({
            clientId: clientId,
            createdAt: { $gt: sixtyMinutesAgo }
        });

        if (existingFeedback) {
            return res.status(429).json({ error: 'Ви вже залишили відгук. Спробуйте через годину.' });
        }

        const newFeedback = new Feedback({ type, comment, employeeId, clientId });
        await newFeedback.save();
        res.status(201).json({ message: 'Feedback submitted successfully' });
    } catch (error) {
        console.error('Error saving feedback:', error);
        res.status(500).json({ error: error.message });
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

