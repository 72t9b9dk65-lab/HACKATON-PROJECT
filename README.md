# Hundstallet — A second chance, together

An independent, local hackathon prototype connecting a personal virtual shelter to the everyday work behind a dog's second chance.

**Donor:** give → follow the funded care → meet the real dog → keep their story.

**Staff:** read a receipt → check its products → allocate → photo + dogs → publish.

This branch is an independent worktree. Nothing is pushed or deployed. Payments and external staff connections are not enabled.

## Open the local platform

Requires Node.js 22.13 or later. The original project can keep running on port 3000; this copy uses **3001** and its own data directory.

```sh
npm ci
npm run db:local
npm run dev:isolated
```

- Donor shelter: http://127.0.0.1:3001/
- Staff workspace: http://127.0.0.1:3001/staff
- Shelter map: http://127.0.0.1:3001/explore
- Independent record checker: http://127.0.0.1:3001/verify

The macOS and Windows **Open in browser** launchers install missing dependencies, apply local migrations, and open the app. Keep the terminal open. Migration commands are explicitly local and safe to repeat.

On macOS, receipt images are read by Apple Vision and PDFs by PDFKit, with no document sent to an external OCR service. The first image may take longer while the Swift helper compiles. To prepare it before a presentation:

```sh
npm run ocr:build
```

On other operating systems, staff can upload the document and paste its text or enter its product lines. No external OCR key is required. The image/PDF reader is a local development middleware, not a deployed Worker feature.

## What is implemented

### Personal shelter

- Real Stockholm date and clock, day/night styling, pause and reduced-motion support. Only a published photo sends a dog to a care station; the photo stays live for one or two hours, then remains in the dog's journey.
- Permanent companions require a positive contribution to a funded product and a published update identifying that dog. A donation alone never claims that a dog received care.
- Real portraits, pixel avatars, official profile links, following without donating, a photo timeline, and the contributor's care basket. Homecoming milestones move dogs into a lasting **Home at last** section.
- Custom gifts, three official care examples and one-time/monthly forecasts. Faded dogs appear only when a donor explicitly requests a preview. The collapsed daily forecast accumulates monthly care capacity, keeps unspent remainders and avoids presenting repeated care as new unique recipients.
- Available/used balances, category and dog spending, receipt details, original documents, and photo evidence. Original workbook records without beneficiary details remain explicitly unattributed.
- A shared care goal, a copyable local invitation link, participation keepsakes, and official routes for real giving, adoption, fostering and fundraising. These badges have no financial value.
- All 43 public directory listings remain explorable on the existing Sweden map. Group listings do not masquerade as individual supported dogs.

### Staff workspace

- **Today** prioritizes pending allocations and funded items missing a photo. **Receipts & products**, **Supporters**, and **Stories & calendar** expose the detail when needed.
- Upload up to ten receipts in a queue; supported documents are JPEG, PNG, WebP, PDF and text, up to 12 MB each. OCR proposes fields; staff must check supplier, reference, date, categories, quantities and final unit prices.
- Receipt rows expand into individually priced purchased units. Differently priced products stay different. Totals must reconcile exactly in integer öre. Saving a draft does not use donations.
- A reviewed allocation assigns whole products to available portfolios, balancing the current batch. If no portfolio can cover a costly service alone, that one identifiable item may be co-funded. The service is not turned into fictional equal-priced products.
- Confirmed allocations never redistribute when a new receipt or gift arrives. Insufficient funds leave the entire allocation pending. Corrections retain the original purchase and restore its funds through an audit entry.
- Attach a photo, select the funded products and the dogs who used them. The activity category is inherited from those products. A photo never creates another expense.
- Schedule a photo or journey milestone. Publishing and expiry follow wall time; withdrawal leaves a correction history. A milestone can exist without an expense, but it cannot manufacture financial support.
- Itemize an imported workbook entry only when its original receipt is attached. The original amount and every existing donor contribution remain unchanged.
- Export the ledger, product allocations, correction history and record proofs as JSON. Sample supporter shelters can be opened directly from their portfolio.

### Shared records and evidence

