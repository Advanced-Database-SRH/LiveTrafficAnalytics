import mongoose from "mongoose";
const TrafficStatsSchema = new mongoose.Schema({
  timebucket: { type: Date, required: true },
  type: { type: String, enum: ["hourly", "daily", "monthly"] },
  counts: {
    car: { type: Number, default: 0 },
    truck: { type: Number, default: 0 },
    bus: { type: Number, default: 0 },
    motorcycle: { type: Number, default: 0 }
  },
  avgDwellTime: Number,
  totalViolations: { type: Number, default: 0 },
});

TrafficStatsSchema.index({ timebucket: -1, type: 1 });

const TrafficStats = mongoose.model("TrafficStats", TrafficStatsSchema);
export default TrafficStats;
