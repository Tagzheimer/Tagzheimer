# Changelog

## v4.0.0-beta — security + fairness release (pilot)

> **Beta status:** all suites green (backend 41, frontend 26, mobile 13), live-verified in demo mode + Chromium. Production Supabase paths need staging proof before mass rollout. See “Pilot checklist” below.

### Breaking changes (read before deploying over v3 data)

1. **Claim-gated pairing.** `POST /api/devices/pair` provisions *ownerless* rows only. Re-pairing an owned serial returns `409` (was `200` + fresh token). Trackers that relied on serial-only re-pair will stop recovering on their own.
2. **Claim rotates the pairing secret.** `POST /api/devices/:id/claim` is atomic and returns a fresh tracker token; pre-claim tokens are revoked. New recovery path: owner mints via `POST /api/devices/:id/token`.
3. **Ownership-enforced writes.** Location writes require ownership (user JWT must own the device; device JWT must match it). Cross-device writes that returned `201` now return `403`.
4. **Strict validation on creation; rejections where there were none.** Serial charset (`A-Za-z0-9-_`, 3–64) on pair/create; full telemetry ranges on every batch fix; future timestamps `400`; `history?limit` strict `1..500`; oversize bodies `413` (was `500`).
5. **Rate limits restructured.** General `600`/IP, ingest backstop `300`/IP, new per-device `60`/15min (post-auth). Requires `TRUST_PROXY` to match proxy hops — without it all clients share one bucket.
6. **No mock-data fallback.** Outages render empty + error + retry; `/d/:id` is a live lookup. Online status is computed from `lastSeen ≤ 15min`.

### Migration (existing v3 deployment with real rows)

1. Run the read-only blocks in `backend/supabase/audit.sql` (legacy serials, case-variant dupes, out-of-range telemetry, future fixes, ownerless-with-fixes). Old rows keep working — lookup/write paths stay lenient — but case-collisions need manual merge.
2. Set `JWT_SECRET` (fails closed now — no dev fallback in prod) and `TRUST_PROXY` (`1` for Fly/Render/nginx, `2` behind Cloudflare → Fly).
3. Deploy backend → frontend. Smoke-test: login, device list, `/d/:id`, map, no console errors.
4. Re-provision one tracker end-to-end (pair → claim → mint → live fix), then roll the fleet. Currently-claimed trackers keep reporting until re-claimed — no flag day, but rotate deliberately.
5. Pilot 1–2 weeks watching `429` rate, `pair 409` rate, and offline-age accuracy.

### Pilot checklist

- [ ] `audit.sql` clean (or accepted)
- [ ] Staging 16-attack matrix green against real Supabase
- [ ] One physical tracker re-provisioned end-to-end
- [ ] `TRUST_PROXY` verified (no network-wide `429` under light use)
- [ ] Mobile background/kill/reboot road-tested on a real device
- [ ] ESP32 flashed and reporting from hardware
