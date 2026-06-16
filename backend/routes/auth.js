const express = require('express');
const router = express.Router();
const { verifyToken } = require('../controllers/authController');
const { verifyFirebaseToken } = require('../middleware/auth');

router.post('/verify', verifyFirebaseToken, verifyToken);

module.exports = router;
