const { embedImageBuffer } = require('./embeddingService');
const { searchByVisualMatch } = require('./qdrantService');
const { generateResponse } = require('./groqService');
const { Jimp } = require('jimp');

async function processChatRequest(imageBuffer, userQuestion) {
    // Auto-convert any format (PNG, WebP, etc.) to JPEG before processing
    let processedImageBuffer = imageBuffer;

    try {
        console.log("Converting PNG to JPEG using Jimp...");
        const image = await Jimp.read(imageBuffer);
        processedImageBuffer = await image.getBuffer('image/jpeg');
    } catch (err) {
        console.error("Image conversion failed:", err.message);
        throw new Error("Failed to process the uploaded image.");
    }

    const queryVector = await embedImageBuffer(processedImageBuffer);
    
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