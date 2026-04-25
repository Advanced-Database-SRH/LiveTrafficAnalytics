import VehicleEvent from "../models/VehicleEvent.js";
import TrafficStats from "../models/TrafficStats.js";

//const VehicleEvent = require("../models/VehicleEvent");
//const TrafficStats = require("../models/TrafficStats.js");

export async function saveEvent(eventData) {
  try {
    const event = new VehicleEvent(eventData);
    await event.save();
    console.log(`Saved ${eventData.class} ID:${eventData.vehicle_id}`);
    await updateAggregates(eventData);
  } catch (error) {
    console.error("Failed to save event:", error.message);
  }
}

export async function updateAggregates(eventData) {
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
      await TrafficStats.findOneAndUpdate(
        { timebucket: item.bucket, type: item.type },
        {
          $inc: {
            [`counts.${eventData.class}`]: 1,
            totalViolations: eventData.isViolation ? 1 : 0,
          },
        },
        { upsert: true, new: true }
      );
    }
  } catch (error) {
    console.error("Failed to update aggregates:", error.message);
  }
}

// module.exports = { saveEvent, updateAggregates };
