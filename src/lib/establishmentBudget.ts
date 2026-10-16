import { highPriorityIds } from "./constructionEstimates";

// Owner-directed funding ceiling, not a replacement market-cost estimate.
// Rows allocate dollars for the reduced/staged scope below; no contracts exist.
export const establishmentBudgetTarget = 900_000;
export const allocationCategories = [
  "Materials, equipment & furnishings",
  "Labor, installation & specialist services",
  "Transport & mobilization",
  "Design, permits, testing & startup",
  "Tax, overhead & contractor margin",
  "Protected reserve · 10% of allocation",
] as const;
type Allocation = {
  id: string;
  title?: string;
  amharic?: string;
  stage: "Reduced scope" | "Staged delivery" | "Procurement target";
  amounts: readonly [number, number, number, number, number, number];
  scope: string;
  deferred: string;
};
const allocations: Allocation[] = [
  {
    id: "fire-water-tank",
    stage: "Procurement target",
    amounts: [18000, 7000, 2000, 2000, 2500, 3500],
    scope:
      "Seek a standard reserve tank, pad and basic connections within this allowance, with final capacity and configuration set by the fire authority and engineer.",
    deferred:
      "Any required pump, sprinkler network or additional storage must be priced before occupancy; this allowance does not establish compliance.",
  },
  {
    id: "septic-tank",
    stage: "Staged delivery",
    amounts: [20000, 17000, 3000, 6000, 3500, 5500],
    scope:
      "Design and bid a first-stage commercial system for the actual initial approved occupancy, coordinating excavation and restroom connections.",
    deferred:
      "Do not size the system to the budget. Expansion for future lodging is a later commitment and must be evaluated before choosing the initial system.",
  },
  {
    id: "public-bathrooms",
    stage: "Reduced scope",
    amounts: [36000, 27000, 4000, 8000, 6000, 9000],
    scope:
      "Investigate adapting existing space or a compact prefabricated restroom solution, with basic durable finishes and the fixture/accessibility requirements of the approved initial occupancy.",
    deferred:
      "The earlier new 600-square-foot standalone building is not promised within this allowance. Select the compliant solution after site assessment and bids.",
  },
  {
    id: "temporary-liturgy-temple",
    title: "Liturgy space — garage adaptation",
    amharic: "የቅዳሴ ቦታ — የጋራዥ ማስተካከያ",
    stage: "Reduced scope",
    amounts: [80000, 80000, 10000, 22000, 15000, 23000],
    scope:
      "Prioritize assessing and adapting the existing garage for initial congregational worship, with structural, accessibility, HVAC, electrical and life-safety work determined professionally and sacred use guided by the Church.",
    deferred:
      "Not a commitment to a new 3,000-square-foot hall, major extension or a specific seating capacity. If conversion is not viable, return for a revised scope before spending construction funds.",
  },
  {
    id: "entrance-road-parking",
    title: "Entrance road, gate & first-stage parking",
    amharic: "መግቢያ መንገድ፣ በር እና የመጀመሪያ ደረጃ መኪና ማቆሚያ",
    stage: "Staged delivery",
    amounts: [40000, 27000, 7000, 10000, 6000, 10000],
    scope:
      "Plan a modest gate, drainage and first-stage access/parking. Consider engineered aggregate areas with paved accessible routes where the approving authority permits them.",
    deferred:
      "Not the earlier 21,500-square-foot fully paved scheme or a guarantee of 50 finished spaces. Confirm emergency access, drainage, parking capacity and required surfacing before construction.",
  },
  {
    id: "aquifer-well",
    stage: "Procurement target",
    amounts: [10000, 28000, 3000, 2000, 2000, 5000],
    scope:
      "Obtain local drilling, pump, quality-testing and connection bids; commit only after the water-supply requirements and expected drilling depth are assessed.",
    deferred:
      "No water yield, aquifer depth, holy-water suitability or public-water-system approval is guaranteed. Dry-hole redrilling and substantial treatment require a revised plan.",
  },
  {
    id: "holy-water-rooms",
    title: "Holy water rooms — initial adaptation",
    amharic: "የጸበል ክፍሎች — የመጀመሪያ ደረጃ ማስተካከያ",
    stage: "Reduced scope",
    amounts: [16000, 12000, 2000, 4000, 2000, 4000],
    scope:
      "Investigate modest wet-room adaptation within suitable existing space, prioritizing waterproofing, drainage, privacy, ventilation and accessible use under clergy guidance.",
    deferred:
      "The earlier two-room, 480-square-foot new-build scenario is not included as a guaranteed deliverable. Confirm feasibility and sanitary requirements first.",
  },
  {
    id: "cross-water-fountain",
    stage: "Reduced scope",
    amounts: [2200, 1000, 400, 400, 500, 500],
    scope:
      "A small standard recirculating basin and simple cross feature, located near suitable existing services if a safe installation can be quoted within the cap.",
    deferred:
      "Custom monumental stonework, long utility runs and substantial landscaping are outside this allocation.",
  },
  {
    id: "lake-safety-fence",
    stage: "Staged delivery",
    amounts: [12000, 7000, 1000, 1000, 1500, 2500],
    scope:
      "Measure the lake and obtain a safety-led fencing/gate plan. First secure access to the lake with an approved restricted-access approach and competitively priced standard fencing.",
    deferred:
      "The earlier assumed 800-foot metal perimeter is not guaranteed. Do not open unsafe areas or substitute partial fencing for the protection the authority requires.",
  },
  {
    id: "lake-restoration",
    stage: "Staged delivery",
    amounts: [1000, 10000, 7000, 3000, 1500, 2500],
    scope:
      "Survey sediment and drainage, then prioritize limited debris removal and permitted dry-season work with approved on-site spoil reuse where feasible.",
    deferred:
      "No commitment to dredge 800 cubic yards, repair a dam or dispose of contaminated spoil. Reduce the work area or defer excavation if actual bids exceed the cap.",
  },
  {
    id: "three-cows",
    stage: "Procurement target",
    amounts: [8000, 300, 600, 1100, 800, 1200],
    scope:
      "Seek suitable healthy locally available livestock with veterinary checks and transport; preserve funds for initial care before committing to a purchase.",
    deferred:
      "Three animals remain the goal, not a quoted purchase. Existing shelter, fencing, pasture and ongoing care must be suitable; otherwise defer purchase rather than compromise welfare.",
  },
  {
    id: "tractor-lawn-mower",
    stage: "Reduced scope",
    amounts: [9000, 300, 500, 200, 800, 1200],
    scope:
      "Choose an inspected used mower or compact mowing package appropriate to the grounds, with basic service, delivery and condition checks.",
    deferred:
      "A new diesel subcompact tractor with mower deck is not promised. Equipment class and attachments depend on available inspected machines and actual land-care needs.",
  },
  {
    id: "fruit-trees",
    stage: "Procurement target",
    amounts: [3600, 1800, 400, 800, 600, 800],
    scope:
      "Aim for 70 small, locally suitable nursery trees through bulk procurement and coordinated planting, including basic protection and establishment care.",
    deferred:
      "Larger mature stock, extensive irrigation mains and long-term orchard maintenance are not included. Phase planting if healthy stock and proper care cannot fit.",
  },
  {
    id: "park-benches",
    stage: "Procurement target",
    amounts: [6000, 1000, 600, 400, 1000, 1000],
    scope:
      "Seek 15 simple durable benches through basic models, inspected surplus or bulk procurement, with appropriate anchors and safe placement.",
    deferred:
      "The previously benchmarked premium recycled-plastic models are not assumed. Full quantity depends on delivered quotes; defer some benches rather than omit safe installation.",
  },
  {
    id: "holy-icons",
    stage: "Procurement target",
    amounts: [1800, 200, 200, 200, 300, 300],
    scope:
      "Aim for ten clergy-approved mounted reproductions with simple framing, secure installation and consolidated delivery.",
    deferred:
      "Commissioned hand-painted icons and a new custom iconostasis remain outside this allocation.",
  },
  {
    id: "persian-rugs",
    stage: "Reduced scope",
    amounts: [3000, 300, 400, 300, 500, 500],
    scope:
      "Aim for seven modest Persian-style machine-made rugs and non-slip pads, choosing sizes to suit the actual prayer space.",
    deferred:
      "Hand-knotted wool, antique Iranian carpets and the earlier fixed 8-by-10-foot size for every rug are not assumed.",
  },
  {
    id: "priests-relocation",
    stage: "Procurement target",
    amounts: [3000, 5000, 4000, 2000, 4000, 2000],
    scope:
      "Plan one-time relocation support for two priests: modest furnishings, professional document/legal services, travel, provisional filing costs and initial settling support.",
    deferred:
      "No immigration outcome is promised. Required filings must be confirmed by counsel; ongoing stipends, housing and insurance need a separate operating budget.",
  },
  {
    id: "temporary-prayer-house",
    title: "Temporary prayer space",
    amharic: "ጊዜያዊ የጸሎት ቦታ",
    stage: "Reduced scope",
    amounts: [8000, 5000, 1000, 2000, 2000, 2000],
    scope:
      "Identify a modest separate prayer area in suitable existing space and fund basic adaptation, furnishings and the access/safety work its approved use requires.",
    deferred:
      "A new 320-square-foot conditioned standalone building is not promised. Keep its work area distinct from the garage adaptation to avoid paying twice for the same work.",
  },
  {
    id: "temporary-dormitory",
    title: "Pilgrim accommodation — first stage",
    amharic: "የጸበልተኞች ማረፊያ — የመጀመሪያ ደረጃ",
    stage: "Staged delivery",
    amounts: [45000, 35000, 5000, 40000, 14500, 15500],
    scope:
      "Start the 40-room accommodation vision with feasibility, occupancy and utility-capacity design, followed only by limited lawful first-stage accommodation in suitable existing or quoted modular space.",
    deferred:
      "This $155,000 allocation does not build 40 finished rooms or a 12,000-square-foot dormitory. Construction, utility expansion and the number of initial rooms require approved designs and bids; the remaining rooms need a later funded phase.",
  },
];
export const establishmentBudget = allocations.map((project) => ({
  ...project,
  allocation: project.amounts.reduce((sum, amount) => sum + amount, 0),
  reserve: project.amounts[5],
  highPriority: (highPriorityIds as readonly string[]).includes(project.id),
}));
export const establishmentBudgetById = new Map(
  establishmentBudget.map((p) => [p.id, p]),
);
export const establishmentBudgetTotal = establishmentBudget.reduce(
  (sum, p) => sum + p.allocation,
  0,
);
export const establishmentReserve = establishmentBudget.reduce(
  (sum, p) => sum + p.reserve,
  0,
);
export const priorityBudgetTotal = establishmentBudget
  .filter((p) => p.highPriority)
  .reduce((sum, p) => sum + p.allocation, 0);
