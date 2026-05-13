const { embedText, embedImageBuffer } = require('./embeddingService');
const { searchByVisualMatch, searchMultimodal } = require('./qdrantService');
const { generateResponse } = require('./groqService');
const { Jimp } = require('jimp');

async function processChatRequest(imageBuffer, userQuestion) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    let imageVector = null;
    let textVector = null;

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

    if (imageBuffer) {
        imageVector = await embedImageBuffer(processedImageBuffer);
    }

    if (userQuestion) {
        textVector = await embedText(userQuestion);
    }
    
    const matches = await searchMultimodal(imageVector, textVector, 5);

    if (matches.length === 0) {
        return { answer: "I couldn't find any relevant data.", evidenceImages: [] };
    }

    const context = matches.map(m => m.sentence).join('\n');
    const llmAnswer = await generateResponse(context, userQuestion || "Summarize these events.");

    const evidenceUrl = `${baseUrl}/${matches.imagePath}`;

    const evidenceImages = matches.map(m => ({
        url: m.image_path ? `${baseUrl}/${m.image_path}` : null,
        score: m.score,
        vehicle_class: m.vehicle_class,
        vehicle_id: m.vehicle_id,
        entry_time: m.entry_time,
        exit_time: m.exit_time,
        mongo_id: m.mongo_id
    }));

    return {
        answer: llmAnswer,
        evidenceImages: evidenceImages
    };
}

module.exports = { processChatRequest };