- Staff and donor views use the same local D1/SQLite database. Uploaded documents and photos are in local R2 storage. Financial state is not held in `localStorage`.
- Polling refreshes visible tabs every three seconds. Optimistic revision checks prevent stale concurrent writes; command IDs make retrying an uncertain response safe.
- Receipt, gift, photo and correction events append SHA-256 record fingerprints linked to the preceding fingerprint. Original receipt bytes also receive a fingerprint.
- The verification page checks an exported record or complete chain and compares a receipt file, entirely on the reader's device.
- An optional Ethereum wallet flow can anchor a fingerprint on **Sepolia**, using a zero-value transaction. The server checks the actual transaction receipt and its data before accepting a confirmed anchor. No wallet key is stored, and no blockchain transaction was sent during development.
- A local hash checks internal consistency. A separately verified external anchor is needed to independently detect a rewritten local history. Neither hashes nor blockchain prove that an underlying care event was true.

## Data and boundaries

The supplied **Fake Transactions.xlsx** is preserved unchanged: all 100 rows, date-only precision, categories and the **4,783 SEK** expense total. The spreadsheet contains no original receipts, product breakdowns, incoming donations or beneficiary identities. Its opening contribution is a balancing demo fixture, not a claimed payment.

A separate sample receipt and four sample portfolios make the first demonstration useful. Public profile pictures used in sample care stories are marked **Demo story** and are not represented as photos of a real purchase or treatment. Seeded live moments naturally expire; publish a new, explicitly labelled sample moment for a later demo.

Public profiles and sources are a 7 September 2026 snapshot. Photographs retain their original ownership. Lightweight WebP previews preserve the originals and their source manifest; the 106 derivatives total approximately 3.34 MB against 15.36 MB of source images. Uploaded care photos are resized on the client and stripped of embedded camera metadata; receipt documents retain their original bytes.

Local state lives in `.wrangler/state/` (ignored by Git); keep that folder to retain demo changes. The `.local/` folder holds the OCR executable, its compiler cache and optional isolated test data. The original checkout's browser storage and data are untouched. No existing browser-only demo gifts are silently imported into this independent copy.

The service is deliberately restricted to localhost, with sample accounts and no authentication. Before any real launch it needs authorized staff and donor identities, permission boundaries, payment-provider reconciliation, data protection and retention rules, backup/recovery, reviewed accounting attribution, accessible browser/device testing, and a security/dependency review. The current single-snapshot storage is suitable for a hackathon; production should use normalized records and tested operational controls. No production-readiness or fundraising uplift is claimed.

## Verify the implementation

```sh
npm test
npm run typecheck
npm run lint:platform
npm run build
```

The suite includes the retained reference models and new platform tests for money conservation, stable ownership, batch allocation, expensive services, duplicate receipts, corrections, itemization, photo/category links, scheduling, expiry, milestones and fingerprint tampering.

The HTTP integration check must run against a **separate** QA database and port. Stop the development server first because Vinext runs one server per checkout.

```sh
npx wrangler d1 migrations apply CARE_DB --local --config wrangler.local.jsonc --persist-to .local/qa-state
CARE_STATE_DIR=.local/qa-state npx vinext dev --host 127.0.0.1 --port 3002
# In a second terminal:
CARE_QA_URL=http://127.0.0.1:3002 npm run test:api
```

It writes only to the QA instance. Checks include an actual 1.7 MB image upload, file round-trip hashes, idempotency, concurrent requests, product allocation, multiple dogs, corrections and the origin/anchor boundaries. Stop the QA server and restart `npm run dev:isolated` afterward.

The main implementation is in `components/platform/`, `lib/platform/`, `app/api/platform/`, `hooks/use-care-workspace.ts`, and `db/schema.ts`. The old browser-only components remain as reference, not as the active donor or staff application. Their former documentation is archived in `docs/legacy-prototype.md`.

## Presentation and sources

Use [the three-minute demo and next validation steps](docs/hackathon-demo.md). The challenge is to earn repeat participation through visible care while reducing staff effort; the prototype demonstrates that loop, not a prediction of increased revenue.

- [Hundstallet's giving examples and official donation page](https://hundstallet.se/stod-oss/)
- [Public dog directory](https://hundstallet.se/hundar/) and [directory import notes](docs/hundstallet-dog-directory.md)
- [Foster homes](https://hundstallet.se/engagera-dig/jourhem/) and [fundraisers](https://hundstallet.se/insamlingar/)
- [How donations are used](https://hundstallet.kb.kundo.se/guide/vad-anvands-mina-pengar-till?category=gavor-och-donationer)
- [OpenStreetMap attribution](https://www.openstreetmap.org/copyright); local source manifests remain in `public/data/hundstallet/`.
