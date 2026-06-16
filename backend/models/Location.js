const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

locationSchema.index({ deviceId: 1, timestamp: -1 });

module.exports = mongoose.model('Location', locationSchema);
