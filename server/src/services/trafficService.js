const TrafficStats = require('../models/TrafficStats');

const getDensityComparison = async () => {
    const stats = await TrafficStats.find({ type: 'hourly' }) 
        .sort({ timebucket: -1 })
        .limit(2);

    if (!stats || stats.length === 0) return null;

    const current = stats[0];
    const previous = stats[1] || null;
    const ROAD_CAPACITY = 1000; 

    const calculateDensity = (count) => {
        const vCount = count || 0;
        return `${Math.min((vCount / ROAD_CAPACITY) * 100, 100).toFixed(1)}%`;
    };

    return {
        currentHour: {
            time: current.timebucket,
            count: current.vehicleCount || 0,
            density: calculateDensity(current.vehicleCount),
            breakdown: Object.fromEntries(current.counts || new Map())
        },
        previousHour: previous ? {
            time: previous.timebucket,
            count: previous.vehicleCount || 0,
            density: calculateDensity(previous.vehicleCount),
            breakdown: Object.fromEntries(previous.counts || new Map())
        } : "Not enough historical data yet",
        trend: previous ? (current.vehicleCount >= previous.vehicleCount ? "Increasing" : "Decreasing") : "Stable"
    };
};

module.exports = { getDensityComparison };