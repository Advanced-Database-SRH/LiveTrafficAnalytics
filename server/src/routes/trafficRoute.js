const express = require("express");
const router = express.Router();
const VehicleEvent = require("../models/VehicleEvent");
const TrafficStats = require("../models/TrafficStats");

const { searchTrafficContext } = require('../services/qdrantService');
const { embedText } = require('../services/embeddingService');
const { generateResponse } = require('../services/ollamaService');

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

router.get('/ask', async (req, res) => {
    try {
        const { question } = req.query;
        if (!question) return res.status(400).json({ error: "What is your question?" });

        // 1. Convert question to vector
        const queryVector = await embedText(question);

        // 2. Fetch relevant context from Qdrant
        const context = await searchTrafficContext(queryVector);

        // 3. Get answer from Ollama
        const answer = await generateResponse(context, question);

        res.json({ question, answer });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
