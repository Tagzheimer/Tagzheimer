/**
 * Serial-number lookup helpers shared by device + location controllers.
 *
 * Production reality: the DB already holds real serials minted before any
 * charset rule existed, possibly including case variants of each other
 * (Postgres `unique` is case-sensitive). These helpers therefore:
 *
 *   1. Try an exact `eq` match first — the fast, unambiguous path that can
 *      never confuse two case-variant rows.
 *   2. Fall back to a bounded `ilike` + JS lower-case match so lookups keep
 *      working regardless of client casing.
 *   3. Never use `ilike().maybeSingle()`: with case-variant duplicates in
 *      the table, PostgREST answers 406 ("more than one row"), which would
 *      surface as a spurious 500. The bounded `limit()` + JS pick degrades
 *      to "first lower-match" instead of erroring.
 *
 * For single-row reads with true case-collisions (two rows differing only
 * by case), the exact-case row wins; otherwise the first lower-match wins.
 * Run `supabase/audit.sql` to find such collisions and clean them manually.
 * Duplicate *detection* (create/pair) treats any lower-match as a conflict
 * (409) — the safe direction: it blocks new dupes without bricking reads.
 */

function normalizeSerial(s) {
  return String(s ?? '').trim();
}

function serialEquals(a, b) {
  return normalizeSerial(a).toLowerCase() === normalizeSerial(b).toLowerCase();
}

/**
 * Find one device row by serial on a Supabase table handle
 * (`supabase.from('devices')`). Returns the row or null. Never throws on
 * multi-row case collisions.
 */
async function findDeviceBySerialProd(supabaseTable, serial, columns = '*') {
  const clean = normalizeSerial(serial);
  if (!clean) return null;

  // 1. Exact match — unambiguous even with case-variant dupes present.
  const { data: exact, error: exactErr } = await supabaseTable
    .select(columns)
    .eq('serial_number', clean)
    .maybeSingle();
  if (exactErr) throw exactErr;
  if (exact) return exact;

  // 2. Case-insensitive fallback for clients that differ in casing.
  const { data: candidates, error: fuzzyErr } = await supabaseTable
    .select(columns)
    .ilike('serial_number', clean)
    .limit(5);
  if (fuzzyErr) throw fuzzyErr;
  const matches = (candidates || []).filter((r) =>
    serialEquals(r.serial_number, clean)
  );
  return matches[0] || null;
}

/**
 * True when ANY case-variant of `serial` exists (for create/pair duplicate
 * detection). Bounded query, safe against multi-row collisions.
 */
async function serialTakenProd(supabaseTable, serial) {
  const clean = normalizeSerial(serial);
  if (!clean) return false;
  const { data, error } = await supabaseTable
    .select('id, serial_number')
    .ilike('serial_number', clean)
    .limit(5);
  if (error) throw error;
  return (data || []).some((r) => serialEquals(r.serial_number, clean));
}

module.exports = {
  normalizeSerial,
  serialEquals,
  findDeviceBySerialProd,
  serialTakenProd,
};
