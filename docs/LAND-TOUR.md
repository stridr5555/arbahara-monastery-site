# Illustrated land tour

The restored art direction follows the original `assets/images/land-illustration.webp` and original `76ccc62` land layout. The corrected sibling asset is `assets/images/land-illustration-accurate.webp`; the original is preserved.

This is a **2.5D illustrated diorama with CSS perspective motion**, not a measured terrain mesh, photogrammetry scan, drone recording, or boundary survey. Real photographs remain the source of truth. The future campus image is explicitly a proposal, not completed construction. Neighboring structures in the illustration do not imply monastery ownership.

## Playback

`LandJourney` owns one progress clock. `tourPose` derives land translation, tilt, zoom and photo lift/rotation from that same position. Pause freezes the clock; chapter buttons and the slider seek without starting playback. Offscreen and hidden-tab playback does not advance. Motion preferences disable animation while keeping chapter selection and photographs usable. Photo enlargement pauses playback and uses a native keyboard-accessible dialog.

No per-frame React state is used for transforms; only chapter changes update content. The former photograph-plane WebGL scene is removed, so this tour no longer depends on WebGL support or the Three.js download.

## Asset provenance

Built-in Image Gen edited the original illustration using the supplied overhead photograph and `land-02.webp` as references. The selected PNG was converted to WebP for delivery. Exact prompt:

> Use case: precise-object-edit. Edit target Image 1 is an accepted realistic game-like isometric cutaway landscape illustration for a monastery website. Image 2 is the original overhead photograph, image 3 is the actual existing residence. Preserve Image 1's exact overall isometric composition, dark nearly black #0d110e background, wooded terrain, rich textured rocky cutaway edges, golden natural sunlight, high-detail realistic 3D-diorama rendering, and floating-island appearance. Do NOT redesign it or flatten it into an aerial photo. Change ONLY the monastery residence and garage in the left foreground to match Image 3's red/brown steep gabled roof, two white dormers, cream/brick two-story facade, porch and chimney; retain a small separate matching garage beside it, using the footprint relationship in Image 2. Refine the lake outline, driveway sweep and nearly straight road on the right to more closely match Image 2 while keeping the original perspective. Preserve surrounding mature woodland and open grass. The smaller neighboring property beside the road is context only, do not add new monastery buildings. No churches or future buildings, no invented water springs. This is an illustrative reconstruction, not a surveyed model. Maintain the same layout and scale so property hotspots still line up: main house around 33% across / 48% down, lake around 54% across / 31% down, road along right edge. No text, no labels, no arrows, no UI. Landscape 1536x1024. Preserve all invariants aggressively; this is a fidelity correction, not a new concept.

## Fidelity checks

- Original wooded cutaway silhouette and dark background restored instead of flat aerial planes.
- Original “Rooted here. For generations.” heading, serif typography, sand/gold palette and existing/future controls retained.
- Residence dormers, porch and chimney refined against the actual residence photo.
- Actual photos animate in perspective and enlarge without leaving the page.
- Mobile layout puts controls below the land and the budget below the controls, avoiding floating-panel collisions.

Intentional changes from the original composition: clearly labeled playback controls, photographic popups, photo-based residence refinement, and an explicit non-survey disclaimer.
