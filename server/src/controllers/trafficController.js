const trafficService = require('../services/trafficService');
const TrafficStats = require("../models/TrafficStats");

const getDensityStats = async (req, res) => {
    try {
        const data = await trafficService.getDensityComparison();
        if (!data) {
            return res.status(404).json({ message: "No data found" });
        }
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
const getAverageFlow = async (req, res) => {
  try {
    const stats = await TrafficStats.find({ type: "hourly" })
      .sort({ timebucket: -1 })
      .limit(1);

    if (!stats || stats.length === 0) return res.status(404).json({ message: "No data" });

    const current = stats[0];

    const average = current.vehicleCount > 0 
      ? (current.totalTravelTime / current.vehicleCount).toFixed(2) 
      : "0.00";

    res.json({
      hour: current.timebucket,
      totalCars: current.vehicleCount,
      averageTravelTime: `${average}s`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getDensityStats, getAverageFlow };