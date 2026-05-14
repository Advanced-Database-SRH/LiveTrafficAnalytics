const trafficService = require("../services/trafficService");
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

    if (!stats || stats.length === 0)
      return res.status(404).json({ message: "No data" });

    const current = stats[0];

    const average =
      current.vehicleCount > 0
        ? (current.totalTravelTime / current.vehicleCount).toFixed(2)
        : "0.00";

    res.json({
      hour: current.timebucket,
      totalCars: current.vehicleCount,
      averageTravelTime: `${average}s`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const getMinuteStats = async (req, res) => {
  try {
    const stats = await TrafficStats.find({ type: "minute" })
      .sort({ timebucket: -1 })
      .limit(60);
    const result = stats.map((item) => ({
      ...item._doc,
      averageTravelTime:
        item.vehicleCount > 0
          ? (item.totalTravelTime / item.vehicleCount).toFixed(2) + "s"
          : "0.00s",
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getHourlyStats = async (req, res) => {
  try {
    const stats = await TrafficStats.find({ type: "hourly" })
      .sort({ timebucket: -1 })
      .limit(24);
    const result = stats.map((item) => ({
      ...item._doc,
      averageTravelTime:
        item.vehicleCount > 0
          ? (item.totalTravelTime / item.vehicleCount).toFixed(2) + "s"
          : "0.00s",
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDailyStats = async (req, res) => {
  try {
    const stats = await TrafficStats.find({ type: "daily" })
      .sort({ timebucket: -1 })
      .limit(7);
    const result = stats.map((item) => ({
      ...item._doc,
      averageTravelTime:
        item.vehicleCount > 0
          ? (item.totalTravelTime / item.vehicleCount).toFixed(2) + "s"
          : "0.00s",
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const getWeeklyStats = async (req, res) => {
  try {
    const stats = await TrafficStats.find({ type: "weekly" })
      .sort({ timebucket: -1 })
      .limit(4);
    const result = stats.map((item) => ({
      ...item._doc,
      averageTravelTime:
        item.vehicleCount > 0
          ? (item.totalTravelTime / item.vehicleCount).toFixed(2) + "s"
          : "0.00s",
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getDensityStats,
  getAverageFlow,
  getMinuteStats,
  getHourlyStats,
  getDailyStats,
  getWeeklyStats,
};
