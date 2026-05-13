const { QdrantClient }  = require('@qdrant/js-client-rest');
const { toNumericPointId } = require('../utils/vectorBuilder');

const qdrant = new QdrantClient({ url: process.env.QDRANT_URL });
 
const TEXT_COLLECTION    = 'vehicle_events_text'; 
const VISION_COLLECTION = 'vehicle_visuals';

async function ensureCollections() {
    const { collections } = await qdrant.getCollections();
    const names = collections.map(c => c.name);

    if (!names.includes(TEXT_COLLECTION)) {
        await qdrant.createCollection(TEXT_COLLECTION, {
            vectors: { size: 384, distance: 'Cosine' },
        });
        for (const [field, type] of [
            ['vehicle_class', 'keyword'],
            ['hour_of_day',   'integer'],
            ['weather_code',  'integer'],
            ['timestamp',     'float'  ],
        ]) {
            await qdrant.createPayloadIndex(TEXT_COLLECTION, {
                field_name:   field,
                field_schema: type,
            });
        }
        console.log('[QdrantService] Created:', TEXT_COLLECTION);
    }

    if (!names.includes(VISION_COLLECTION)) {
        await qdrant.createCollection(VISION_COLLECTION, {
            vectors: { size: 512, distance: 'Cosine' },
        });
        console.log('[QdrantService] Created:', VISION_COLLECTION);
    }
}

async function upsertTextEmbedding(event, sentence, embedding, weather) {
    const numericId = toNumericPointId(event._id);
    const textPointId = (numericId + 1_000_000_000) % Number.MAX_SAFE_INTEGER;

    await qdrant.upsert(TEXT_COLLECTION, {
        wait: true,
        points: [{
            id:     textPointId,
            vector: embedding,
            payload: {
                mongo_id:          event._id.toString(),
                vehicle_id:        event.vehicle_id,
                vehicle_class:     event.class,
                sentence,
                entry_time:        event.entry_time,
                exit_time:         event.exit_time,
                timestamp:         event.timestamp,
                hour_of_day:       new Date(event.timestamp * 1000).getUTCHours(),
                weather_condition: weather.condition,
                weather_code:      weather.code,
                temperature_c:     weather.temperature_c,
                precipitation:     weather.precipitation,
            },
        }],
    });

    console.log(`[QdrantService] Text upserted — "${sentence.slice(0, 60)}..."`);
}

async function upsertVisualVector(event, imageVector, weather) {
    const pointId = toNumericPointId(event._id);

    await qdrant.upsert(VISION_COLLECTION, {
        wait: true,
        points: [{
            id:     pointId,
            vector: imageVector,
            payload: {
                mongo_id:          event._id.toString(),
                vehicle_id:        event.vehicle_id,
                vehicle_class:     event.class,
                entry_time:        event.entry_time,
                exit_time:         event.exit_time,
                timestamp:         event.timestamp,
                weather_condition: weather.condition,
                temperature_c:     weather.temperature_c,
                image_path:        event.image_path ?? null,
            },
        }],
    });

    console.log(`[QdrantService] Visual vector upserted for vehicle_id=${event.vehicle_id}`);
}

async function searchTrafficContext(queryEmbedding, limit = 5) {
    const searchResults = await qdrant.search(TEXT_COLLECTION, {
        vector: queryEmbedding,
        limit: limit,
        with_payload: true,
    })

    // Extract the sentences into a single string for Ollama
    return searchResults.map(r => r.payload.sentence).join('\n');
}

async function searchByVisualMatch(queryVector) {
    const visualResults = await qdrant.search(VISION_COLLECTION, {
        vector: queryVector,
        limit: 1,
        with_payload: true,
    });

    if (visualResults.length === 0) return null;

    const bestMatch = visualResults[0];
    const matchedMongoId = bestMatch.payload.mongo_id;
    const imagePath = bestMatch.payload.image_path; 

    const textResults = await qdrant.scroll(TEXT_COLLECTION, {
        filter: {
            must: [{ key: 'mongo_id', match: { value: matchedMongoId } }]
        },
        limit: 1,
        with_payload: true
    });

    const contextSentence = textResults.points.length > 0 
        ? textResults.points[0].payload.sentence 
        : "No text context found for this vehicle.";

    return {
        context: contextSentence,
        imagePath: imagePath
    };
}

async function searchMultimodal(imageVector = null, textVector = null, limit = 5) {
    let combinedResults = [];

    if (imageVector) {
        const visualHits = await qdrant.search(VISION_COLLECTION, {
            vector: imageVector,
            limit: limit,
            with_payload: true
        });
        combinedResults.push(...visualHits.map(h => ({ ...h.payload, score: h.score })));
    }

    if (textVector) {
        const textHits = await qdrant.search(TEXT_COLLECTION, {
            vector: textVector,
            limit: limit,
            with_payload: true
        });
        combinedResults.push(...textHits.map(h => ({ ...h.payload, score: h.score })));
    }

    const uniqueMap = new Map();
    for (const item of combinedResults) {
        if (!uniqueMap.has(item.mongo_id)) {
            uniqueMap.set(item.mongo_id, item);
        }
        if (uniqueMap.size >= limit) break;
    }

    const finalItems = Array.from(uniqueMap.values());

    return await Promise.all(finalItems.map(async (item) => {
        if (item.sentence) return item;

        const textData = await qdrant.scroll(TEXT_COLLECTION, {
            filter: { must: [{ key: 'mongo_id', match: { value: item.mongo_id } }] },
            limit: 1,
            with_payload: true
        });
        
        return {
            ...item,
            sentence: textData.points[0]?.payload.sentence || "No description available."
        };
    }));
}

module.exports = { ensureCollections, upsertTextEmbedding, searchTrafficContext, upsertVisualVector, searchByVisualMatch, searchMultimodal};