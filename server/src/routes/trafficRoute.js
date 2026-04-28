const express = require("express");
const router = express.Router();
const VehicleEvent = require("../models/VehicleEvent");
const TrafficStats = require("../models/TrafficStats");

router.get("/events", async (req, res) => {
  try {
    const events = await VehicleEvent.find().sort({ timestamp: -1 }).limit(100);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/counts", async (req, res) => {
  try {
    const counts = await VehicleEvent.aggregate([
      { $group: { _id: "$class", total: { $sum: 1 } } },
    ]);
    res.json(counts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/history", async (req, res) => {
  const { type } = req.query;
  try {
    const stats = await TrafficStats.find({ type: type || "hourly" })
      .sort({ timebucket: -1 })
      .limit(24);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
