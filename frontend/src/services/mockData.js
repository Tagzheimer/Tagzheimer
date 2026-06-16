const MID = (n) => `00000000000000000000000${n}`.slice(-24);

export const mockDevices = [
  {
    _id: MID(1),
    name: 'Patient Tracker #001',
    serialNumber: 'TAG-001',
    patientName: 'John Smith',
    status: 'online',
    battery: 87,
    notes: 'Primary tracker - always worn',
    lastSeen: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    createdAt: new Date('2026-01-15').toISOString(),
  },
  {
    _id: MID(2),
    name: 'Patient Tracker #002',
    serialNumber: 'TAG-002',
    patientName: 'Mary Johnson',
    status: 'online',
    battery: 63,
    notes: 'Backup device',
    lastSeen: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    createdAt: new Date('2026-02-20').toISOString(),
  },
  {
    _id: MID(3),
    name: 'Patient Tracker #003',
    serialNumber: 'TAG-003',
    patientName: 'Robert Davis',
    status: 'offline',
    battery: 12,
    notes: 'Needs charging',
    lastSeen: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    createdAt: new Date('2026-03-10').toISOString(),
  },
  {
    _id: MID(4),
    name: 'Patient Tracker #004',
    serialNumber: 'TAG-004',
    patientName: 'Sarah Wilson',
    status: 'online',
    battery: 94,
    notes: '',
    lastSeen: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
    createdAt: new Date('2026-04-05').toISOString(),
  },
];

export const mockLocations = {
  [MID(1)]: { latitude: 40.7128, longitude: -74.006, timestamp: new Date().toISOString() },
  [MID(2)]: { latitude: 40.7282, longitude: -73.7949, timestamp: new Date().toISOString() },
  [MID(3)]: { latitude: 40.7589, longitude: -73.9851, timestamp: new Date().toISOString() },
  [MID(4)]: { latitude: 40.7484, longitude: -73.9857, timestamp: new Date().toISOString() },
};
