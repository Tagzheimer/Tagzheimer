const { body, param, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const validateCreateDevice = [
  body('name').trim().notEmpty().withMessage('Device name is required'),
  body('serialNumber').trim().notEmpty().withMessage('Serial number is required'),
  body('patientName').trim().notEmpty().withMessage('Patient name is required'),
  body('notes').optional().trim(),
  handleValidationErrors,
];

const validateUpdateLocation = [
  body('deviceId').isMongoId().withMessage('Valid device ID is required'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
  handleValidationErrors,
];

const validateDeviceId = [
  param('id').isMongoId().withMessage('Invalid device ID'),
  handleValidationErrors,
];

module.exports = { validateCreateDevice, validateUpdateLocation, validateDeviceId };
