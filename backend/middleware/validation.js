const { body, param, validationResult } = require('express-validator');

// Accepts both legacy Mongo 24-hex IDs and Postgres/Supabase UUIDs
const MONGO_OR_UUID = /^(?:[0-9a-fA-F]{24}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
// Serial allowlist for CREATION paths (pair/create): 3-64 chars,
// alphanumerics + dash/underscore, must start and end alphanumeric.
// Lookup/write-by-serial paths intentionally do NOT enforce the charset:
// production already holds real serials minted before this rule, and
// rejecting them at lookup/write time would brick working trackers.
// New rows are always clean; old rows keep working.
const SERIAL_RE = /^[A-Za-z0-9][A-Za-z0-9\-_]*[A-Za-z0-9]$/;

const rejectNonPrimitive = (v) => {
  if (Array.isArray(v) || (typeof v === 'object' && v !== null)) {
    throw new Error('must be a primitive value');
  }
  return true;
};

const rejectFutureTimestamp = (v) => {
  if (v === undefined || v === null) return true;
  const t = new Date(v).getTime();
  if (!Number.isFinite(t)) throw new Error('must be ISO-8601');
  if (t > Date.now() + 5 * 60 * 1000) throw new Error('timestamp must not be in the future');
  return true;
};

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

/**
 * validateCreateDevice — caregiver creating a device in the dashboard.
 * Body: { name, serialNumber, patientName, notes? }
 */
const validateCreateDevice = [
  body('name').isString().trim().notEmpty().withMessage('Device name is required').isLength({ max: 100 }),
  body('serialNumber').isString().withMessage('Serial number must be a string').trim().isLength({ min: 3, max: 64 }).withMessage('Serial number must be 3-64 chars').matches(SERIAL_RE).withMessage('Serial number must be alphanumeric with dashes/underscores'),
  body('patientName').isString().trim().notEmpty().withMessage('Patient name is required').isLength({ max: 100 }),
  body('notes').optional().isString().trim().isLength({ max: 2000 }).withMessage('Notes must be at most 2000 chars'),
  handleValidationErrors,
];

/**
 * validatePairDevice — tracker pairing with the backend.
 * Body: { serialNumber, name?, patientName?, notes? }
 *
 * Only serialNumber is required. If the device doesn't exist yet, a new
 * device will be auto-provisioned with placeholder values so the tracker
 * can start sending data immediately. The caregiver can later edit the
 * device in the dashboard.
 */
const validatePairDevice = [
  body('serialNumber')
    .isString().withMessage('Serial number must be a string')
    .trim()
    .isLength({ min: 3, max: 64 })
    .withMessage('Serial number must be 3-64 chars')
    .matches(SERIAL_RE).withMessage('Serial number must be alphanumeric with dashes/underscores'),
  body('name').optional().isString().trim().isLength({ max: 100 }),
  body('patientName').optional().isString().trim().isLength({ max: 100 }),
  body('notes').optional().isString().trim().isLength({ max: 2000 }),
  handleValidationErrors,
];

/**
 * validateUpdateLocation — firmware / mobile app reporting a fix.
 * Body accepts EITHER `deviceId` (Mongo ID) OR `serialNumber` (string).
 * Optional `meta` block can carry battery, satellites, hdop, altitude, speed, source.
 */
const validateUpdateLocation = [
  // deviceId OR serialNumber — at least one required UNLESS the caller is a
  // device JWT holder (the token itself identifies the device).
  body('deviceId')
    .optional()
    .custom(rejectNonPrimitive)
    .matches(MONGO_OR_UUID)
    .withMessage('deviceId must be a valid ID'),
  body('serialNumber')
    .optional()
    .isString().withMessage('serialNumber must be a string')
    .trim()
    .isLength({ min: 3, max: 64 })
    .withMessage('serialNumber must be 3-64 chars'),
  body().custom((body, { req }) => {
    if (!body.deviceId && !body.serialNumber && !req.user?.isDevice) {
      throw new Error('Either deviceId or serialNumber is required');
    }
    return true;
  }),
  body('latitude').custom(rejectNonPrimitive).isFloat({ min: -90, max: 90 }).withMessage('Valid latitude (-90..90) is required'),
  body('longitude').custom(rejectNonPrimitive).isFloat({ min: -180, max: 180 }).withMessage('Valid longitude (-180..180) is required'),
  // meta fields — all optional
  body('meta.satellites').optional().custom(rejectNonPrimitive).isInt({ min: 0, max: 50 }),
  body('meta.hdop').optional().custom(rejectNonPrimitive).isFloat({ min: 0, max: 99 }),
  body('meta.altitude').optional().custom(rejectNonPrimitive).isFloat({ min: -1000, max: 10000 }),
  body('meta.speed').optional().custom(rejectNonPrimitive).isFloat({ min: 0, max: 2000 }),
  body('meta.battery').optional().custom(rejectNonPrimitive).isInt({ min: 0, max: 100 }),
  body('meta.source').optional().isIn(['esp32', 'mobile', 'web', 'unknown']),
  body('meta.device').optional().isString().isLength({ max: 100 }),
  body('meta.accuracy').optional().custom(rejectNonPrimitive).isFloat({ min: 0, max: 10000 }),
  // top-level battery shortcut (some clients send it without meta wrapper)
  body('battery').optional().custom(rejectNonPrimitive).isInt({ min: 0, max: 100 }),
  body('source').optional().isIn(['esp32', 'mobile', 'web', 'unknown']),
  handleValidationErrors,
];

/**
 * validateBatchUpdate — mobile app syncing an offline queue.
 * Body: { deviceId?, serialNumber?, fixes: [{latitude, longitude, timestamp, meta?}, ...] }
 */
const validateBatchUpdate = [
  body('deviceId').optional().custom(rejectNonPrimitive).matches(MONGO_OR_UUID),
  body('serialNumber').optional().isString().trim().isLength({ min: 3, max: 64 }),
  body().custom((body, { req }) => {
    if (!body.deviceId && !body.serialNumber && !req.user?.isDevice) {
      throw new Error('Either deviceId or serialNumber is required');
    }
    return true;
  }),
  body('fixes').isArray({ min: 1, max: 100 }).withMessage('fixes must be an array of 1-100 entries'),
  body('fixes.*.latitude').custom(rejectNonPrimitive).isFloat({ min: -90, max: 90 }),
  body('fixes.*.longitude').custom(rejectNonPrimitive).isFloat({ min: -180, max: 180 }),
  body('fixes.*.timestamp').optional().isISO8601().custom(rejectFutureTimestamp),
  body('fixes.*.meta.satellites').optional().custom(rejectNonPrimitive).isInt({ min: 0, max: 50 }),
  body('fixes.*.meta.hdop').optional().custom(rejectNonPrimitive).isFloat({ min: 0, max: 99 }),
  body('fixes.*.meta.altitude').optional().custom(rejectNonPrimitive).isFloat({ min: -1000, max: 10000 }),
  body('fixes.*.meta.speed').optional().custom(rejectNonPrimitive).isFloat({ min: 0, max: 2000 }),
  body('fixes.*.meta.battery').optional().custom(rejectNonPrimitive).isInt({ min: 0, max: 100 }),
  body('fixes.*.meta.source').optional().isIn(['esp32', 'mobile', 'web', 'unknown']),
  body('fixes.*.meta.device').optional().isString().isLength({ max: 100 }),
  body('fixes.*.meta.accuracy').optional().custom(rejectNonPrimitive).isFloat({ min: 0, max: 10000 }),
  handleValidationErrors,
];

const validateDeviceId = [
  // Routes use either :id (devices router) or :deviceId (location router).
  // Validate whichever is present.
  param('id').optional({ checkFalsy: true }).matches(MONGO_OR_UUID).withMessage('Invalid device ID'),
  param('deviceId').optional({ checkFalsy: true }).matches(MONGO_OR_UUID).withMessage('Invalid device ID'),
  handleValidationErrors,
];

const validateSerial = [
  param('serialNumber')
    .isString()
    .trim()
    .isLength({ min: 3, max: 64 })
    .withMessage('Serial number must be 3-64 chars'),
  handleValidationErrors,
];

module.exports = {
  validateCreateDevice,
  validatePairDevice,
  validateUpdateLocation,
  validateBatchUpdate,
  validateDeviceId,
  validateSerial,
};
