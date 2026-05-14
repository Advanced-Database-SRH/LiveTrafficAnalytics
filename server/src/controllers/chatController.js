const chatService = require('../services/chatService');

async function handleChat(req, res) {
    try {
        const userQuestion = req.body.question;
        const imageBuffer = req.file ? req.file.buffer : null;

        if (!imageBuffer && !userQuestion) {
            return res.status(400).json({
                error: 'Please provide an image, a question, or both.',
            });
        }

        const result = await chatService.processChatRequest(imageBuffer, userQuestion);

        // res.status(200).json(result);

        return res.status(200).json({
            reply: result.answer,
            evidenceImages: result.evidenceImages,
        });
    } catch (error) {
        console.error("[ChatController] Error:", error.message);
        
        if (error.message === "Failed to process the uploaded image.") {
            return res.status(500).json({ error: error.message });
        }
        
        res.status(500).json({ error: "Chatbot failed to process request" });
    }
}

module.exports = { handleChat };