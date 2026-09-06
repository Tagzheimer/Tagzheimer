const express = require('express');
const router = express.Router();
const { updateLocation, batchUpdate, getCurrentLocation, getLocationHistory } = require('../controllers/locationController');
const { verifyFirebaseToken } = require('../middleware/auth');
const { deviceLimiter } = require('../middleware/rateLimits');
const { validateUpdateLocation, validateBatchUpdate, validateDeviceId } = require('../middleware/validation');

router.use(verifyFirebaseToken);

// === Reporting endpoints (called by ESP32 firmware + mobile app) ===
// POST /api/location/update    — single fix
// POST /api/location/batch     — sync offline queue (mobile)
// deviceLimiter runs AFTER auth so it can key on device identity
// (per-device fair share) instead of punishing NAT-shared IPs.
router.post('/update', deviceLimiter, validateUpdateLocation, updateLocation);
router.post('/batch',  deviceLimiter, validateBatchUpdate,  batchUpdate);

// === Read endpoints (called by dashboard / public pages) ===
// NOTE: /:deviceId/history MUST be declared BEFORE /:deviceId, otherwise
// Express will parse "history" as a deviceId.
router.get('/:deviceId/history', validateDeviceId, getLocationHistory);
router.get('/:deviceId',         validateDeviceId, getCurrentLocation);

module.exports = router;
