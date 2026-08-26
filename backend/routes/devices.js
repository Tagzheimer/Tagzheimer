const express = require('express');
const router = express.Router();
const { getDevices, getDeviceById, getDeviceBySerial, createDevice, pairDevice, deleteDevice } = require('../controllers/deviceController');
const { verifyFirebaseToken } = require('../middleware/auth');
const { validateCreateDevice, validateDeviceId, validateSerial, validatePairDevice } = require('../middleware/validation');

router.use(verifyFirebaseToken);

// === Pairing ===
// POST /api/devices/pair — easy pairing by serial number
//   Body: { serialNumber, name?, patientName?, notes? }
//   Returns: { deviceId, accessToken, ... }
router.post('/pair', validatePairDevice, pairDevice);

// GET /api/devices/serial/:serialNumber — lookup by serial
router.get('/serial/:serialNumber', validateSerial, getDeviceBySerial);

// === CRUD ===
router.get('/', getDevices);
router.post('/', validateCreateDevice, createDevice);
router.get('/:id', validateDeviceId, getDeviceById);
router.delete('/:id', validateDeviceId, deleteDevice);

module.exports = router;
