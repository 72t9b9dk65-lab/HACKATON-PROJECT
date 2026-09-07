# Hundstallet — A second chance, together

An independent hackathon prototype for engaging supporters in care, rehabilitation, and rehoming for vulnerable dogs. The globe remains the main interface: explore Swedish shelter locations, meet fictional dogs, follow their stories, and understand an illustrative contribution allocation.

## Run locally

Requires Node.js 22.13 or later. Run `npm ci`, then `npm run dev`.

- **macOS:** double-click `Open in browser.command`, or run `bash "Open in browser.command"` from the extracted project folder.
- **Windows:** double-click `Open in browser.bat` after extracting the project folder.

Both launchers install missing dependencies and open your browser. Keep the terminal open; press Ctrl+C to stop the server.

## Prototype experience

- **Explore shelters:** a draggable, zoomable globe with approximate city-level markers for Stockholm, Alingsås, and Örkelljunga. Click Sweden to zoom in, or choose a shelter directly.
- **Follow a dog:** three fictional stories connect care, rehabilitation, and rehoming. Bookmark a journey and read example care updates. The next-chapter control is an explicit demo action; donating does not advance rehabilitation or guarantee adoption.
- **Try a contribution:** simulate SEK 10–25,000. Amounts are stored as integer öre and allocated without rounding losses across veterinary care (40%), food and daily care (30%), training and rehabilitation (20%), and rehoming support (10%). These are proposed demo percentages, not Hundstallet’s accounts.
- **My impact:** see your simulated contributions, allocations, followed dogs, and downloadable JSON receipts.
- **The pack:** earn one-time local badges for following a story, reading an update, and trying a contribution. The community challenge combines explicitly fictional sample participation with your local activity. Rewards are not tradable, and there are no spending rankings.
- **Receipt integrity:** each receipt contains a SHA-256 fingerprint of its fields and the previous receipt hash. The app validates the local chain on reload and on request.

## Honest boundaries

This is not an official Hundstallet product. There are no real payments, server accounts, live case updates, connected shelter systems, or shared community activity. Dogs, stories, funding totals, rewards, and allocations are illustrative. The Luna portrait is AI-generated. Milo and Bella use symbolic artwork, not photographs of actual shelter dogs.

Receipts are **local hash-linked records, not blockchain transactions**. They can detect edits to a record or broken links, but a fully rewritten chain or removed suffix cannot be detected without an independent anchor. They are not proof of expenditure, dog outcomes, delivery, or tax-deductible giving.

Following a particular dog does not earmark a real gift for that dog. Real donations must be made on [Hundstallet’s official website](https://hundstallet.se/stod-oss/). Actual care includes staffing and overhead; the prototype allocation is not a claim about real costs.

The new experience uses `hundstallet.prototype.v1` in localStorage. Existing EarthHealth records remain untouched under their original key. The former humanitarian components and tests are retained for reference, but are not the active homepage.

## Production path

1. Connect an authorized payment provider, server-side donation records, refunds, and reconciliation.
2. Integrate consented dog-care records and staff-approved updates, with evidence links, timestamps, and correction history.
3. Replace illustrative allocation with reconciled organizational accounting and explicit shared-cost rules.
4. If blockchain is required, anchor batched receipt proofs on a selected network and expose independently verifiable transaction references. Keep personal and case-sensitive data off-chain. An anchor proves record integrity, not whether an expense or outcome is true.
5. Add account recovery, consent-based notifications, moderation, and privacy controls before enabling a live community.

## Sources

Consulted September 7, 2026:

- [Hundstallet’s mission and shelter locations](https://hundstallet.se/var-verksamhet/)
- [How Hundstallet uses donations](https://hundstallet.kb.kundo.se/guide/vad-anvands-mina-pengar-till?category=gavor-och-donationer)
- [Official giving page](https://hundstallet.se/stod-oss/)
- [Natural Earth / World Atlas](https://github.com/topojson/world-atlas): public-domain geographic boundaries.
- [Country metadata](https://github.com/mledoze/countries): ODbL-1.0. The derived selection is in `public/data/countries.json`; three `map-*` identifiers are internal rather than ISO codes.

## Validation and code

Run `npm test`, `npm run typecheck`, and `npm run build`. Tests cover contribution validation, exact allocation, local receipt integrity, persistence, badge eligibility, shelter totals, and the retained globe and original donation model.

- `components/hundstallet.tsx`: active globe, stories, donation flow, dashboard, community, and dialogs.
- `lib/hundstallet-data.ts`: locations, fictional dogs, stages, and proposed allocations.
- `lib/hundstallet-model.ts`: currency validation, allocation, local receipts, reload validation, and badges.
- `components/earth-globe.tsx`: reused globe, with optional location data and marker icons.

Automated tests and builds do not establish that every browser interaction, touch gesture, or Windows launcher works. Live payments, blockchain integration, and real-time shelter data are not implemented.
