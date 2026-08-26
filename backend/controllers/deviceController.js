const { getServiceClient, isSupabaseConfigured } = require('../config/supabase');
const { isDemoMode, getDemoStore } = require('../config/demoMode');
const { generatePairingSecret, issueDeviceToken } = require('../utils/deviceTokens');

// Logical model name → physical Postgres table (demo store uses model names)
const TABLE_NAMES = { Device: 'devices', Location: 'locations', User: 'profiles' };

/**
 * Get a "table accessor" that returns either the Supabase table or the
 * demo store's collection with the same name. Lets us write controller
 * code once and have it work in both modes.
 */
function getTable(name) {
  if (isDemoMode() || !isSupabaseConfigured()) {
    return { demo: true, store: getDemoStore()[name] };
  }
  return { demo: false, supabase: getServiceClient().from(TABLE_NAMES[name] || name) };
}

// === Snake_case ↔ camelCase shim ===
// Postgres uses snake_case; JS objects use camelCase. We convert at the
// boundary so controllers stay idiomatic.
function dbRowToDevice(row) {
  if (!row) return null;
  // Handle both Supabase (snake_case) and demo store (camelCase) shapes
  const id = row.id || row._id;
  return {
    _id: id,
    id: id,
    name: row.name,
    serialNumber: row.serial_number ?? row.serialNumber,
    patientName: row.patient_name ?? row.patientName,
    notes: row.notes || '',
    status: row.status,
    battery: row.battery,
    ownerId: row.owner_id ?? row.ownerId,
    pairingSecret: row.pairing_secret ?? row.pairingSecret,
    lastSeen: row.last_seen ?? row.lastSeen,
    createdAt: row.created_at ?? row.createdAt,
  };
}

