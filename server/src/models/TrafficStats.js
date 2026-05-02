const mongoose = require("mongoose");

const trafficStatsSchema = new mongoose.Schema({
  timebucket: { type: Date, required: true },
  type: { type: String, enum: ["hourly", "daily", "monthly"] },
  counts: {
    car: { type: Number, default: 0 },
    truck: { type: Number, default: 0 },
    bus: { type: Number, default: 0 },
    motorcycle: { type: Number, default: 0 }
  },
  totalViolations: { type: Number, default: 0 },
});

trafficStatsSchema.index({ timebucket: -1, type: 1 }, { unique: true });

module.exports = mongoose.model("TrafficStats", trafficStatsSchema);