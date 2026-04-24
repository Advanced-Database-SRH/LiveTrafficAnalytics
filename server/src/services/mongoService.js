const VehicleEvent       = require('../models/VehicleEvent');
const { getCurrentWeather }   = require('./weatherService');
const { embedText }           = require('./embeddingService');
const { buildSentence }       = require('../utils/sentanceBuilder');
const {
    upsertNumericVector,
    upsertTextEmbedding,
} = require('./qdrantService');

async function saveEvent(eventData) {
    try {
        const event = new VehicleEvent(eventData);
        await event.save();
        console.log(`[MongoService] Saved ${event.class} ID:${event.vehicle_id}`);

        const weather = await getCurrentWeather();

        await upsertNumericVector(event, weather);
        
        const sentence  = buildSentence(event, weather);
        const embedding = await embedText(sentence);
        await upsertTextEmbedding(event, sentence, embedding, weather);

    } catch (error) {
        console.error('[MongoService] Failed to save event:', error.message);
    }
}

module.exports = { saveEvent };