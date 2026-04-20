const mongoose = require('mongoose');

const vehicleEventSchema = new mongoose.Schema({
    vehicle_id: { type: Number, required: true },
    class:      { type: String, required: true },
    entry_angle: { type: Number },
    entry_time:  { type: String },
    exit_angle:  { type: Number },
    exit_time:   { type: String },
    timestamp:   { type: Number },
}, { 
    timestamps: true  
});

module.exports = mongoose.model('VehicleEvent', vehicleEventSchema);