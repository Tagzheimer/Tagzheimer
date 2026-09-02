const { getServiceClient, isSupabaseConfigured } = require('../config/supabase');
const { isDemoMode, getDemoStore } = require('../config/demoMode');

// Logical model name → physical Postgres table (demo store uses model names)
const TABLE_NAMES = { Device: 'devices', Location: 'locations', User: 'profiles' };

function getTable(name) {
  if (isDemoMode() || !isSupabaseConfigured()) {
    return { demo: true, store: getDemoStore()[name] };
  }
  return { demo: false, supabase: getServiceClient().from(TABLE_NAMES[name] || name) };
}

function _camelToDeviceId(id) {
  return id;
}

/**
 * Resolve a device by (in priority order):
 *   1. body.deviceId
 *   2. body.serialNumber
 *   3. the caller's own device JWT (firmware/mobile never repeat their ID)
 * Returns the device row (snake_case) or null.
 */
async function resolveDevice(req) {
  const body = req.body || {};
  const table = getTable('Device');
  if (body.deviceId) {
    if (table.demo) {
      const found = table.store.findById(body.deviceId);
      return found ? await found.lean() : null;
    }
    const { data } = await table.supabase.select('*').eq('id', body.deviceId).maybeSingle();
    return data;
  }
  if (body.serialNumber) {
    if (table.demo) {
      return await table.store.findOne({ serialNumber: body.serialNumber });
    }
    const { data } = await table.supabase.select('*').eq('serial_number', body.serialNumber).maybeSingle();
    return data;
  }
  if (req.user?.isDevice && req.user.deviceId) {
    if (table.demo) {
      const found = table.store.findById(req.user.deviceId);
      return found ? await found.lean() : null;
    }
    const { data } = await table.supabase.select('*').eq('id', req.user.deviceId).maybeSingle();
    return data;
  }
  return null;
}

