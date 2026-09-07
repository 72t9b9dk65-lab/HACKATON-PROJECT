# Hundstallet — A second chance, together

An independent hackathon prototype for engaging supporters in care, rehabilitation, and rehoming for vulnerable dogs. A personal virtual shelter connects roaming pixel companions to real published dog profiles, a Sweden-only shelter map, and a simulated giving journey.

## Run locally

Requires Node.js 22.13 or later. Run `npm ci`, then `npm run dev`.

- **macOS:** double-click `Open in browser.command`, or run `bash "Open in browser.command"` from the extracted project folder.
- **Windows:** double-click `Open in browser.bat` after extracting the project folder.

Both launchers install missing dependencies and open your browser. Keep the terminal open; press Ctrl+C to stop the server.

## Prototype experience

The homepage centers on a personal shelter profile, care choices, and a virtual shelter with a daily impact timeline. The confirmed demo total and category bars remain above the workspace; the Sweden map and real photo journey remain below it.

- Edit the supporter name and shelter name in the personal profile. Profile details and the optional monthly plan persist on this device without creating an online account.
- Pixel dogs roam in the personal shelter and approach generated food/enrichment, rehabilitation, and examination/vaccination stations on forecast care days. Faded dogs are potential recipients. Clicking a named dog opens its real photo, breed, age, status, shelter, demo support, and official profile link. Motion can be paused and respects reduced-motion preferences. Future recipients beyond the individual directory are explicitly anonymous illustrations, not invented profiles.
- Click a pixel shelter to fly from Sweden to its real facility location, showing nearby OpenStreetMap roads and buildings. A rectangular, scrollable grid shows its published dog profiles. **All profiles** includes all 43 listings from the official directory on 7 September 2026, including two group listings and two trial adoptions. The single “Rehoming team” listing remains visible without an invented shelter location.
- Selecting a grid avatar shows its published photo, official profile link, and simulated care allocation. Selecting a profile at another shelter moves the map there. Escape or **Sweden** returns to the overview.
- Choose one of three care examples (100 SEK food/enrichment, 240 SEK veterinary care/rehabilitation, or 1,100 SEK examination/vaccination), or enter a whole amount from 1 to 10,000 SEK for the selected option. The official 500 SEK example becomes ten food/enrichment dog-days for one dog. Costs are based on the official giving page checked on 7 September 2026, with source data and modeling assumptions in `public/data/hundstallet/care-examples.json`.
- Select **Every month** and move the daily slider across twelve months. Forecast contributions accumulate on calendar-month anniversaries, complete care units are scheduled day by day, and unused balances carry toward the next unit. Repeated food/rehabilitation care does not inflate unique recipient counts. Examination/vaccination equivalents use different illustrative recipients. Save, update, or remove a monthly preview without changing donation history or scheduling any automatic charges.
- For a one-time gift, **Donate** records the entered amount for the matched profiles; a sub-unit contribution is recorded as partial demo support, not a completed purchase. New choices allocate to their selected food or veterinary category. Earlier receipts retain their historical 50/30/20 illustrative allocation and original recipients. Only confirmed one-time demo gifts enter the ledger; forecasts never create future receipts. All amounts reconcile in integer öre after reload.
- A fresh session starts with a labeled 500 SEK example shared among all 43 profiles. Existing user records retain their dates, amounts, and recipient allocations. The map does not claim that every dog lives at its listed shelter continuously.
- Published photos have no verified event dates. New demo gifts add a dated entry; the final card reserves space for an organization-posted care update.
- Sweden’s coastline, counties, lakes, rivers, city labels, panning, zoom, and reset remain available. Both map views use warm white backgrounds, light brown geographic details, and cream shelter cards.

## Data and prototype boundaries

This is an independent shell, not an official Hundstallet service. Public names, profile summaries, shelter assignments, and photographs are an imported snapshot of the official public directory. All financial amounts, allocations, and donation events are simulated. Åke's profile mentions allergy food; the app does not claim that a purchase was made for him or that Hundstallet earmarks donations to particular dogs.

Photo order is gallery order, not a verified care chronology. The original photos have no asserted event dates and do not prove expenditure, delivery, or outcomes. The next-update card is visibly a placeholder; donations do not generate organization updates or advance a dog's rehabilitation. Photo sources, original URLs, and hashes are recorded in `public/dogs/hundstallet/sources.json`. Copyright remains with the original rights holders.

The original 25 AI-generated dog sprites are retained, with 16 additional sprites covering missing breeds and generic mixed-breed appearances. They are illustrations, not portraits or confirmed ancestry. A generated shelter icon represents all three locations and is not a rendering of the actual buildings. The real profile-photo carousel remains below the map.

Public shelter addresses are verified against the official contact page; mapped facility points are sourced from OpenStreetMap, Eniro, and Hitta. The close-up uses local OpenStreetMap geography under ODbL 1.0 with visible attribution. Building coverage is incomplete around Alingsås; the prototype retains the verified address point instead of fabricating a building footprint. These maps are an exploration interface, not navigation instructions.

