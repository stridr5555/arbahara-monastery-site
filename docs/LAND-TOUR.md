# Property flyover

## Owner’s current direction

Preserve the wooded, game-like cutaway style, but replace the image-based motion with a genuine 3D model. Fly toward features and zoom in for study; do not spin the property. The owner explicitly withdrew the earlier photo-popup request on October 12, 2026.

## Sources and accuracy

- Owner-provided `assets/property/user-map-overhead.jpg` and `user-map-oblique.jpg` inform the residence southwest of the lake, garage beside the residence, eastern road and curved driveway.
- `assets/property/land-01.webp` and `land-02.webp` inform cream stone, red-brown roof, two white dormers, chimney, porch and garage doors.
- Reference: <https://www.realtor.com/realestateandhomes-detail/7029-FM-2757_Crandall_TX_75114_M97693-63657>. Public page text could be inspected; its interactive fly-around returned an availability error in the in-app browser. No proprietary listing mesh, service key or third-party tiles were extracted or embedded.
- This is an original **photo-informed, illustrative 3D reconstruction**, not a photogrammetry scan, survey, measured architectural model or drone recording. Footprints, dimensions, slopes, trees, water level, shoreline and entry details are approximate. The cutaway edge is a presentation device, not a legal boundary. Neighboring buildings are omitted rather than represented as monastery property.
- Proposed campus buildings are not placed in the existing-property model. Future plans remain linked separately with the existing budget and conceptual master plan.

## Implementation

`propertyModel.ts` builds native Three.js mesh geometry for terrain, rocky cutaway, house, dormers, windows, chimney, porch columns, garage doors, pond, shoreline, driveway, road, entry and vegetation. Surface textures and sky reflection are original deterministic procedural textures. Trees, grass and stones use instancing. The model has no rotation animation and no photographic billboards.

`propertyRenderer.ts` owns lighting, shadows, the perspective camera, resize handling, GPU resource cleanup and context-loss notification. It is dynamically imported only when the tour is visible. No new packages, third-party model API, API key or payment service are required. The Three.js chunk is approximately 147 KB gzip and is separate from the main page bundle.

`landTour.ts` defines a 70-second, five-stop camera route: approach/overview → residence → garage → lake → entrance. Positions and look-at targets translate in world space. Smooth quintic easing and a raised transit path descend into each inspection view; the final 35% of each chapter is stationary. There is no orbit loop. Closer/Wider dolly along the same viewing ray without rotating the land or changing the target.

`LandJourney` owns the playback clock. Pause stops its advancement. Chapter selection pauses playback and uses a 2.2-second camera flight to the inspection stop; Closer/Wider also pause playback. The progress slider, previous/next and Return to overview remain keyboard-accessible. Hidden tabs and offscreen tours do not advance the playback clock. Reduced-motion mode removes transitions and disables autoplay while preserving direct feature selection and zoom.

`LandScene` shows the accepted illustration while loading and as an explicitly labeled fallback when WebGL fails. Chapter descriptions and original photograph links remain available without WebGL or animation. The fallback is not described as live 3D.

## Design comparison

| Accepted direction | Implementation / intentional change |
| --- | --- |
| Wooded floating cutaway | Retained as actual geometry, with rocky edges and instanced woodland |
| Dark, sand and gold theme | Retained; natural lighting and pond sky reflection added |
| “Rooted here. For generations.” serif heading | Retained; smaller on desktop during close-up inspection to leave room for the feature |
| House southwest of lake, road east | Retained from the supplied aerial; details reconstructed from residence photos |
| Photo popups | Removed at owner’s request; actual model features replace them |

The old Image Gen illustration `land-illustration-accurate.webp` is preserved for loading/error fallback only. Its original generation provenance is retained in Git history (commit `8406751`). No new generated bitmap is used as a substitute for 3D geometry.

## Verification

Automated tests cover all visible chapters without animation, absence of photo dialogs/popups, bounded playback, deterministic camera poses, continuity, stationary inspection stops and fixed-target dolly zoom. Full existing application tests and the production build must pass before publication. Browser QA covers desktop and phone-sized layouts, native canvas rendering, feature selection, playback/pause, zoom, fixed model rotation, motion-off selection and console health. No financial or membership activation is part of this change.
