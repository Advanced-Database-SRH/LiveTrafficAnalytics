import express from "express";
import VehicleEvent from "../models/VehicleEvent.js";
import TrafficStats from "../models/TrafficStats.js";

const router = express.Router();

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

router.get("/history/stats", async (req, res) => {
  const { type } = req.query;
  try {
    const stats = await TrafficStats.find({ type })
      .sort({ timebucket: -1 })
      .limit(24);
    res.json(stats);
  } catch (err) {
    res.status(500).json(err);
  }
});

export default router;
