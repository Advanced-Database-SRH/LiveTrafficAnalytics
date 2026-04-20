const VehicleEvent = require('../models/VehicleEvent');

async function saveEvent(eventData) {
    try {
        const event = new VehicleEvent(eventData);
        await event.save();
        console.log(`Saved ${eventData.class} ID:${eventData.vehicle_id}`);
    } catch (error) {
        console.error('Failed to save event:', error.message);
    }
}

module.exports = { saveEvent };