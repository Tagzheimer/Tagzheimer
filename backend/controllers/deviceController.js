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

// Online threshold: a tracker is considered online only if it checked in
// recently. The stored `status` column is write-only history; reads compute
// freshness so the dashboard can never show a dead tracker as "online".
const ONLINE_THRESHOLD_MS = 15 * 60 * 1000;

function computeOnlineStatus(storedStatus, lastSeen) {
  if (!lastSeen) return 'offline';
  const t = new Date(lastSeen).getTime();
  if (!Number.isFinite(t)) return 'offline';
  if (Date.now() - t > ONLINE_THRESHOLD_MS) return 'offline';
  return storedStatus === 'online' ? 'online' : (storedStatus || 'offline');
}

// === Snake_case ↔ camelCase shim ===
// Postgres uses snake_case; JS objects use camelCase. We convert at the
// boundary so controllers stay idiomatic.
function dbRowToDevice(row) {
  if (!row) return null;
  // Handle both Supabase (snake_case) and demo store (camelCase) shapes
  const id = row.id || row._id;
  const lastSeen = row.last_seen ?? row.lastSeen;
  const storedStatus = row.status;
  return {
    _id: id,
    id: id,
    name: row.name,
    serialNumber: row.serial_number ?? row.serialNumber,
    patientName: row.patient_name ?? row.patientName,
    notes: row.notes || '',
    status: computeOnlineStatus(storedStatus, lastSeen),
    battery: row.battery,
    ownerId: row.owner_id ?? row.ownerId,
    pairingSecret: row.pairing_secret ?? row.pairingSecret,
    lastSeen,
    createdAt: row.created_at ?? row.createdAt,
  };
}

const { normalizeSerial, serialEquals, findDeviceBySerialProd, serialTakenProd } = require('../utils/serialLookup');

async function findDeviceBySerialDemo(store, serial) {
  const all = await store.find({}).lean();
  const norm = normalizeSerial(serial).toLowerCase();
  return all.find((d) => String(d.serialNumber ?? '').trim().toLowerCase() === norm) || null;
}