// === GET /api/devices — list all devices owned by the logged-in user ===
const getDevices = async (req, res) => {
  try {
    const ownerId = req.user.uid;
    const table = getTable('Device');

    let rows;
    if (table.demo) {
      // Demo store: filter array directly
      rows = table.store
        .find({ ownerId })
        .sort()
        .lean();
      rows = await rows;
    } else {
      const { data, error } = await table.supabase
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      rows = data;
    }

    return res.json(rows.map(dbRowToDevice));
  } catch (error) {
    console.error('Error in getDevices:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// === GET /api/devices/:id ===
const getDeviceById = async (req, res) => {
  try {
    const { id } = req.params;
    const table = getTable('Device');

    let row;
    if (table.demo) {
      const found = table.store.findById(id);
      row = found ? await found.lean() : null;
    } else {
      const { data, error } = await table.supabase
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      row = data;
    }

    if (!row) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }
    return res.json(dbRowToDevice(row));
  } catch (error) {
    console.error('Error in getDeviceById:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// === GET /api/devices/serial/:serialNumber ===
const getDeviceBySerial = async (req, res) => {
  try {
    const { serialNumber } = req.params;
    const table = getTable('Device');

    let row;
    if (table.demo) {
      row = await table.store.findOne({ serialNumber });
    } else {
      const { data, error } = await table.supabase
        .select('*')
        .eq('serial_number', serialNumber)
        .maybeSingle();
      if (error) throw error;
      row = data;
    }

    if (!row) {
      return res.status(404).json({ success: false, message: 'No device with that serial number' });
    }

    const device = dbRowToDevice(row);
    return res.json({
      success: true,
      device: {
        id: String(device._id),
        deviceId: String(device._id),
        serialNumber: device.serialNumber,
        name: device.name,
        status: device.status,
        lastSeen: device.lastSeen,
        battery: device.battery,
      },
    });
  } catch (error) {
    console.error('Error in getDeviceBySerial:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// === POST /api/devices ===
const createDevice = async (req, res) => {
  try {
    const { name, serialNumber, patientName, notes } = req.body;

    // Check for duplicate serial
    const table = getTable('Device');
    let existing;
    if (table.demo) {
      existing = await table.store.findOne({ serialNumber });
    } else {
      const { data } = await table.supabase
        .select('id')
        .eq('serial_number', serialNumber)
        .maybeSingle();
      existing = data;
    }

    if (existing) {
      return res.status(409).json({ success: false, message: 'Device with this serial number already exists' });
    }

    // Insert
    let row;
    if (table.demo) {
      row = await table.store.create({
        name, serialNumber, patientName, notes: notes || '',
        ownerId: req.user.uid || req.user._id,
      });
    } else {
      const { data, error } = await table.supabase.insert({
        name,
        serial_number: serialNumber,
        patient_name: patientName,
        notes: notes || '',
        owner_id: req.user.uid,
      }).select().single();
      if (error) throw error;
      row = data;
    }

    return res.status(201).json(dbRowToDevice(row));
  } catch (error) {
    console.error('Error in createDevice:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// === POST /api/devices/pair ===
const pairDevice = async (req, res) => {
  try {
    const { serialNumber, name, patientName, notes } = req.body;
    const table = getTable('Device');

    let device;
    let created = false;

    if (table.demo) {
      // Demo store path — unchanged behavior
      device = await table.store.findOne({ serialNumber });
      if (!device) {
        device = await table.store.create({
          name: name || `Tracker ${serialNumber}`,
          serialNumber,
          patientName: patientName || 'Unknown Patient',
          notes: notes || 'Auto-provisioned via /api/devices/pair',
          ownerId: req.user?.uid || req.user?._id || 'demo-user-uuid',
          pairingSecret: generatePairingSecret(),
        });
        created = true;
      } else if (!device.pairingSecret) {
        const secret = generatePairingSecret();
        await table.store.findByIdAndUpdate(device._id, { pairingSecret: secret });
        device = await table.store.findById(device._id).lean();
      }
    } else {
      // Supabase path — use upsert + select
      const { data: existing } = await table.supabase
        .select('*')
        .eq('serial_number', serialNumber)
        .maybeSingle();

      if (existing) {
        device = existing;
        created = false;
        if (!existing.pairing_secret) {
          const secret = generatePairingSecret();
          const { data: updated } = await table.supabase
            .update({ pairing_secret: secret })
            .eq('id', existing.id)
            .select()
            .single();
          device = updated;
        }
      } else {
        const { data: inserted, error } = await table.supabase
          .insert({
            name: name || `Tracker ${serialNumber}`,
            serial_number: serialNumber,
            patient_name: patientName || 'Unknown Patient',
            notes: notes || 'Auto-provisioned via /api/devices/pair',
            owner_id: req.user?.uid || null,
            pairing_secret: generatePairingSecret(),
          })
          .select()
          .single();
        if (error) throw error;
        device = inserted;
        created = true;
      }
    }

    // Normalize to a shape issueDeviceToken can consume
    const tokenSource = device.toObject ? device.toObject() : device;
    const accessToken = issueDeviceToken({
      _id: tokenSource.id || tokenSource._id,
      serialNumber: tokenSource.serial_number || tokenSource.serialNumber,
      pairingSecret: tokenSource.pairing_secret || tokenSource.pairingSecret,
    });

    return res.status(200).json({
      success: true,
      created,
      deviceId: (tokenSource.id || tokenSource._id),
      serialNumber: tokenSource.serial_number || tokenSource.serialNumber,
      deviceName: tokenSource.name,
      patientName: tokenSource.patient_name || tokenSource.patientName,
      accessToken,
    });
  } catch (error) {
    console.error('Error in pairDevice:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// === DELETE /api/devices/:id ===
const deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const table = getTable('Device');

    if (table.demo) {
      const found = table.store.findById(id);
      if (!found) return res.status(404).json({ success: false, message: 'Device not found' });
      await table.store.findByIdAndDelete(id);
      const locStore = getDemoStore().Location;
      await locStore.deleteMany({ deviceId: id });
    } else {
      // ON DELETE CASCADE on locations table handles the cleanup
      const { error } = await table.supabase.delete().eq('id', id);
      if (error) throw error;
    }

    return res.json({ success: true, message: 'Device deleted' });
  } catch (error) {
    console.error('Error in deleteDevice:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getDevices,
  getDeviceById,
  getDeviceBySerial,
  createDevice,
  pairDevice,
  deleteDevice,
};
