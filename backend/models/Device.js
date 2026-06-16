const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  serialNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  patientName: {
    type: String,
    required: true,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
    default: '',
  },
  status: {
    type: String,
    enum: ['online', 'offline'],
    default: 'offline',
  },
  battery: {
    type: Number,
    min: 0,
    max: 100,
    default: 100,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Device', deviceSchema);
