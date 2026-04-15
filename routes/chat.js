const express = require('express');
const router = express.Router();
const chatModel = require('../models/chatModel');
// Route xử lý tin nhắn chatbot 
router.post('/process-message', (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    const response = chatModel.processMessage(message);
    res.json(response);
});

module.exports = router; 