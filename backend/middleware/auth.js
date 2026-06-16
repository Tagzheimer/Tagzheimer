const { admin } = require('../config/firebase');

const verifyFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];

    if ((process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true') && token === 'mock-token') {
      req.user = { uid: 'mock-uid', email: 'john@example.com', name: 'John Doe' };
      return next();
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

module.exports = { verifyFirebaseToken };
