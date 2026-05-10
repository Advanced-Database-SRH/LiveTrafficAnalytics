const path = require("path");
const fs   = require("fs");

const VehicleEvent = require("../models/VehicleEvent");
const { getCurrentWeather } = require("./weatherService");
const { embedText } = require("./embeddingService");
const { buildSentence } = require("../utils/sentanceBuilder");
const { upsertTextEmbedding, upsertVisualVector } = require("./qdrantService");
const TrafficStats = require("../models/TrafficStats");

const IMG_DIR = path.resolve(__dirname, "../../assets/img");

if (!fs.existsSync(IMG_DIR)) {
    fs.mkdirSync(IMG_DIR, { recursive: true });
}

function saveImageToDisk(imageBuffer, vehicleId) {
    if (!imageBuffer) return null;
 
    try {
        const filename = `vehicle_${vehicleId}_${Date.now()}.jpg`;
        const filepath  = path.join(IMG_DIR, filename);
        fs.writeFileSync(filepath, imageBuffer);
        return `assets/img/${filename}`;
    } catch (err) {
        console.error("[MongoService] Failed to save image to disk:", err.message);
        return null;
    }
}

async function saveEvent(eventData, imageBuffer, imageVector) {
  try {
    const imagePath = saveImageToDisk(imageBuffer, eventData.vehicle_id);

    const event = new VehicleEvent({
        ...eventData,
        ...(imagePath && { image_path: imagePath }),
    });
    await event.save();
    console.log(`[MongoService] Saved ${event.class} ID:${event.vehicle_id}`);

    const weather = await getCurrentWeather();
    const sentence = buildSentence(event, weather);
    const embedding = await embedText(sentence);
    await upsertTextEmbedding(event, sentence, embedding, weather);

    if (imageVector) {
      await upsertVisualVector(event, imageVector, weather);
    }

    await updateAggregates(eventData);
  } catch (error) {
    console.error("[MongoService] Failed to save event:", error.message);
  }
}

async function updateAggregates(eventData) {
  try {
    const date = new Date();
    const hourBucket = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours()
    );
    const dayBucket = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    const buckets = [
      { bucket: hourBucket, type: "hourly" },
      { bucket: dayBucket, type: "daily" },
    ];

    for (const item of buckets) {
      const updateKey = `counts.${eventData.class}`;
      await TrafficStats.findOneAndUpdate(
        { timebucket: item.bucket, type: item.type },
        {
          $inc: {
            [`counts.${eventData.class}`]: 1,
            totalViolations: eventData.isViolation ? 1 : 0,
          },
        },
        { upsert: true, returnDocument: "after" }
      );
      console.log(
        `[AGGREGATE] Updated ${item.type} stats for ${eventData.class}`
      );
    }
  } catch (error) {
    console.error("Aggregation Error:", error.message);
  }
}

module.exports = { saveEvent };