// === GET /api/devices — list all devices owned by the logged-in user ===
const getDevices = async (req, res) => {
  try {
    if (req.user?.isDevice) {
      return res.status(403).json({ success: false, message: 'Devices cannot list user devices' });
    }
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
    const device = dbRowToDevice(row);
    if (!req.user.isDevice && String(device.ownerId) !== String(req.user.uid)) {
      return res.status(403).json({ success: false, message: 'Forbidden — you do not own this device' });
    }
    if (req.user.isDevice && String(device._id) !== String(req.user.deviceId)) {
      return res.status(403).json({ success: false, message: 'Token is not valid for this device' });
    }
    return res.json(device);
  } catch (error) {
    console.error('Error in getDeviceById:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// === GET /api/devices/serial/:serialNumber ===
// Scoped to the caller: owned-by-other devices return 404 (not 403) so the
// endpoint cannot be used as an enumeration oracle.
const getDeviceBySerial = async (req, res) => {
  try {
    const serial = normalizeSerial(req.params.serialNumber);
    const table = getTable('Device');

    let row;
    if (table.demo) {
      row = await findDeviceBySerialDemo(table.store, serial);
    } else {
      row = await findDeviceBySerialProd(table.supabase, serial, '*');
    }

    if (!row) {
      return res.status(404).json({ success: false, message: 'No device with that serial number' });
    }

    const device = dbRowToDevice(row);
    const ownerId = device.ownerId;
    if (req.user?.isDevice) {
      if (String(device._id) !== String(req.user.deviceId)) {
        return res.status(404).json({ success: false, message: 'No device with that serial number' });
      }
    } else if (ownerId && String(ownerId) !== String(req.user.uid)) {
      return res.status(404).json({ success: false, message: 'No device with that serial number' });
    } else if (!ownerId) {
      // Ownerless devices are visible so a caregiver can discover + claim
      // them, but only minimal non-sensitive fields are exposed.
    }
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
    if (req.user?.isDevice) {
      return res.status(403).json({ success: false, message: 'Devices cannot create other devices' });
    }
    const { name, patientName, notes } = req.body;
    const serialNumber = normalizeSerial(req.body.serialNumber);
    if (!serialNumber) {
      return res.status(400).json({ success: false, message: 'Serial number is required' });
    }

    // Check for duplicate serial (case-insensitive)
    const table = getTable('Device');
    let existing;
    if (table.demo) {
      existing = await findDeviceBySerialDemo(table.store, serialNumber);
    } else {
      existing = (await serialTakenProd(table.supabase, serialNumber)) ? { id: 'taken' } : null;
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
      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({ success: false, message: 'Device with this serial number already exists' });
        }
        throw error;
      }
      row = data;
    }

    return res.status(201).json(dbRowToDevice(row));
  } catch (error) {
    console.error('Error in createDevice:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// === POST /api/devices/pair ===
// Public-safe provisioning: creates OWNERLESS devices only. Already-claimed
// devices return 409 so a serial number alone can never hijack a tracker's
// write token. Owners mint replacement tokens via POST /:id/token.
const pairDevice = async (req, res) => {
  try {
    const serialNumber = normalizeSerial(req.body.serialNumber);
    const { name, patientName, notes } = req.body;
    if (!serialNumber) {
      return res.status(400).json({ success: false, message: 'Serial number is required' });
    }
    const table = getTable('Device');

    let device;
    let created = false;

    if (table.demo) {
      device = await findDeviceBySerialDemo(table.store, serialNumber);
      if (!device) {
        // Check for exact-match race: two concurrent pairs for the same new
        // serial must not create duplicates.
        device = await table.store.create({
          name: name || `Tracker ${serialNumber}`,
          serialNumber,
          patientName: patientName || 'Unknown Patient',
          notes: notes || 'Auto-provisioned via /api/devices/pair',
          ownerId: null,
          pairingSecret: generatePairingSecret(),
        });
        created = true;
        // If a concurrent request created the same serial first, collapse to
        // a single row (keep the first, drop ours).
        const all = await table.store.find({}).lean();
        const dupes = all.filter((d) => serialEquals(d.serialNumber, serialNumber));
        if (dupes.length > 1) {
          dupes.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          const keeper = dupes[0];
          for (const extra of dupes.slice(1)) {
            if (String(extra._id) === String(device._id)) device = keeper;
            await table.store.findByIdAndDelete(extra._id);
          }
          created = String(device._id) === String(keeper._id) && created;
          device = keeper;
        }
      } else {
        const existingOwner = device.ownerId ?? device.owner_id ?? null;
        if (existingOwner) {
          // Owned device: allow re-pair only for the owner (mock-token user
          // in demo) or the device itself holding a valid token; strangers
          // get 409 without learning anything beyond "claimed".
          const callerUid = req.user?.uid || null;
          const callerIsOwner = callerUid && String(existingOwner) === String(callerUid);
          let callerIsDevice = false;
          if (req.user?.isDevice && String(req.user.deviceId) === String(device._id)) {
            callerIsDevice = true;
          }
          if (!callerIsOwner && !callerIsDevice) {
            // Optional device-token re-auth: caller may present a valid
            // device JWT in Authorization even though /pair is public.
            const hdr = req.headers.authorization || '';
            if (hdr.startsWith('Bearer ')) {
              try {
                const { verifyDeviceToken } = require('../utils/deviceTokens');
                const decoded = await verifyDeviceToken(hdr.slice(7), {
                  findByDeviceId: async (id) => {
                    const f = table.store.findById(id);
                    if (!f) return null;
                    const lean = await f.lean();
                    return { _id: lean._id, serialNumber: lean.serialNumber, pairingSecret: lean.pairingSecret };
                  },
                });
                if (decoded?.kind === 'device' && String(decoded.deviceId) === String(device._id)) {
                  callerIsDevice = true;
                }
              } catch { /* not a valid device token — fall through to 409 */ }
            }
          }
          if (!callerIsOwner && !callerIsDevice) {
            return res.status(409).json({ success: false, message: 'Device already claimed. Ask the owner to share access or mint a new tracker token.' });
          }
        }
        if (!device.pairingSecret) {
          const secret = generatePairingSecret();
          await table.store.findByIdAndUpdate(device._id, { pairingSecret: secret });
          device = await table.store.findById(device._id).lean();
        }
      }
    } else {
      // Supabase path (exact-eq first so case-variant dupes can't 406)
      const matched = await findDeviceBySerialProd(table.supabase, serialNumber, '*');
      if (matched) {
        device = matched;
        created = false;
        const existingOwner = matched.owner_id ?? null;
        if (existingOwner) {
          return res.status(409).json({ success: false, message: 'Device already claimed. Ask the owner to share access or mint a new tracker token.' });
        }
        if (!matched.pairing_secret) {
          const secret = generatePairingSecret();
          const { data: updated, error: upErr } = await table.supabase
            .update({ pairing_secret: secret })
            .eq('id', matched.id)
            .select()
            .single();
          if (upErr) throw upErr;
          device = updated;
        }
      } else {
        const { data: inserted, error } = await table.supabase
          .insert({
            name: name || `Tracker ${serialNumber}`,
            serial_number: serialNumber,
            patient_name: patientName || 'Unknown Patient',
            notes: notes || 'Auto-provisioned via /api/devices/pair',
            owner_id: null,
            pairing_secret: generatePairingSecret(),
          })
          .select()
          .single();
        if (error) {
          if (error.code === '23505') {
            // Lost a race with a concurrent provision — return the winner.
            const winner = await findDeviceBySerialProd(table.supabase, serialNumber, '*');
            if (winner) {
              if (winner.owner_id) {
                return res.status(409).json({ success: false, message: 'Device already claimed.' });
              }
              device = winner;
              created = false;
            } else {
              throw error;
            }
          } else {
            throw error;
          }
        } else {
          device = inserted;
          created = true;
        }
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

// === POST /api/devices/:id/token — owner mints a fresh tracker token ===
// Authenticated recovery path for lost tracker tokens (replaces the old
// "re-pair with serial only" flow that enabled hijacking).
const refreshDeviceToken = async (req, res) => {
  try {
    if (req.user?.isDevice) {
      return res.status(403).json({ success: false, message: 'Devices cannot mint tokens' });
    }
    const { id } = req.params;
    const table = getTable('Device');
    let row;
    if (table.demo) {
      const found = table.store.findById(id);
      row = found ? await found.lean() : null;
    } else {
      const { data, error } = await table.supabase.select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      row = data;
    }
    if (!row) return res.status(404).json({ success: false, message: 'Device not found' });
    const device = dbRowToDevice(row);
    if (String(device.ownerId) !== String(req.user.uid)) {
      return res.status(403).json({ success: false, message: 'Forbidden — you do not own this device' });
    }
    const tokenSource = row;
    const accessToken = issueDeviceToken({
      _id: tokenSource.id || tokenSource._id,
      serialNumber: tokenSource.serial_number || tokenSource.serialNumber,
      pairingSecret: tokenSource.pairing_secret || tokenSource.pairingSecret,
    });
    return res.json({ success: true, deviceId: String(device._id), serialNumber: device.serialNumber, accessToken });
  } catch (error) {
    console.error('Error in refreshDeviceToken:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const claimDevice = async (req, res) => {
  try {
    if (req.user?.isDevice) {
      return res.status(403).json({ success: false, message: 'Devices cannot claim other devices' });
    }
    const { id } = req.params;
    const table = getTable('Device');
    const newSecret = generatePairingSecret();
    if (table.demo) {
      // Atomic compare-and-set: only claim when still ownerless. The demo
      // store runs in one thread so check-and-assign without awaits between
      // is atomic; findOneAndUpdate keeps that property.
      let claimed = await table.store.findOneAndUpdate(
        { _id: id, ownerId: null },
        { ownerId: req.user.uid, pairingSecret: newSecret },
        { new: true }
      );
      if (!claimed) {
        const found = table.store.findById(id);
        const existing = found ? await found.lean() : null;
        if (!existing) return res.status(404).json({ success: false, message: 'Device not found' });
        const existingOwner = existing.ownerId ?? existing.owner_id ?? null;
        if (existingOwner === undefined || existingOwner === null || existingOwner === 'null' || existingOwner === 'undefined') {
          // Legacy row stores undefined instead of null — claim it directly
          // (single-threaded, still safe for demo).
          await table.store.findByIdAndUpdate(id, { ownerId: req.user.uid, pairingSecret: newSecret });
          const updated = await table.store.findById(id).lean();
          const freshToken = issueDeviceToken({ _id: updated._id, serialNumber: updated.serialNumber, pairingSecret: newSecret });
          return res.json({ success: true, device: dbRowToDevice(updated), accessToken: freshToken });
        }
        return res.status(409).json({ success: false, message: 'Device already claimed' });
      }
      const freshToken = issueDeviceToken({ _id: claimed._id, serialNumber: claimed.serialNumber, pairingSecret: newSecret });
      return res.json({ success: true, device: dbRowToDevice(claimed), accessToken: freshToken });
    }
    // Supabase: atomic conditional update — 0 rows means already claimed.
    const { data: updated, error } = await table.supabase
      .update({ owner_id: req.user.uid, pairing_secret: newSecret })
      .eq('id', id)
      .is('owner_id', null)
      .select();
    if (error) throw error;
    if (!updated || updated.length === 0) {
      const { data: existing } = await table.supabase.select('id, owner_id').eq('id', id).maybeSingle();
      if (!existing) return res.status(404).json({ success: false, message: 'Device not found' });
      return res.status(409).json({ success: false, message: 'Device already claimed' });
    }
    const row0 = updated[0];
    const freshToken = issueDeviceToken({ _id: row0.id, serialNumber: row0.serial_number, pairingSecret: newSecret });
    return res.json({ success: true, device: dbRowToDevice(row0), accessToken: freshToken });
  } catch (error) {
    console.error('Error in claimDevice:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// === DELETE /api/devices/:id ===
const deleteDevice = async (req, res) => {
  try {
    if (req.user?.isDevice) {
      return res.status(403).json({ success: false, message: 'Devices cannot delete devices. Use a caregiver account.' });
    }
    const { id } = req.params;
    const table = getTable('Device');
    let ownershipRow;
    if (table.demo) {
      const found = table.store.findById(id);
      ownershipRow = found ? await found.lean() : null;
    } else {
      const { data } = await table.supabase.select('owner_id').eq('id', id).maybeSingle();
      ownershipRow = data;
    }
    if (!ownershipRow) return res.status(404).json({ success: false, message: 'Device not found' });
    const ownerId = ownershipRow.owner_id ?? ownershipRow.ownerId;
    if (!ownerId) {
      return res.status(403).json({ success: false, message: 'Device is unclaimed — claim it before deleting' });
    }
    if (String(ownerId) !== String(req.user.uid)) {
      return res.status(403).json({ success: false, message: 'Forbidden — you do not own this device' });
    }

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
  claimDevice,
  deleteDevice,
  refreshDeviceToken,
};
