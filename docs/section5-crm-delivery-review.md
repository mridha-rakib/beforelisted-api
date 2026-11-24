# CRM registration outbox operations

Each new registration has one `renter-registration:<user id>` event. Agent referrals wait for verified email; admin referrals become ready or skipped in the registration transaction. The CRM recipient is snapshotted at eligibility. Existing accounts and historical renter attempt fields are not replayed or deleted.

The application attempts dispatch after commit. When `NODE_ENV=production` or `ENABLE_SCHEDULED_JOBS=true`, bootstrap starts a sweep immediately and every minute, processing up to 50 never-claimed ready events. Readiness, claim and final outcome writes are atomic; a majority-acknowledged claim precedes the single provider request. Invalid or missing registration data is moved from `ready` to `review` before a claim. A transient lookup failure leaves the event `ready` for a later sweep. A claimed event is never automatically resent.

## Operator review

Use authorized read-only access to filter the outbox collection by state, creation/attempt timestamps and sanitized error category. Restrict access to renter IDs and recipient snapshots; do not put names, phone numbers, email addresses, provider response bodies or tokens into tickets or logs. Review old ready events as well as `review`, `pending`, `uncertain`, `failed` and `suppressed` events.

- `review` / `invalid_registration_data`: no provider request was made and no claim was taken. Investigate the source data through authorized tools; do not invent a name or phone number.
- `pending`: the process may have stopped before or after sending. Treat provider acceptance as unknown, including when no message ID exists. Do not infer non-delivery from elapsed time.
- `uncertain`: the provider request had an ambiguous outcome. Consult authorized provider records and correlate by available event, time and message ID evidence; absence of an ID does not prove non-delivery.
- `failed`: the provider returned a definitive rejection. Identify and correct its cause through authorized channels.
- `suppressed`: sandbox mode made no provider request. Do not treat this as delivered.
- `accepted`: the provider accepted the request and its message ID is retained; acceptance does not prove final inbox delivery.

Record the evidence and decision in the approved operational system. Do not edit state, clear a claim, or resend automatically; reconciliation and any resend require an explicitly authorized operational decision. In particular, never blindly replay pending or uncertain events. Historical `crmRegistrationAttemptedAt` data remains in MongoDB but is not used as a claim mechanism or automatically replayed.

Transactions require MongoDB replica-set or sharded-cluster support. Verify topology, majority durability, the user/renter uniqueness indexes, scheduled-job operation, monitoring and the operator procedure before activation. If scheduled jobs are disabled or no process is running, ready records remain stored until a recovery-enabled process runs. An interruption after registration commits but before OTP email dispatch requires the existing OTP resend flow.