Demo records are saved only in this browser under `hundstallet.donation-shell.v1`. If storage is unavailable, the shell works for the current session and says so. There are no payments, blockchain transactions, server accounts, or live integrations. Real giving is available on [Hundstallet's official website](https://hundstallet.se/stod-oss/).

Previous EarthHealth and Hundstallet flows and their local records are retained for reference and are not used by the active homepage.

## Production path

1. Connect an authorized payment provider, server-side donation records, refunds, and reconciliation.
2. Integrate consented dog-care records and staff-approved updates, with evidence links, timestamps, and correction history.
3. Replace illustrative allocation with reconciled organizational accounting and explicit shared-cost rules.
4. If blockchain is required, anchor batched receipt proofs on a selected network and expose independently verifiable transaction references. Keep personal and case-sensitive data off-chain. An anchor proves record integrity, not whether an expense or outcome is true.
5. Add account recovery, consent-based notifications, moderation, and privacy controls before enabling a live community.

## Sources

Consulted September 7, 2026:

- [Complete dog directory](https://hundstallet.se/hundar/): 43 published profiles, including groups, with names, breeds, ages, shelter assignments, status, links, and photos.
- [Official shelter addresses](https://hundstallet.se/var-verksamhet/kontakt/) and [OpenStreetMap](https://www.openstreetmap.org/copyright): facility locations and nearby geographic context. Coordinate source links are in `lib/hundstallet-shelters.ts`; map attribution is in `public/data/hundstallet/map-sources.json`.
- [Hundstallet’s mission and shelter locations](https://hundstallet.se/var-verksamhet/)
- [How Hundstallet uses donations](https://hundstallet.kb.kundo.se/guide/vad-anvands-mina-pengar-till?category=gavor-och-donationer)
- [Official giving page](https://hundstallet.se/stod-oss/)
- [Natural Earth 1:10 million](https://www.naturalearthdata.com/downloads/10m-physical-vectors/) and [county boundaries](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/): public-domain geography pinned to source revision `ca96624a56bd078437bca8184e78163e5039ad19`. These are cartographic context rather than cadastral or navigation-grade boundaries.
- [Natural Earth / World Atlas](https://github.com/topojson/world-atlas): retained public-domain globe assets.
- [Country metadata](https://github.com/mledoze/countries): ODbL-1.0. The derived selection is in `public/data/countries.json`; three `map-*` identifiers are internal rather than ISO codes.

## Validation and code

Run `npm test`, `npm run typecheck`, and `npm run build`. Tests cover the four official care examples, every day of twelve-month forecasts, exact allocations, carryover, short months and leap years, repeat-care recipient counts, local profile/plan persistence, scene bounds, asset alpha, photo availability, map projection, and the retained earlier models.

- `components/donation-shell.tsx`: contribution totals, custom demo donations, and horizontal photo timeline.
- `components/virtual-shelter.tsx`: care stations, supported and preview dogs, movement to services, and real-profile dialogs.
- `components/care-planner.tsx` and `components/shelter-profile.tsx`: care choices, monthly preview, daily timeline, and personal profile editing.
- `lib/care-impact.ts`: sourced care units, calendar schedule, cumulative capacity/use, reserve handling, and estimated recipients.
- `lib/shelter-profile.ts` and `lib/virtual-shelter.ts`: device-local profile/plan validation, custom amount parsing, and matched profile selection.
- `lib/shelter-scene.ts`: responsive dog home and care-station coordinates.
- `public/care/pixel/` and `assets/care-stations/generation.json`: three generated transparent care stations, exact prompts, provenance, and saved paths.
- `components/shelter-map.tsx`: pixel shelter markers, animated close-up, full dog directory, and selected-dog care.
- `lib/shelter-camera.ts`: geographic camera interpolation and facility centering.
- `public/data/hundstallet/directory.json` and `lib/hundstallet-directory.ts`: complete sourced snapshot and typed data.
- `scripts/import-hundstallet-directory.py`: repeatable import from a downloaded official directory HTML file; `--download` also retrieves published thumbnails.
- `lib/donation-shell.ts`: sourced profiles, demo allocation, and local records.
- `components/pixel-care-icon.tsx`: shared pixel icons for amounts and map markers.
- `public/dogs/pixel-breeds/`: original 5 × 5 atlas plus a 4 × 4 extension, 41 individually cropped sprites, and manifests.
- `public/shelters/pixel-shelter.png`: transparent pixel shelter marker.
- `assets/hundstallet-map/generation.md`: shelter and additional dog generation prompts.
- `assets/pixel-dog-breeds/generation.md`: complete built-in image generation prompt and processing notes.
- `scripts/crop-dog-breeds.py`: repeatable cropping and alpha validation using Pillow.
- `public/dogs/hundstallet/`: original profile photos with a source manifest.
- `components/hundstallet.tsx`: retained earlier prototype, no longer the homepage.
- `lib/hundstallet-data.ts`: locations, fictional dogs, stages, and proposed allocations.
- `lib/hundstallet-model.ts`: currency validation, allocation, local receipts, reload validation, and badges.
- `components/sweden-map.tsx` and `lib/sweden-map.ts`: Sweden-only projection, panning, zooming, and accessible shelter markers.
- `public/data/sweden.json`: detailed Natural Earth 1:10 million Sweden boundary.
- `public/data/sweden-details.json`: 21 counties, regional lake and river features, and Swedish city points. Hydrology is clipped to Sweden during rendering.
- `public/data/sweden-sources.json`: pinned source URLs, revision, source SHA-256 checksums, license, and processing notes.
- `scripts/build-sweden-map.mjs`: repeatable extraction; download the source files listed in the manifest as `<name>.json` and run `node scripts/build-sweden-map.mjs /path/to/source-directory`.
- `components/earth-globe.tsx`: retained original globe implementation; not used by the active homepage.

Automated tests and builds do not establish that every browser interaction, touch gesture, or Windows launcher works. Live payments, blockchain integration, and real-time shelter data are not implemented.
