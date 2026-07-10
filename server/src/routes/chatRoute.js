const express = require('express');
const multer = require('multer');
const chatController = require('../controllers/chatController');
const { searchMultimodal } = require('../services/qdrantService');
const { generateResponse } = require('../services/groqService');

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('image'), chatController.handleChat);

router.post('/query', async (req, res) => {
    try {
        const { imageVector, textVector, userQuestion } = req.body;

        const contextHits = await searchMultimodal(imageVector, textVector);
        const generatedAnswer = await generateResponse(JSON.stringify(contextHits), userQuestion);

        if (process.env.NODE_ENV === 'evaluation') {
            await saveEvaluationTriplet({
                query: userQuestion,
                contexts: contextHits.map(h => h.sentence), 
                response: generatedAnswer,
                ground_truth: req.body.expectedAnswer 
            });
        }

        res.json({ answer: generatedAnswer });
        
    } catch (error) {
        console.error("Chat Router Error Context:", error);
        res.status(500).json({ error: "Failed to process chat completion response." });
    }
});

module.exports = router;