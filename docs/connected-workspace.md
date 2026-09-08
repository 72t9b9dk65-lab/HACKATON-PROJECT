# Connected donor and staff demo

The donor website and employee portal have separate origins and use the same D1 ledger and R2 file storage. This implementation remains a local demo until the organization configures real domains, identity providers and its staff allowlist. No payment processor or bank account is connected.

## Local use

- Donor website: http://127.0.0.1:3001/
- Staff portal: http://127.0.0.1:3002/
- Run `npm ci` and `npm run db:local` on a fresh checkout, then `npm run dev` (or `npm run dev:isolated`). One command starts both sites; Ctrl+C stops both. The staff process proxies its origin into the same Worker; it does not create a second database. No extra staff dependencies are needed.
- For manual startup, use `npm run dev:donor` and `npm run dev:staff` in separate terminals instead of the combined command. With the combined command, `CARE_DONOR_PORT` and `CARE_STAFF_PORT` can select distinct local ports; the default origin settings follow those ports. Do not run both startup methods simultaneously.
- Open `/signin` on the donor website to create a named demo donor. Its balance starts at zero. Its account immediately appears in the staff donor list. The original anonymous donor preview remains available in demo mode.
- Open the staff origin and choose **Open staff demo**. This is explicitly a local demonstration, not employee identity verification. The staff page is not served at `/staff` on the donor origin.
- Google and Apple buttons are unavailable until their configuration exists. Demo sign-in never contacts either provider.

### Walkthrough

1. Create a donor account with a sample name and email.
2. In the staff portal, choose **Record received donation**, select that donor and enter the amount, received date, payment method and unique reference. The reference prevents accidental duplicate credits. In a real installation staff must reconcile this with the organization’s actual payment records.
3. The donor receives available balance and visual companions based on total donations.
4. Upload a receipt or invoice, check its itemized products, quantities and exact prices. The receipt stays pending until allocation.
5. Choose **Distribute products to donors**. Review each donor’s remaining balance and area upgrades. Confirm once. Whole products are assigned equitably among available balances. Products are not divided into equal money shares. If no complete whole-product allocation fits the balances, the operation stops without debiting anyone.
6. Both sites refresh from the same ledger. Spending unlocks area upgrades. The contribution total and number of companions do not change when funds move from pending to spent.
7. Add a product photo and select the dogs that used it. Only relevant donors see those photos. The original receipt remains private to employees; donors can verify the corresponding receipt fingerprint and allocation evidence.
8. Corrections return funds and recalculate upgrades. The previous record and correction remain in the staff audit history.

## Future real connection

Configure these values as server-side secrets/runtime variables. Do not place secrets in client variables, source control or chat. `.env.example` lists the keys; local Worker overrides belong in an ignored `.dev.vars` file. Hosted runtime values are configured in the hosting provider.

| Key | Purpose |
| --- | --- |
| `CARE_MODE` | `live` in a real installation; `demo` is accepted only on loopback addresses |
| `CARE_PUBLIC_ORIGIN` | Exact HTTPS origin of the donor website, without trailing slash |
| `CARE_STAFF_ORIGIN` | Different exact HTTPS origin of the employee website |
| `CARE_STAFF_EMAILS` | Comma-separated, explicitly authorized employee emails; empty means nobody can access staff |
| `GOOGLE_CLIENT_ID` | OAuth web application client ID |
| `GOOGLE_CLIENT_SECRET` | Google server-side client secret |
| `APPLE_CLIENT_ID` | Sign in with Apple Services ID |
| `APPLE_TEAM_ID` | Apple Developer team ID |
| `APPLE_KEY_ID` | Sign in with Apple signing key ID |
| `APPLE_PRIVATE_KEY` | Server-only P8 private key, newlines or escaped `\n` supported |

Route both domains to the **same deployed Worker and bindings** so identities, balances and files are shared. DNS/domain provisioning and OAuth provider setup have not been performed. The local proxy is development-only; do not expose it as a production server.

Register these exact callback paths for both configured origins:

- Google: `/api/auth/google/callback`
- Apple: `/api/auth/apple/callback`

The Google web client must authorize the exact redirect URLs. Apple requires a configured HTTPS domain/return URL; localhost HTTP is not a supported Apple callback. Register the web Services ID with a primary App ID and Sign in with Apple key. Configure both donor and staff return URLs.

The implementation exchanges authorization codes on the server and verifies the provider JWT signature, issuer, audience, expiration, issued time, nonce and verified email. Google uses PKCE; one-time flow state is bound to a browser cookie and expires after ten minutes. Sessions contain random tokens, stored hashed in D1, scoped to an exact origin, expiring after eight hours. HTTPS session cookies are HttpOnly, Secure and host-only. Writes require the matching Origin header. Staff authorization is checked on every request, including uploads and blockchain anchoring. Removing an email from the allowlist or disabling the corresponding `care_users` row revokes access on the next request.

Provider subject IDs identify accounts. Google and Apple accounts are not silently merged by matching email; account linking would need an explicit authenticated flow. Apple private-relay emails must be the emails configured for an employee if Apple is used for staff access.

Live mode uses a separate `live` workspace and does not import fake transactions or sample balances. Existing `local` demo records are preserved. New live donors start at zero. Donor APIs return only their own identity, gifts, associated receipts, relevant photos and proofs; other donor names/emails and internal audit records are excluded. Other contributions are represented by the same opaque fingerprints already included in the signed receipt evidence.

The received-donation operation is a staff-confirmed ledger entry, **not** a bank integration or online payment. To automate incoming payments, connect the organization’s chosen provider through a verified server webhook and reuse the unique payment reference/account attribution workflow. The public donation link alone cannot report a successful payment back to this app.

Sepolia blockchain anchoring remains optional and uses test ETH. A fingerprint verifies integrity and network inclusion, not the factual truth of a receipt or care event.

Provider references: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [Google token validation](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), [Sign in with Apple REST API](https://developer.apple.com/documentation/signinwithapplerestapi).

## Validation

`npm test`, `npm run typecheck`, `npm run lint:platform`, `npm run build`.

The connected API test uses disposable demo records on donor port 3011 and staff port 3012 with an independent `CARE_STATE_DIR`. Apply migrations with `wrangler d1 migrations apply CARE_DB --local --config wrangler.local.jsonc --persist-to <that directory>`. Start the donor server in an isolated checkout with `CARE_PUBLIC_ORIGIN=http://127.0.0.1:3011`, `CARE_STAFF_ORIGIN=http://127.0.0.1:3012`, `CARE_MODE=demo`; start the proxy with `CARE_DONOR_PORT=3011 CARE_STAFF_PORT=3012`. Then run `CARE_CONNECTED_QA=1 npm run test:connected`. Never run this against the presentation database.

Google/Apple end-to-end sign-in still requires organization-owned credentials and real callback domains. No successful provider login is claimed by the local tests.
