# Hundstallet — Your growing shelter

Independent local hackathon prototype. The donor experience contains a growing virtual shelter, donation balances, spending statistics and verifiable transactions. Staff upload receipts, review purchased products, allocate them to donor portfolios and attach care photos.

Developed in an independent worktree and integrated into `main`. Publishing the repository does not configure a production deployment.

## Run locally

Requires Node.js 22.13+.

```sh
npm ci
npm run db:local
npm run dev:isolated
```

- Donor: http://127.0.0.1:3001/
- Staff: http://127.0.0.1:3001/staff
- Independent proof checker: http://127.0.0.1:3001/verify

The original checkout can remain on port 3000. Financial state uses project-local D1/SQLite and uploads use local R2; preserve `.wrangler/state/` to retain this demo. There is no payment capture or production authentication.

On macOS, `npm run ocr:build` prepares Apple Vision/PDFKit receipt reading. Images/PDFs stay local. Staff can also upload text, paste extracted text or enter product lines. OCR suggestions always require review.

## Shelter progression

Visual companions unlock at cumulative **total donated** thresholds: **50, 100, 150, 200, 300, 400, 500, 700, 1,000, 1,250, 1,500, 1,750, 2,000 SEK**, then another 250 SEK per milestone, up to the 41 individual profiles in the saved public directory. Allocation alone moves money from pending to used; it does not change total donations or unlock companions again. Selection is deterministic per donor: reloads and additional donations preserve the existing prefix. Groups are excluded.

These are game progression thresholds, not estimates of dog-care costs or claims about individual beneficiaries.

The garden remains at the map centre. First unlocks occur at these companion counts:

| Area | Companions | Door direction |
|---|---:|---|
| Kennel | 1 | Right |
| Kitchen | 2 | Right |
| Water | 3 | Top / right |
| Playground | 4 | Left / right |
| Wellbeing | 6 | Top / right |
| Care studio | 8 | Left |
| Sport & pool | 10 | Top / left / right |

All eight families, including the garden, have five generated upgrades: **40 transparent assets**. Each family's entrances stay in the same directions across upgrades. The garden has four exits. Original PNGs, prompts and provenance are in `output/imagegen/shelter-upgrades-v1/`; trimmed, lightweight WebP copies are in `public/care/upgrades/`.

Total donations, including pending funds, determine current upgrades. An optional hypothetical gift previews additional companions and upgrades. Locked areas disclose the additional donation needed. Preview funds never alter financial balances.

Dogs follow connected routes, hop while travelling and dwell in areas. Stockholm wall time controls day/night and independent 3–4-hour daytime naps. All dogs sleep 21:00–07:00. Sprite movement uses animation-frame transforms; floating Z letters animate during sleep. Reduced motion disables travel and keeps a static sleep indicator. The map supports drag, zoom, fit and arrow-key panning from its zoom controls.

Random virtual companions are separate from care evidence. Staff photos identify real beneficiary dogs for their linked purchased products; virtual selection never allocates money to a dog.

## Staff accounting and evidence

1. Upload up to ten receipts/invoices: JPEG, PNG, WebP, PDF or text, up to 12 MB each.
2. Review supplier, reference, date, quantities, categories and final unit prices. Different prices stay on separate lines; totals reconcile exactly in integer öre.
3. Save pending, then review and confirm allocation. Each purchased unit goes whole to one donor. The algorithm balances batch spending, tries alternative feasible assignments and never overdrafts. An item that cannot fit any donor balance stays pending.
4. Attach a care photo directly to a product and select the dogs. Transaction and category are inherited. Photos never create additional spending.
5. Verify the receipt, export its proof or anchor its fingerprint on Sepolia.

Previously allocated products never change owners because a later gift or receipt arrives. Duplicate supplier/reference or attached document fingerprints are rejected. Corrections return funds once and remain visible in donor history, with the original record and corrective proof preserved.

Commands are idempotent and revision checks reject conflicting concurrent writes. Monetary state is shared across donor/staff tabs, which refresh every three seconds.

## Verification boundaries

Version 2 proofs cover supplier, receipt reference/date, provenance, document fingerprint, product descriptions/prices/categories and hashed donor allocations. The transaction details opened through **Verified by blockchain** compare the currently displayed receipt to this canonical snapshot. Exported proofs and documents can also be checked locally on `/verify`.

Unanchored transaction buttons include **Demo · not yet anchored**; the label is not a claim of confirmed network inclusion.

Imported spreadsheet rows can receive a baseline snapshot through **Register imported records**. Their missing originals and unitemized contents remain explicit. Re-registering unchanged snapshots preserves previous proofs and anchors.

Staff can submit a zero-value wallet transaction containing only a fingerprint on the **Sepolia testnet**. Confirmation checks the network, successful receipt, matching transaction/block hashes and exact fingerprint; repeated confirmation is safe. Donors can recheck a saved network transaction. No wallet transaction was sent during development.

A fingerprint establishes integrity; network inclusion supplies a separately checkable record. Neither proves a purchase occurred, and this local prototype does not authenticate a Hundstallet staff signer.

## Source data

`Fake Transactions.xlsx` remains unchanged: 100 rows, original date-only precision, categories and **4,783 SEK** of expenses. It contains no incoming donations, item breakdowns, receipt documents or beneficiary identities. Its balancing opening gift is explicitly a demo fixture.

Public dog profiles are a **7 September 2026 snapshot**, with original photo ownership and official profile links retained. Images uploaded for care are resized and camera metadata is removed; original receipt bytes are preserved.

## Validation

```sh
npm test
npm run typecheck
npm run lint:platform
npm run build
```

The new growth tests cover exact thresholds, total-donation milestones and hypothetical previews, stable selection, reversals, all 40 assets, route entrances, whole-unit assignment including 10,000-unit batches, duplicate documents, current-receipt tampering, repeat-safe snapshots and invalid blockchain responses.

HTTP integration must use a separate database and port. Vinext permits one dev server per directory: stop the preview first, or run a temporary source copy with its own state.

```sh
npx wrangler d1 migrations apply CARE_DB --local --config wrangler.local.jsonc --persist-to .local/qa-state
CARE_STATE_DIR=.local/qa-state npx vinext dev --host 127.0.0.1 --port 3002
# In another terminal:
CARE_QA_URL=http://127.0.0.1:3002 npm run test:api
```

Development QA also exercised actual browser flows on desktop and a 390 px viewport: receipt review/allocation, photo upload with two dogs, donor verification, export/document comparison, correction history, donation previews, pause across a night boundary and reduced motion.

The main implementation is in `components/platform/`, `lib/platform/`, `app/api/platform/`, `app/shelter-growth.css` and `hooks/use-care-workspace.ts`. Legacy models remain for regression/reference; collaborative and photo-feed features are absent from the active interface.

See [the focused demo](docs/hackathon-demo.md). Before production, Hundstallet must approve the accounting rules; the service needs authenticated roles, authorized payments/reconciliation, privacy/retention, backup/recovery and a reviewed deployment. No fundraising uplift or production readiness is claimed.
