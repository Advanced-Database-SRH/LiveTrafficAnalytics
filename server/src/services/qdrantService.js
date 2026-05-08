const { QdrantClient }  = require('@qdrant/js-client-rest');
const { buildNumericVector, toNumericPointId } = require('../utils/vectorBuilder');

const qdrant = new QdrantClient({ url: process.env.QDRANT_URL });

const NUMERIC_COLLECTION = 'vehicle_crossings';   
const TEXT_COLLECTION    = 'vehicle_events_text'; 

async function ensureCollections() {
    const { collections } = await qdrant.getCollections();
    const names = collections.map(c => c.name);

    if (!names.includes(NUMERIC_COLLECTION)) {
        await qdrant.createCollection(NUMERIC_COLLECTION, {
            vectors: { size: 9, distance: 'Cosine' },
        });
        console.log('[QdrantService] Created:', NUMERIC_COLLECTION);
    }

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
}

async function upsertNumericVector(event, weather) {
    const pointId = toNumericPointId(event._id);

    await qdrant.upsert(NUMERIC_COLLECTION, {
        wait: true,
        points: [{
            id:     pointId,
            vector: buildNumericVector(event),
            payload: {
                mongo_id:          event._id.toString(),
                vehicle_id:        event.vehicle_id,
                vehicle_class:     event.class,
                entry_angle:       event.entry_angle,
                exit_angle:        event.exit_angle,
                entry_time:        event.entry_time,
                exit_time:         event.exit_time,
                timestamp:         event.timestamp,
                hour_of_day:       new Date(event.timestamp * 1000).getUTCHours(),
                weather_condition: weather.condition,
                weather_code:      weather.code,
                temperature_c:     weather.temperature_c,
            },
        }],
    });

    console.log(`[QdrantService] Numeric upserted — vehicle_id=${event.vehicle_id}`);
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

async function searchTrafficContext(queryEmbedding, limit = 5) {
    const searchResults = await qdrant.search(TEXT_COLLECTION, {
        vector: queryEmbedding,
        limit: limit,
        with_payload: true,
    })

    // Extract the sentences into a single string for Ollama
    return searchResults.map(r => r.payload.sentence).join('\n');
}

module.exports = { ensureCollections, upsertNumericVector, upsertTextEmbedding, searchTrafficContext };