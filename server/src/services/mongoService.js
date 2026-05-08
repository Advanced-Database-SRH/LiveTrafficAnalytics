const VehicleEvent = require("../models/VehicleEvent");
const { getCurrentWeather } = require("./weatherService");
const { embedText } = require("./embeddingService");
const { buildSentence } = require("../utils/sentanceBuilder");
const { upsertNumericVector, upsertTextEmbedding } = require("./qdrantService");
const TrafficStats = require("../models/TrafficStats");

async function saveEvent(eventData) {
  try {
    const event = new VehicleEvent(eventData);
    await event.save();
    console.log(`[MongoService] Saved ${event.class} ID:${event.vehicle_id}`);

    const weather = await getCurrentWeather();

    await upsertNumericVector(event, weather);

    const sentence = buildSentence(event, weather);
    const embedding = await embedText(sentence);
    await upsertTextEmbedding(event, sentence, embedding, weather);
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
