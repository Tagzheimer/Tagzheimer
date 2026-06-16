const express = require('express');
const router = express.Router();
const { updateLocation, getCurrentLocation } = require('../controllers/locationController');
const { verifyFirebaseToken } = require('../middleware/auth');
const { validateUpdateLocation } = require('../middleware/validation');

router.use(verifyFirebaseToken);

router.post('/update', validateUpdateLocation, updateLocation);
router.get('/:deviceId', getCurrentLocation);

module.exports = router;
