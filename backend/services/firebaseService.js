const { admin } = require('../config/firebase');

const verifyToken = async (token) => {
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

module.exports = { verifyToken };
