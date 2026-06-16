const { Device, Location } = require('../models');

const getDevices = async (req, res) => {
  try {
    const devices = await Device.find({ ownerId: req.user.uid || req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(devices);
  } catch (error) {
    console.error('Error in getDevices:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getDeviceById = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id).lean();

    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    return res.json(device);
  } catch (error) {
    console.error('Error in getDeviceById:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createDevice = async (req, res) => {
  try {
    const { name, serialNumber, patientName, notes } = req.body;

    const existing = await Device.findOne({ serialNumber });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Device with this serial number already exists' });
    }

    const device = await Device.create({
      name,
      serialNumber,
      patientName,
      notes: notes || '',
      ownerId: req.user.uid || req.user._id,
    });

    return res.status(201).json(device);
  } catch (error) {
    console.error('Error in createDevice:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteDevice = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);

    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    await Device.findByIdAndDelete(req.params.id);
    await Location.deleteMany({ deviceId: req.params.id });

    return res.json({ success: true, message: 'Device deleted' });
  } catch (error) {
    console.error('Error in deleteDevice:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getDevices, getDeviceById, createDevice, deleteDevice };
