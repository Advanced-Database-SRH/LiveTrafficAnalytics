const CLASS_MAP = { car: 0, truck: 1, bus: 2, motorcycle: 3, bicycle: 4 };
const MAX_DWELL = 60;

function timeToSeconds(t = '00:00:00') {
    const [h = 0, m = 0, s = 0] = t.split(':').map(Number);
    return h * 3600 + m * 60 + s;
}

function toNumericPointId(mongoId) {
    return Math.abs(parseInt(mongoId.toString().slice(-8), 16)) % Number.MAX_SAFE_INTEGER;
}

module.exports = { toNumericPointId, timeToSeconds };