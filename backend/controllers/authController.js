const models = require('../models');

const verifyToken = async (req, res) => {
  try {
    const { uid, email, name } = req.user;

    let user = await models.User.findOne({ firebaseUid: uid });

    if (!user) {
      user = await models.User.create({
        name: name || 'User',
        email: email || '',
        firebaseUid: uid,
      });
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Error in verifyToken:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { verifyToken };
