const MONGO_ID = (n) => `00000000000000000000000${n}`.slice(-24);
const { generatePairingSecret } = require('../utils/deviceTokens');

const seedDevices = [
  {
    _id: MONGO_ID(1),
    name: 'Patient Tracker #001',
    serialNumber: 'TAG-001',
    patientName: 'John Smith',
    status: 'online',
    battery: 87,
    notes: 'Primary tracker - always worn',
    ownerId: 'mock-uid',
    pairingSecret: null,
    lastSeen: new Date(Date.now() - 2 * 60 * 1000),
    createdAt: new Date('2026-01-15'),
  },
  {
    _id: MONGO_ID(2),
    name: 'Patient Tracker #002',
    serialNumber: 'TAG-002',
    patientName: 'Mary Johnson',
    status: 'online',
    battery: 63,
    notes: 'Backup device',
    ownerId: 'mock-uid',
    pairingSecret: null,
    lastSeen: new Date(Date.now() - 5 * 60 * 1000),
    createdAt: new Date('2026-02-20'),
  },
  {
    _id: MONGO_ID(3),
    name: 'Patient Tracker #003',
    serialNumber: 'TAG-003',
    patientName: 'Robert Davis',
    status: 'offline',
    battery: 12,
    notes: 'Needs charging',
    ownerId: 'mock-uid',
    pairingSecret: null,
    lastSeen: new Date(Date.now() - 120 * 60 * 1000),
    createdAt: new Date('2026-03-10'),
  },
  {
    _id: MONGO_ID(4),
    name: 'Patient Tracker #004',
    serialNumber: 'TAG-004',
    patientName: 'Sarah Wilson',
    status: 'online',
    battery: 94,
    notes: '',
    ownerId: 'mock-uid',
    pairingSecret: null,
    lastSeen: new Date(Date.now() - 1 * 60 * 1000),
    createdAt: new Date('2026-04-05'),
  },
];

const seedLocations = [
  { _id: MONGO_ID(10), deviceId: MONGO_ID(1), latitude: 40.7128, longitude: -74.006, timestamp: new Date() },
  { _id: MONGO_ID(11), deviceId: MONGO_ID(2), latitude: 40.7282, longitude: -73.7949, timestamp: new Date() },
  { _id: MONGO_ID(12), deviceId: MONGO_ID(3), latitude: 40.7589, longitude: -73.9851, timestamp: new Date() },
  { _id: MONGO_ID(13), deviceId: MONGO_ID(4), latitude: 40.7484, longitude: -73.9857, timestamp: new Date() },
];

function createDemoStore() {
  // Deep-clone seeds so tests can mutate without affecting the originals.
  const devices = JSON.parse(JSON.stringify(seedDevices, (k, v) => {
    // revive Date objects
    return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? new Date(v) : v;
  }));
  const locations = JSON.parse(JSON.stringify(seedLocations, (k, v) => {
    return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? new Date(v) : v;
  }));
  let nextDeviceId = 5;
  let nextLocId = 14;

  const toObject = (item) => ({ ...item });
  const toLean = (item) => (item ? { ...item } : null);

  return {
    User: {
      findOne: async (filter) => {
        if (filter?.firebaseUid === 'mock-uid') {
          return toObject({ _id: 'u1', name: 'John Doe', email: 'john@example.com', firebaseUid: 'mock-uid', createdAt: new Date() });
        }
        return null;
      },
      create: async (data) => toObject({ _id: 'u1', ...data, createdAt: new Date() }),
    },

    Device: {
      find: ({ ownerId }) => ({
        sort: () => ({
          lean: async () => devices.filter((d) => !ownerId || d.ownerId === ownerId).map(toLean).reverse(),
        }),
        lean: async () => devices.filter((d) => !ownerId || d.ownerId === ownerId).map(toLean),
      }),

      findById: (id) => {
        const d = devices.find((x) => String(x._id) === String(id));
        // Return an object with .lean() so it's a drop-in for Mongoose.
        return d
          ? { ...d, lean: async () => toLean(d) }
          : null;
      },

      findOne: async (filter) => {
        const d = devices.find((x) =>
          Object.entries(filter).every(([k, v]) => String(x[k]) === String(v))
        );
        return d ? toLean(d) : null;
      },

      create: async (data) => {
        const doc = {
          _id: MONGO_ID(nextDeviceId++),
          status: 'offline',
          battery: 100,
          pairingSecret: null,
          lastSeen: null,
          createdAt: new Date(),
          ...data,
        };
        devices.push(doc);
        return toObject(doc);
      },

      findByIdAndUpdate: async (id, update) => {
        const d = devices.find((x) => String(x._id) === String(id));
        if (d) Object.assign(d, update);
        return d ? toObject(d) : null;
      },

      findOneAndUpdate: async (filter, update, opts = {}) => {
        const d = devices.find((x) =>
          Object.entries(filter).every(([k, v]) => String(x[k]) === String(v))
        );
        if (d) {
          Object.assign(d, update);
          return opts?.new ? toObject(d) : toObject(d);
        }
        if (opts?.upsert) {
          const doc = { _id: MONGO_ID(nextDeviceId++), ...filter, ...update, createdAt: new Date() };
          devices.push(doc);
          return toObject(doc);
        }
        return null;
      },

      findByIdAndDelete: async (id) => {
        const idx = devices.findIndex((d) => String(d._id) === String(id));
        if (idx !== -1) devices.splice(idx, 1);
      },
    },

    Location: {
      create: async (data) => {
        const doc = { _id: MONGO_ID(nextLocId++), ...data, timestamp: data.timestamp || new Date() };
        locations.push(doc);
        return toObject(doc);
      },

      findOne: (filter) => {
        const matches = locations
          .filter((x) => Object.entries(filter).every(([k, v]) => String(x[k]) === String(v)))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const match = matches.length > 0 ? matches[0] : null;
        return {
          ...(match || {}),
          sort: () => ({ lean: async () => toLean(match) }),
        };
      },

      find: (filter) => {
        // Compute matches sorted newest-first (matches Mongoose .sort({timestamp:-1}))
        const matches = () => locations
          .filter((x) => Object.entries(filter).every(([k, v]) => String(x[k]) === String(v)))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // State carried through the chain: current limit (Number|null)
        let limitN = null;

        const applyLimit = (arr) => (limitN == null ? arr : arr.slice(0, limitN));

        const finalChain = {
          lean: async () => applyLimit(matches()).map(toLean),
          limit: (n) => { limitN = n; return finalChain; },
          sort: () => finalChain,  // already sorted
        };

        return {
          sort: () => finalChain,
          limit: (n) => { limitN = n; return finalChain; },
          lean: async () => applyLimit(matches()).map(toLean),
        };
      },

      deleteMany: async (filter) => {
        const idsToDelete = locations
          .filter((x) => Object.entries(filter).every(([k, v]) => String(x[k]) === String(v)))
          .map((x) => x._id);
        for (let i = locations.length - 1; i >= 0; i--) {
          if (idsToDelete.includes(locations[i]._id)) locations.splice(i, 1);
        }
      },

      insertMany: async (docs) => {
        const created = docs.map((d) => {
          const doc = { _id: MONGO_ID(nextLocId++), ...d, timestamp: d.timestamp || new Date() };
          locations.push(doc);
          return doc;
        });
        return created;
      },
    },
  };
}

// === Singleton demo store — created once on first require ===
let _store = null;
function getDemoStore() {
  if (!_store) _store = createDemoStore();
  return _store;
}

module.exports = {
  createDemoStore,
  getDemoStore,
  isDemoMode: () => process.env.DEMO_MODE === 'true',
};
