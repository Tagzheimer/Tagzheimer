const express = require('express');
const router = express.Router();
const { getDevices, getDeviceById, getDeviceBySerial, createDevice, pairDevice, claimDevice, deleteDevice } = require('../controllers/deviceController');
const { verifyFirebaseToken } = require('../middleware/auth');
const { validateCreateDevice, validateDeviceId, validateSerial, validatePairDevice } = require('../middleware/validation');

// === Pairing ===
// POST /api/devices/pair — permissionless / public-safe device pairing.
// Firmware and the mobile app have no user JWT at pairing time (they send a
// placeholder `Bearer mock-token`), so this route must NOT require auth.
// The serial number doubles as the device's credential; new devices are
// provisioned ownerless (owner_id null) and claimed later by a caregiver.
router.post('/pair', validatePairDevice, pairDevice);

// All other device routes require a verified user token or device JWT.
router.use(verifyFirebaseToken);

// GET /api/devices/serial/:serialNumber — lookup by serial
router.get('/serial/:serialNumber', validateSerial, getDeviceBySerial);

// === CRUD ===
router.get('/', getDevices);
router.post('/', validateCreateDevice, createDevice);
router.post('/:id/claim', validateDeviceId, claimDevice);
router.get('/:id', validateDeviceId, getDeviceById);
router.delete('/:id', validateDeviceId, deleteDevice);

module.exports = router;