// === POST /api/location/update ===
const updateLocation = async (req, res) => {
  try {
    const device = await resolveDevice(req);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found. Pair it first via POST /api/devices/pair',
      });
    }

    const deviceId = device.id || device._id;
    const serialNumber = device.serial_number || device.serialNumber;

    // Authorization check for device JWT callers
    if (req.user?.isDevice && String(req.user.deviceId) !== String(deviceId)) {
      return res.status(403).json({
        success: false,
        message: 'Token is not valid for this device',
      });
    }

    const meta = req.body.meta || {};
    const battery = meta.battery ?? req.body.battery ?? null;
    const source = meta.source ?? req.body.source ?? 'unknown';

    const table = getTable('Location');

    let location;
    if (table.demo) {
      location = await table.store.create({
        deviceId,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        satellites: meta.satellites ?? null,
        hdop: meta.hdop ?? null,
        altitude: meta.altitude ?? null,
        speed: meta.speed ?? null,
        battery,
        source,
        raw: req.body.meta || null,
      });
    } else {
      const { data, error } = await table.supabase.insert({
        device_id: deviceId,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        satellites: meta.satellites ?? null,
        hdop: meta.hdop ?? null,
        altitude: meta.altitude ?? null,
        speed: meta.speed ?? null,
        battery,
        source,
        raw: req.body.meta || null,
      }).select().single();
      if (error) throw error;
      location = data;
    }

    // Update device status + lastSeen + last battery
    const deviceTable = getTable('Device');
    const deviceUpdate = {
      status: 'online',
      last_seen: new Date().toISOString(),
    };
    if (battery !== null) deviceUpdate.battery = battery;

    if (deviceTable.demo) {
      await deviceTable.store.findByIdAndUpdate(deviceId, {
        status: 'online',
        lastSeen: new Date(),
        ...(battery !== null ? { battery } : {}),
      });
    } else {
      await deviceTable.supabase.update(deviceUpdate).eq('id', deviceId);
    }

    return res.status(201).json({
      success: true,
      location: {
        id: location.id || location._id,
        deviceId: String(deviceId),
        serialNumber,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp,
      },
    });
  } catch (error) {
    console.error('Error in updateLocation:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// === POST /api/location/batch ===
const batchUpdate = async (req, res) => {
  try {
    const device = await resolveDevice(req);
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }
    const deviceId = device.id || device._id;

    if (req.user?.isDevice && String(req.user.deviceId) !== String(deviceId)) {
      return res.status(403).json({ success: false, message: 'Token not valid for this device' });
    }

    const fixes = (req.body.fixes || []).map((f) => {
      const meta = f.meta || {};
      return {
        device_id: deviceId,
        latitude: f.latitude,
        longitude: f.longitude,
        satellites: meta.satellites ?? null,
        hdop: meta.hdop ?? null,
        altitude: meta.altitude ?? null,
        speed: meta.speed ?? null,
        battery: meta.battery ?? null,
        source: meta.source ?? 'mobile',
        raw: meta || null,
        timestamp: f.timestamp ? new Date(f.timestamp).toISOString() : new Date().toISOString(),
      };
    });

    const table = getTable('Location');
    let inserted;
    if (table.demo) {
      // Demo store: insertMany
      inserted = await table.store.insertMany(fixes.map((f) => ({
        deviceId: f.device_id,
        latitude: f.latitude,
        longitude: f.longitude,
        satellites: f.satellites,
        hdop: f.hdop,
        altitude: f.altitude,
        speed: f.speed,
        battery: f.battery,
        source: f.source,
        raw: f.raw,
        timestamp: new Date(f.timestamp),
      })));
    } else {
      const { data, error } = await table.supabase.insert(fixes).select();
      if (error) throw error;
      inserted = data;
    }

    // Mark device online; adopt battery from the most recent fix that has one
    const latestBattery = [...fixes]
      .reverse()
      .find((f) => f.battery !== null && f.battery !== undefined)?.battery ?? null;

    const deviceTable = getTable('Device');
    if (deviceTable.demo) {
      await deviceTable.store.findByIdAndUpdate(deviceId, {
        status: 'online',
        lastSeen: new Date(),
        ...(latestBattery !== null ? { battery: latestBattery } : {}),
      });
    } else {
      await deviceTable.supabase.update({
        status: 'online',
        last_seen: new Date().toISOString(),
        ...(latestBattery !== null ? { battery: latestBattery } : {}),
      }).eq('id', deviceId);
    }

    return res.status(201).json({
      success: true,
      inserted: Array.isArray(inserted) ? inserted.length : 1,
    });
  } catch (error) {
    console.error('Error in batchUpdate:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

async function assertDeviceOwnership(deviceId, user) {
  if (user?.isDevice) {
    if (String(user.deviceId) !== String(deviceId)) {
      const err = new Error('Token is not valid for this device');
      err.status = 403;
      throw err;
    }
    return;
  }
  const deviceTable = getTable('Device');
  let device = null;
  if (deviceTable.demo) {
    const found = deviceTable.store.findById(deviceId);
    device = found ? await found.lean() : null;
  } else {
    const { data } = await deviceTable.supabase.select('id, owner_id').eq('id', deviceId).maybeSingle();
    device = data;
  }
  if (!device) {
    const err = new Error('Device not found');
    err.status = 404;
    throw err;
  }
  const ownerId = device.owner_id ?? device.ownerId;
  if (String(ownerId) !== String(user.uid)) {
    const err = new Error('Forbidden — you do not own this device');
    err.status = 403;
    throw err;
  }
}

// === GET /api/location/:deviceId — latest fix (legacy contract) ===
const getCurrentLocation = async (req, res) => {
  try {
    const { deviceId } = req.params;
    await assertDeviceOwnership(deviceId, req.user);
    const table = getTable('Location');

    let row;
    if (table.demo) {
      const matches = await table.store
        .find({ deviceId })
        .sort()
        .lean();
      row = matches[0] || null;
    } else {
      const { data, error } = await table.supabase
        .select('*')
        .eq('device_id', deviceId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      row = data;
    }

    if (!row) {
      return res.status(404).json({ success: false, message: 'No location data found' });
    }

    return res.json({
      latitude: row.latitude,
      longitude: row.longitude,
      timestamp: row.timestamp,
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    console.error('Error in getCurrentLocation:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// === GET /api/location/:deviceId/history?limit=N ===
const getLocationHistory = async (req, res) => {
  try {
    const { deviceId } = req.params;
    await assertDeviceOwnership(deviceId, req.user);
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 500);

    const table = getTable('Location');

    let rows;
    if (table.demo) {
      rows = await table.store.find({ deviceId }).sort().lean();
      rows = rows.slice(0, limit);
    } else {
      const { data, error } = await table.supabase
        .select('*')
        .eq('device_id', deviceId)
        .order('timestamp', { ascending: false })
        .limit(limit);
      if (error) throw error;
      rows = data || [];
    }

    return res.json({
      success: true,
      count: rows.length,
      locations: rows.map((l) => ({
        id: l.id,
        latitude: l.latitude,
        longitude: l.longitude,
        timestamp: l.timestamp,
        satellites: l.satellites ?? null,
        hdop: l.hdop ?? null,
        altitude: l.altitude ?? null,
        speed: l.speed ?? null,
        battery: l.battery ?? null,
        source: l.source ?? 'unknown',
      })),
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    console.error('Error in getLocationHistory:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { updateLocation, batchUpdate, getCurrentLocation, getLocationHistory };
