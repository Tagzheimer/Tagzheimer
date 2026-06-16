const { isDemoMode, createDemoStore } = require('../config/demoMode');

if (isDemoMode()) {
  const store = createDemoStore();
  module.exports = store;
} else {
  const User = require('./User');
  const Device = require('./Device');
  const Location = require('./Location');
  module.exports = { User, Device, Location };
}
