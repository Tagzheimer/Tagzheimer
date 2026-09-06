-- ===========================================================================
-- Tagzheimer — pre-ship PROD DATA AUDIT (read-only, safe to run anytime)
-- ===========================================================================
-- Run each block in Supabase SQL Editor BEFORE deploying the hardened
-- backend against a database with real rows. Every query below is SELECT-
-- only. Fix the flagged rows (or accept them — the backend now tolerates
-- all of these shapes) before you ship.
--
-- Why this exists: the hardened backend enforces strict rules on CREATION
-- (serial charset, notes length) but stays lenient on LOOKUP/WRITE paths
-- precisely so old rows keep working. This audit tells you how much legacy
-- shape you actually have.
-- ===========================================================================

-- 1. Serials that would be REJECTED for new devices (charset allowlist:
--    A-Za-z0-9, dash, underscore; must start/end alphanumeric).
--    These rows keep working for lookup + location writes. Only fix if you
--    want all serials clean (rename to a conforming serial).
SELECT id, serial_number, owner_id, created_at
FROM public.devices
WHERE serial_number !~ '^[A-Za-z0-9][A-Za-z0-9\-_]*[A-Za-z0-9]$'
   OR length(serial_number) < 3 OR length(serial_number) > 64;

-- 2. Case-variant duplicates ('TAG-001' vs 'tag-001'). Postgres `unique`
--    is case-sensitive so both can exist; the backend picks exact-case
--    first, then first lower-match. Merge these manually.
SELECT lower(serial_number) AS folded, count(*),
       array_agg(serial_number) AS variants,
       array_agg(id) AS ids
FROM public.devices
GROUP BY lower(serial_number)
HAVING count(*) > 1;

-- 3. Devices with absurd battery (outside 0..100). Reads render as-is;
--    writes are now validated. Fix with: UPDATE devices SET battery = ...
SELECT id, serial_number, battery, last_seen
FROM public.devices
WHERE battery IS NULL OR battery < 0 OR battery > 100;

-- 4. Location rows with out-of-range telemetry. Reads pass through;
--    new writes are validated. Clean only if dashboards look wrong.
SELECT id, device_id, latitude, longitude, battery, satellites, speed, timestamp
FROM public.locations
WHERE latitude < -90 OR latitude > 90
   OR longitude < -180 OR longitude > 180
   OR (battery IS NOT NULL AND (battery < 0 OR battery > 100))
   OR (satellites IS NOT NULL AND (satellites < 0 OR satellites > 50))
LIMIT 100;

-- 5. Future-dated fixes (would sort as "latest" forever). New writes are
--    rejected; old ones may need their timestamp corrected.
SELECT id, device_id, timestamp
FROM public.locations
WHERE timestamp > now() + interval '5 minutes'
ORDER BY timestamp DESC
LIMIT 100;

-- 6. Ownerless devices WITH locations (trackers sending before claim).
--    Decide per row: claim to the right caregiver, or delete if junk.
SELECT d.id, d.serial_number, d.created_at, count(l.id) AS fixes,
       max(l.timestamp) AS latest_fix
FROM public.devices d
LEFT JOIN public.locations l ON l.device_id = d.id
WHERE d.owner_id IS NULL
GROUP BY d.id, d.serial_number, d.created_at
ORDER BY latest_fix DESC NULLS LAST;

-- 7. Over-long notes (new limit 2000 chars). Reads are unaffected.
SELECT id, serial_number, length(notes) AS notes_len
FROM public.devices
WHERE length(notes) > 2000;

-- 8. Row counts / sanity.
SELECT (SELECT count(*) FROM public.devices) AS devices,
       (SELECT count(*) FROM public.locations) AS locations,
       (SELECT count(*) FROM public.devices WHERE owner_id IS NULL) AS unclaimed_devices;
