const { Location, Device } = require('../models');

const updateLocation = async (req, res) => {
  try {
    const { deviceId, latitude, longitude } = req.body;

    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    const location = await Location.create({
      deviceId,
      latitude,
      longitude,
    });

    await Device.findByIdAndUpdate(deviceId, {
      status: 'online',
      lastSeen: new Date(),
    });

    return res.status(201).json({
      success: true,
      location: {
        id: location._id,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp,
      },
    });
  } catch (error) {
    console.error('Error in updateLocation:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getCurrentLocation = async (req, res) => {
  try {
    const { deviceId } = req.params;

    const location = await Location.findOne({ deviceId })
      .sort({ timestamp: -1 })
      .lean();

    if (!location) {
      return res.status(404).json({ success: false, message: 'No location data found' });
    }

    return res.json({
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: location.timestamp,
    });
  } catch (error) {
    console.error('Error in getCurrentLocation:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { updateLocation, getCurrentLocation };
