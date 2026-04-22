const VehicleEvent = require('../models/VehicleEvent');
const { QdrantClient } = require('@qdrant/js-client-rest');

const qdrant = new QdrantClient({ url: process.env.QDRANT_URL });
const COLLECTION = 'vehicle_crossings';
const CLASS_MAP = { car: 0, truck: 1, bus: 2, motorcycle: 3, bicycle: 4 };
const MAX_DWELL = 60;

function timeToSeconds(t = '00:00:00') {
    const [h = 0, m = 0, s = 0] = t.split(':').map(Number);
    return h * 3600 + m * 60 + s;
}

function buildVector(doc) {
    const entryAngle = parseFloat(doc.entry_angle ?? 180);
    const exitAngle  = parseFloat(doc.exit_angle  ?? 180);
    const dwell      = Math.max(timeToSeconds(doc.exit_time) - timeToSeconds(doc.entry_time), 0);

    let angleDelta = Math.abs(exitAngle - entryAngle) % 360;
    if (angleDelta > 180) angleDelta = 360 - angleDelta;

    const clsEnc = CLASS_MAP[(doc.class || 'car').toLowerCase()] ?? 0;
    const dt     = new Date((doc.timestamp ?? 0) * 1000);
    const h      = dt.getUTCHours();
    const m      = dt.getUTCMinutes();

    const hourSin       = (Math.sin((h * 2 * Math.PI) / 24) + 1) / 2;
    const hourCos       = (Math.cos((h * 2 * Math.PI) / 24) + 1) / 2;
    const entryQuadrant = Math.floor(((entryAngle + 45) % 360) / 90) / 3;

    return [
        entryAngle / 360,
        exitAngle  / 360,
        angleDelta / 180,
        Math.min(dwell / MAX_DWELL, 1),
        clsEnc / 4,
        hourSin,
        hourCos,
        m / 59,
        entryQuadrant,
    ];
}

async function ensureCollection() {
    const { collections } = await qdrant.getCollections();
    if (!collections.find(c => c.name === COLLECTION)) {
        await qdrant.createCollection(COLLECTION, {
            vectors: { size: 9, distance: 'Cosine' },
        });
        console.log('[Qdrant] Collection created');
    }
}

ensureCollection().catch(console.error);

async function saveEvent(eventData) {
    try {
        const event = new VehicleEvent(eventData);
        await event.save();
        console.log(`Saved ${eventData.class} ID:${eventData.vehicle_id}`);

        const pointId = Math.abs(
            parseInt(event._id.toString().slice(-8), 16)
        ) % Number.MAX_SAFE_INTEGER;

        await qdrant.upsert(COLLECTION, {
            wait: true,
            points: [{
                id:     pointId,
                vector: buildVector(event),
                payload: {
                    mongo_id:      event._id.toString(),
                    vehicle_id:    event.vehicle_id,
                    vehicle_class: event.class,
                    entry_angle:   event.entry_angle,
                    exit_angle:    event.exit_angle,
                    entry_time:    event.entry_time,
                    exit_time:     event.exit_time,
                    timestamp:     event.timestamp,
                    hour_of_day:   new Date(event.timestamp * 1000).getUTCHours(),
                },
            }],
        });

        console.log(`[Qdrant] Upserted vehicle_id=${event.vehicle_id}`);

    } catch (error) {
        console.error('Failed to save event:', error.message);
    }
}

module.exports = { saveEvent };