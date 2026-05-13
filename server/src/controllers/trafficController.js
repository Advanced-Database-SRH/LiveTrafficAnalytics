const trafficService = require('../services/trafficService');

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

module.exports = { getDensityStats };