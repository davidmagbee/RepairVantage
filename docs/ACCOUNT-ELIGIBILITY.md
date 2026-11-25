# Account eligibility and privacy operations

Owner decisions recorded 2026-11-24: general audience, not child-directed; minimum account age **18**; existing accounts must acknowledge the current rule. **US-only is the intended launch market, not an IP-based restriction.** Public service/contact brand is **RepairVantage**; approved privacy/deletion contact is **repairvantageadmin@gmail.com**. The owner reports no incorporated entity. Do not describe the brand as an LLC or claim that a trade name resolves every legal operator-disclosure requirement.

## Implemented boundary

[`ELIGIBILITY_POLICY`](../server/src/eligibility.ts) owns the minimum age, statement, version and market metadata. Login and registration both screen before showing email or Google actions: both sign-in methods can implicitly create accounts. Neutral numeric age entry creates a signed, HttpOnly, SameSite=Lax cookie; Secure is enabled in production. Exact age/DOB is not stored in the cookie or database by this feature. An adult declaration lasts ten minutes; an anonymous rejection lasts 24 hours and deters immediate Back/retry attempts. Clearing cookies can bypass that anonymous deterrent; this is not identity verification.

OTP send/verify and Google initiation require valid preflight at the server. Trusted OAuth server context carries the proof through redirects; client `additionalData` is not authority. The new-user hook checks proof again. Expired, altered, stale-policy and rejected proofs fail closed. Google ID-token enrollment is gated too.

After authentication, **both existing and new users** must explicitly accept the current statement before private GraphQL operations or workspace/invitation UI can proceed. Existing sessions are not grandfathered. Session reads, sign-out, public privacy information and signed-out Showcases remain accessible. Private API policy denial refreshes the client's policy without pretending the identity session expired.

The acknowledgment record contains user ID, exact statement, policy version, source and the first server-generated timestamp. A unique `(userId, policyVersion)` key makes repeat acceptance idempotent. New versions append records; old records are not rewritten by the acceptance endpoint. This is an application audit trail of self-declaration, not verified age or a tamper-proof legal record. Account deletion cascades acknowledgment records, so do not promise indefinite audit retention.

An under-age declaration made with a verified session also persists `User.eligibilityRestrictedAt`. This hold survives cookie removal, another browser, policy changes and repeated adult declarations; original acknowledgment rows remain intact. There is no public self-clear endpoint. An operator must verify any correction and assess a reported child-data case before an explicitly authorized account change. Do not automatically delete or clear a hold merely because someone emails an account name.

## Routes and migration

| Route | Behavior |
| --- | --- |
| `GET /api/eligibility/status` | Uncached policy plus current browser/account status; safe for anonymous callers. |
| `POST /api/eligibility/screen` | Neutral numeric age; origin/JSON/size/rate checks; signed preflight or rejection. |
| `POST /api/eligibility/acknowledgment` | Verified session, current version and literal acceptance; server selects the user and timestamp. |
| `/privacy` | Public factual notice and approved mail contact; not consent to a hidden set of terms. |

Apply both additive migrations before deploying this feature: `20261124163000_account_eligibility` and `20261124170000_account_eligibility_restriction`. They do not backfill acceptance. Verify runtime SELECT/INSERT/UPDATE privileges on the acknowledgment table and SELECT/UPDATE on User using the approved owner/default-grant procedure. Readiness checks the table and restriction column. Production UI source `472cd93` predates these changes; its release needs neither new migration.

Do not roll this feature back to code that omits the acknowledgment/restriction boundary after holds or records exist. A rollback must preserve the current restriction and access semantics; reverting UI alone is not a recovery plan.

## US market and later expansion

**Recommendation:** keep the current market scope without adding IP blocking solely because the app is small. No requirement for geoblocking was established in this project audit. IP location is not verified residence, and country metadata is not enforcement. EDPB guidance distinguishes mere website accessibility from EU establishment/targeting; it does not declare this service exempt from every non-US law. [EDPB territorial-scope guidance](https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_3_2018_territorial_scope_after_public_consultation_en_1.pdf).

To expand the intended market:

1. Record the chosen countries and assess operator identity, applicable notices/rights, provider transfers and actual retention/deletion practices for that scope. Keep the approved contact current.
2. Update `ELIGIBILITY_POLICY.market`, notice and acknowledgment-screen market copy together. These are currently US-specific; changing metadata alone does not alter access.
3. If eligibility rules or the declaration change, choose a new policy version, retain historical statements and require fresh acknowledgment. Do not silently reinterpret old acceptance.
4. If actual geographic enforcement is later selected, design a trusted ingress-country boundary covering API and auth paths, unknown/VPN/travel cases, existing accounts and an appeal path. Add tests. **Setting `geographicRestriction: true` alone does not implement filtering.**
5. Verify allowed/denied authentication and existing-account paths in isolated environments, update the deployment runbook, review the exact commit and release separately.

## Privacy and deletion requests

The owner intends data use for user projects and service/project summaries, with deletion on request. Public wording must disclose actual processing by Vercel, Neon, Resend and optional Google sign-in, plus user-directed invitations and Showcases. “Never shared externally” would conceal those flows. `/privacy` uses the approved contact and makes no unverified immediate-backup-erasure promise.

Operational procedure:

1. Receive requests at the approved mailbox. Verify ownership through an existing authenticated channel; never request passwords or OTP codes by email. Record the request's scope and outcome without duplicating project contents.
2. Identify affected account/project records, shared comments/memberships, invites addressed to the email, sessions, linked-provider tokens and email verification records. Project deletion alone is not account deletion; User→Project is not a cascading relation. Review effects on other users before modifying shared data.
3. Preview the exact records and validate a deletion sequence in disposable PostgreSQL. Obtain authorization for the identified production target before running destructive operations. Revoke relevant active access and remove requested data consistently with applicable obligations; do not claim a tested account-deletion tool exists yet.
4. Confirm hosting/database/email-provider log and backup retention before promising a deadline or total erasure. Document any retained records and reasons; provider backup retention and a tested end-to-end account-deletion workflow remain open work.
5. For known under-age reports, restrict access pending review and promptly assess data removal or other required handling. An 18+ acknowledgment cannot override actual knowledge. [FTC FAQ, H.6](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions).

No email was sent and no production account was deleted by this implementation.

## Manual QA

- Fresh browser: neutral age form precedes email/Google. Under-age rejection blocks retry. Missing/tampered/expired proof denies direct auth API requests.
- New OTP and Google users: authenticate, observe private API denial, accept the displayed statement, reload and verify access. Use separate verified accounts to check isolation and account linking.
- Existing session: no backfilled acceptance; current policy acknowledgment required. Repeat acceptance preserves the timestamp. A changed version requires an unchecked, fresh acceptance.
- Authenticated under-age declaration: omitting or replacing the eligibility cookie never clears the durable hold. Sign-out remains available; old audit rows remain unchanged.
- Public notice: open `/privacy` signed out and from login/acknowledgment, inspect contact and sharing language, and refresh the direct URL through the deployment wrapper.
- Expansion: current market is US and no geofilter exists. Test revised policy/country behavior before any future release; never infer technical restriction from notice wording.
