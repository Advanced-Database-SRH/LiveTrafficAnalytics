const { embedImageBuffer } = require('./embeddingService');
const { searchByVisualMatch } = require('./qdrantService');
const { generateResponse } = require('./groqService');

async function processChatRequest(imageBuffer, userQuestion) {
    const queryVector = await embedImageBuffer(imageBuffer);
    
    if (!queryVector) {
        throw new Error("Failed to process the uploaded image.");
    }

    const matchData = await searchByVisualMatch(queryVector);

    if (!matchData) {
        return { 
            answer: "I couldn't find any vehicles in the database matching that description.", 
            evidenceImage: null 
        };
    }

    const llmAnswer = await generateResponse(matchData.context, userQuestion);

    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const evidenceUrl = `${baseUrl}/${matchData.imagePath}`;

    return {
        answer: llmAnswer,
        evidenceImage: evidenceUrl
    };
}

module.exports = { processChatRequest };