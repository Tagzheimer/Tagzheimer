const express = require('express');
const router = express.Router();
const { getDevices, getDeviceById, createDevice, deleteDevice } = require('../controllers/deviceController');
const { verifyFirebaseToken } = require('../middleware/auth');
const { validateCreateDevice, validateDeviceId } = require('../middleware/validation');

router.use(verifyFirebaseToken);

router.get('/', getDevices);
router.post('/', validateCreateDevice, createDevice);
router.get('/:id', validateDeviceId, getDeviceById);
router.delete('/:id', validateDeviceId, deleteDevice);

module.exports = router;
