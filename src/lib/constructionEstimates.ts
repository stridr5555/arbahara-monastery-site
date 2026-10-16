// Preliminary owner-side allowances, not contractor quotations or a measured takeoff.
// USD, October 15, 2026. Keep the historical document figures in construction.ts.
export const estimateSources = {
  paving: {
    label: "Blackland Asphalt · DFW 2026 paving ranges",
    url: "https://blacklandasphalt.com/resources/parking-lot-paving-cost-dfw",
    note: "Full-depth work: $6.50–$12 per sq ft before project-specific scope adjustments.",
  },
  septic: {
    label: "Texas Septic Design Group · commercial systems",
    url: "https://www.texassepticdesigngroup.com/how-much-does-a-commercial-septic-system-cost",
    note: "Commercial scope varies with design flow, soils and treatment requirements; not a site quotation.",
  },
  well: {
    label: "Hill Country Well & Pump · 2026 cost guide",
    url: "https://hillcountrywellandpump.com/blog/water-well-cost-texas",
    note: "Regional drilling benchmark, not Kaufman County geology or a local depth/yield guarantee.",
  },
  pond: {
    label: "Dirt Rock Dallas · 2026 pond dredging guide",
    url: "https://dirtrockdallas.com/cost-of-pond-dredging/",
    note: "Volume, access and disposal location drive costs. The site's sediment volume is not surveyed.",
  },
  buildings: {
    label: "Gordian / RSMeans · 2026 construction cost context",
    url: "https://www.rsmeans.com/resources/how-much-does-it-cost-to-build-2026",
    note: "General cost context only. No licensed RSMeans unit-cost takeoff or project-specific building quote was obtained.",
  },
  benches: {
    label: "Belson · commercial recycled-plastic benches",
    url: "https://www.belson.com/Recycled-Plastic-Park-Benches",
    note: "Observed 6-foot bench with arms: $1,281, FOB origin; freight, installation and taxes are additional.",
  },
  cattle: {
    label: "USDA AMS · Texas cattle market reports",
    url: "https://mymarketnews.ams.usda.gov/public_data?slug_id=1955",
    note: "Market context only; breed, health, pregnancy and dairy suitability require a livestock-specific quote.",
  },
  tractor: {
    label: "Kubota · BX subcompact tractor specifications",
    url: "https://www.kubotausa.com/equipment-series/bx-series",
    note: "Equipment scope reference, not a published price quote. Obtain a tractor-and-deck dealer package quote.",
  },
  icons: {
    label: "Legacy Icons · Ethiopian icon reproductions",
    url: "https://legacyicons.com/icons/icons-from-places/ethiopia/",
    note: "Reproduction examples only; framing and selected sizes are modeled allowances, not custom hand-painted commissions.",
  },
  rugs: {
    label: "The Rug Line · 8 × 10 wool rug comparable",
    url: "https://therugline.com/products/hand-knotted-grey-wool-rug-8-x-10-persien-agra-oriental-large-carpet-1",
    note: "Observed sale $924.95 / regular $2,432. Persian-style wool comparable, not a guaranteed Iranian antique or seven-item quotation.",
  },
  relocation: {
    label: "US Department of State · religious worker visa process",
    url: "https://travel.state.gov/content/travel/en/us-visas/other-visa-categories/temporary-religious-worker.html",
    note: "Process reference, not legal advice or a verified fee schedule. Counsel must confirm route, eligibility and current fees.",
  },
  tank: {
    label: "Norwesco · tank manufacturer",
    url: "https://www.norwesco.com/",
    note: "Vessel scope reference only; installed fire-water capacity and equipment need an engineer and fire authority review.",
  },
  permits: {
    label: "Kaufman County · OSSF permit application",
    url: "https://www.kaufmancounty.net/DocumentCenter/View/4772/OSSF-Permit-Application",
    note: "Local permitting reference; permit and design allocations below are allowances, not quoted county fees.",
  },
} as const;
type Source = keyof typeof estimateSources;
type Amounts = readonly [number, number, number, number, number];
type Input = {
  id: string;
  normalized: Amounts;
  scope: string;
  exclusions: string;
  basis: string;
  sources: Source[];
};
export const costCategories = [
  "Materials, equipment & furnishings",
  "Labor, installation & specialist services",
  "Transport & mobilization",
  "Design, permits, testing & startup",
  "Tax, overhead & contractor margin",
] as const;
export const highPriorityIds = [
  "entrance-road-parking",
  "septic-tank",
  "public-bathrooms",
  "temporary-liturgy-temple",
  "priests-relocation",
  "temporary-prayer-house",
] as const;
const inputs: Input[] = [
  {
    id: "fire-water-tank",
    normalized: [20000, 6000, 2000, 3000, 4000],
    scope:
      "One provisional 10,000-gallon reserve vessel, foundation pad, valves and fill connections. Capacity is not an approved fire-safety design.",
    exclusions:
      "Dedicated fire pump, sprinkler network and long distribution mains are excluded.",
    basis:
      "Installed tank allowance, not a supplier or fire-system quote. Foundation and mobilization are separately allocated.",
    sources: ["tank", "buildings"],
  },
  {
    id: "septic-tank",
    normalized: [20000, 14000, 3000, 5000, 6000],
    scope:
      "Initial assembly-phase commercial treatment and dispersal system. A provisional 1,000 gallons/day is a pricing placeholder only; an engineer must calculate actual demand and soil suitability.",
    exclusions:
      "The 40-room dormitory's incremental utility capacity is allowed within its own project, not included here. No unsuitable-soil remediation or off-site sewer extension.",
    basis:
      "Commercial-system allowance rather than a residential tank-only price; design and permit amounts are provisional.",
    sources: ["septic", "permits"],
  },
  {
    id: "public-bathrooms",
    normalized: [75000, 45000, 8000, 10000, 12000],
    scope:
      "600 gross sq ft total, with separate men's and women's accessible multi-fixture facilities, slab, plumbing, electrical, ventilation and short utility connections.",
    exclusions:
      "New septic treatment plant is budgeted separately. Final fixture counts and accessibility layout require design.",
    basis:
      "Normalized finished-building allowance: approximately $275 per gross sq ft including contingency. No vendor building quote obtained.",
    sources: ["buildings", "permits"],
  },
  {
    id: "temporary-liturgy-temple",
    normalized: [235000, 120000, 20000, 35000, 50000],
    scope:
      "3,000 gross sq ft of modest new single-story assembly space, metal or modular shell, slab, finished interior, HVAC, life-safety systems and basic liturgical fitout.",
    exclusions:
      "This is a new-building scenario, not a quote to convert the existing garage. Parking, bathrooms and septic are separate. Permanent church construction is excluded.",
    basis:
      "Normalized all-in building allowance of approximately $169 per sq ft. Confirm whether this and the small prayer house are distinct needs before funding both.",
    sources: ["buildings"],
  },
  {
    id: "entrance-road-parking",
    normalized: [85000, 42000, 12000, 12000, 19000],
    scope:
      "50 spaces at 350 sq ft each including aisles, plus a 4,000 sq ft entrance drive: 21,500 sq ft of new paving. Includes one gate, local drainage/culvert and accessible-route/striping allowances.",
    exclusions:
      "Quantities are not surveyed. Major drainage structures, bridges and off-site highway work are excluded.",
    basis:
      "DFW full-depth pavement benchmarks informed the base; gate, drainage, professional services and contingency are additional modeled allocations. This is not a cheap overlay over an existing sound base.",
    sources: ["paving"],
  },
  {
    id: "aquifer-well",
    normalized: [12000, 28000, 3000, 2000, 4500],
    scope:
      "Provisional 600-foot bore, casing, pump, pressure equipment, short connections, yield and water-quality testing. Actual depth and aquifer availability are unknown.",
    exclusions:
      "Dry-hole redrilling, major treatment and a fully classified public-water system are excluded; these may substantially change scope.",
    basis:
      "Texas regional drilling context plus institutional-use allowances. Hill Country costs are not a Kaufman County quote. Drilling labor/equipment operation is in the labor row.",
    sources: ["well"],
  },
  {
    id: "holy-water-rooms",
    normalized: [50000, 35000, 4000, 8000, 13000],
    scope:
      "Two private wet rooms totaling 480 gross sq ft, waterproofing, drainage, ventilation, sanitary finishes and accessible hot/cold water facilities.",
    exclusions:
      "Well and septic plants are separate; premium commissioned religious artwork is not included.",
    basis:
      "Low-confidence normalized wet-room allowance; approximately $252 per sq ft all-in. Requires clergy and design-team review, not a contractor quote.",
    sources: ["buildings"],
  },
  {
    id: "cross-water-fountain",
    normalized: [6500, 2000, 1000, 500, 1500],
    scope:
      "One modest cast-stone cross fountain, basin, recirculating pump, small pad and short water/electrical connections.",
    exclusions:
      "Monumental hand-carved sculpture, long utility runs and major landscaping are excluded.",
    basis:
      "Low-confidence custom-feature allowance; no selected cross-fountain supplier has quoted this design.",
    sources: ["buildings"],
  },
  {
    id: "lake-safety-fence",
    normalized: [19200, 11200, 1200, 1400, 4500],
    scope:
      "800 assumed linear feet of metal safety fencing, post footings and two self-closing gates. The lake perimeter has not been measured.",
    exclusions:
      "Full property perimeter fencing is excluded. This allowance is not a child-safety certification or a substitute for supervision.",
    basis:
      "Normalized installed allowance of approximately $52 per linear foot including contingency, gates and professional services; local fencing bids are required.",
    sources: ["buildings"],
  },
  {
    id: "lake-restoration",
    normalized: [2000, 13000, 8000, 3000, 4000],
    scope:
      "800 assumed cubic yards of sediment/debris, access, dewatering and limited shoreline stabilization. Both scenarios assume permitted on-site spoil reuse; additional off-site haulage requires a revised estimate.",
    exclusions:
      "No contaminated spoil treatment, dam reconstruction, full pond rebuild or ecological mitigation. Sediment survey and disposal approval required.",
    basis:
      "North Texas contractor context supports separate excavation and haul/disposal allowances; unmeasured volume and spoil destination dominate uncertainty.",
    sources: ["pond"],
  },
  {
    id: "three-cows",
    normalized: [10500, 800, 1000, 2000, 1200],
    scope:
      "Three animals at assumed purchase allowances of $3,500 each, plus transport, veterinary checks and initial 90-day care allowances.",
    exclusions:
      "Permanent shelter, pasture fencing, dairy equipment and ongoing feed/staff costs are excluded.",
    basis:
      "Livestock purchase allowances, not breed-specific dairy-cow bids. Veterinary/specialist work is labor; startup care is in testing/startup. Confirm suitability before purchase.",
    sources: ["cattle"],
  },
  {
    id: "tractor-lawn-mower",
    normalized: [18000, 500, 700, 300, 1800],
    scope:
      "One new approximately 20–25 hp subcompact diesel tractor with mower deck, delivery and basic commissioning.",
    exclusions:
      "Front loader, other attachments, fuel and future maintenance are excluded. A cheaper riding mower is a different equipment scope.",
    basis:
      "Dealer-package allowance only; manufacturer specifications establish equipment class, not these prices.",
    sources: ["tractor"],
  },
  {
    id: "fruit-trees",
    normalized: [9000, 3500, 1000, 1500, 2000],
    scope:
      "70 nursery fruit trees at assumed $100 each, plus guards, stakes, local drip lines, paid planting, delivery, soil testing and initial care.",
    exclusions:
      "Mature-tree instant orchard, long water mains and ongoing orchard maintenance are excluded.",
    basis:
      "Nursery and landscape allowances, not a quoted species/size schedule. Select Texas-suitable varieties and obtain delivered nursery and planting bids.",
    sources: ["buildings"],
  },
  {
    id: "park-benches",
    normalized: [20300, 2300, 1500, 500, 2400],
    scope:
      "15 commercial six-foot benches with arms, anchors/small pads, installation and freight.",
    exclusions: "New path networks and larger landscape works are excluded.",
    basis:
      "Observed $1,281 FOB bench comparable anchors purchase cost; pads, freight, tax, installation and contingency are modeled separately.",
    sources: ["benches"],
  },
  {
    id: "holy-icons",
    normalized: [2000, 250, 300, 200, 450],
    scope:
      "Ten medium-size framed or mounted quality reproductions with delivery and secure installation; clergy approve subjects.",
    exclusions:
      "Hand-painted commissions and a custom iconostasis are excluded.",
    basis:
      "Normalized $200 per finished icon. Online small-print starting prices are not quotes for these framed sizes.",
    sources: ["icons"],
  },
  {
    id: "persian-rugs",
    normalized: [7000, 400, 500, 300, 1100],
    scope:
      "Seven approximately 8 × 10 ft Persian-style hand-knotted wool rugs, pads, delivery and safe placement.",
    exclusions:
      "Authentic antique Iranian carpets, larger custom sizes and ongoing cleaning are excluded.",
    basis:
      "Normalized rug purchases of $1,000 each informed by a retail wool comparable. Sale prices and availability can change.",
    sources: ["rugs"],
  },
  {
    id: "priests-relocation",
    normalized: [3500, 5000, 4000, 1800, 4500],
    scope:
      "One-time relocation of two priests: basic furnishings; legal/document services; airfare, baggage and ground transport; filing/consular allowances; and first 60 days of settling support.",
    exclusions:
      "Ongoing salary/stipends, housing after 60 days, insurance, dependents and premium processing are excluded. No immigration outcome is promised.",
    basis:
      "For this project the five rows mean furnishings, specialist services, travel, filing/startup and settling support respectively. Government fees are provisional, not verified fee quotations; obtain counsel and travel quotes.",
    sources: ["relocation"],
  },
  {
    id: "temporary-prayer-house",
    normalized: [22000, 15000, 3000, 4000, 6000],
    scope:
      "320 gross sq ft of conditioned, finished prayer space with foundation, electrical, accessible entrance and modest fixtures; not an unfinished storage shed.",
    exclusions:
      "Dedicated toilets are separate. Occupancy approval is not included as a guarantee. Confirm this is separate from, rather than an alternative to, the liturgy temple.",
    basis:
      "Normalized small-building allowance, approximately $172 per sq ft all-in. Small jobs carry substantial mobilization and compliance costs.",
    sources: ["buildings"],
  },
  {
    id: "temporary-dormitory",
    normalized: [1000000, 600000, 100000, 100000, 200000],
    scope:
      "40 rooms at 300 gross sq ft per room including shared bathrooms/circulation: 12,000 gross sq ft of modest finished low-rise lodging, HVAC, fire/life-safety systems and basic beds/furnishings.",
    exclusions:
      "Land, off-site utility extensions, major road upgrades and ongoing staffing/operations are excluded. Room sizes, occupancy model and utility capacity are unconfirmed.",
    basis:
      "Normalized approximately $183 per sq ft all-in, not container-shell pricing. Materials include $100,000 incremental water/wastewater upgrades beyond the separately budgeted initial septic/well, not duplicate initial plants.",
    sources: ["buildings", "septic"],
  },
];
// Same provisional quantities and compliant use as normalized; economical is a
// procurement/value-engineering target, not a promise that these savings exist.
const economicalInputs: Record<string, { amounts: Amounts; savings: string }> =
  {
    "fire-water-tank": {
      amounts: [17000, 5000, 1500, 3000, 3000],
      savings:
        "Standard vessel and fittings, straightforward pad and combined delivery; no reduction in professionally required fire-water capacity.",
    },
    "septic-tank": {
      amounts: [17000, 12000, 2500, 5000, 4500],
      savings:
        "Competitive packaged-system procurement and coordinated excavation, only if the engineer approves for the actual flow and soils.",
    },
    "public-bathrooms": {
      amounts: [60000, 38000, 6000, 10000, 10000],
      savings:
        "Compact standard layout, durable basic fixtures and finishes, and prefabricated components; preserve the assumed 600 sq ft and required accessibility/fixture counts.",
    },
    "temporary-liturgy-temple": {
      amounts: [190000, 100000, 16000, 35000, 35000],
      savings:
        "Simple rectangular pre-engineered shell, standard spans and modest finishes within the same assumed 3,000 sq ft; retain assembly-use compliance.",
    },
    "entrance-road-parking": {
      amounts: [72000, 36000, 9000, 12000, 14000],
      savings:
        "Competitive paving package, standard gate and coordinated earthworks for the same assumed paved area; base thickness and drainage remain engineer-designed.",
    },
    "aquifer-well": {
      amounts: [10000, 24000, 2500, 2000, 3500],
      savings:
        "Competitive licensed-driller package and standard pump/pressure equipment at the same provisional 600-foot depth; no assumed yield or reduction in testing.",
    },
    "holy-water-rooms": {
      amounts: [40000, 30000, 3000, 8000, 9000],
      savings:
        "Standard tile and plumbing fixtures with a shared service wall, preserving the 480 sq ft wet-room scope, waterproofing and accessibility.",
    },
    "cross-water-fountain": {
      amounts: [4000, 1500, 800, 500, 1000],
      savings:
        "Small standard basin and recirculating pump with a simple cross feature instead of bespoke stonework; no monumental sculpture.",
    },
    "lake-safety-fence": {
      amounts: [15000, 9500, 1000, 1400, 3500],
      savings:
        "Standard coated-metal panels and coordinated post installation for the same assumed 800 feet and two gates; design must still meet the required safety standard.",
    },
    "lake-restoration": {
      amounts: [1500, 11000, 6000, 3000, 3000],
      savings:
        "Dry-season scheduling and approved on-site spoil reuse for the same assumed 800 cubic yards. If off-site disposal is required, this target is not applicable.",
    },
    "three-cows": {
      amounts: [9000, 800, 800, 2000, 900],
      savings:
        "Locally sourced healthy suitable animals at an assumed $3,000 each and shared transport; veterinary checks and initial care retained, subject to availability.",
    },
    "tractor-lawn-mower": {
      amounts: [14000, 500, 500, 300, 1300],
      savings:
        "Dealer-inspected used subcompact tractor and mower deck rather than a new package; obtain condition, service-history and warranty information.",
    },
    "fruit-trees": {
      amounts: [6500, 2800, 700, 1500, 1300],
      savings:
        "Smaller healthy nursery stock, bulk purchase and grouped planting for all 70 trees; fruit yield will take longer than with larger stock.",
    },
    "park-benches": {
      amounts: [17000, 2000, 1200, 500, 1800],
      savings:
        "Simpler commercial bench models, volume ordering and consolidated freight for all 15 benches; retain durable anchoring.",
    },
    "holy-icons": {
      amounts: [1400, 200, 200, 200, 300],
      savings:
        "Standard mounted reproductions and simple frames for all ten icons, with clergy approval; not commissioned hand-painted work.",
    },
    "persian-rugs": {
      amounts: [4200, 300, 400, 300, 700],
      savings:
        "Seven modest Persian-style machine-made wool/blend rugs with pads instead of hand-knotted rugs. Material and craft quality differ; obtain samples.",
    },
    "priests-relocation": {
      amounts: [2500, 4000, 3000, 1800, 3500],
      savings:
        "Basic furnishings, flexible travel dates and competitively quoted professional services for two priests. No reduction in required filings or first-60-day support duration.",
    },
    "temporary-prayer-house": {
      amounts: [18000, 12500, 2500, 4000, 4500],
      savings:
        "Standard prefabricated small-building shell and simple finishes within the same 320 sq ft, with compliant foundation, access and finished interior.",
    },
    "temporary-dormitory": {
      amounts: [830000, 500000, 80000, 100000, 150000],
      savings:
        "Repetitive modular layout, basic shared amenities and standard furnishings for the same 40-room / 12,000 sq ft assumption; retain the $100,000 incremental utility-upgrade allowance and required life-safety systems.",
    },
  };
export function scenarioTotal(amounts: readonly number[], rate: number) {
  const subtotal = amounts.reduce((sum, value) => sum + value, 0);
  const contingency = Math.round((subtotal * rate) / 100) * 100;
  return { subtotal, contingency, total: subtotal + contingency };
}
export const constructionEstimates = inputs.map((project) => ({
  ...project,
  economical: economicalInputs[project.id].amounts,
  savings: economicalInputs[project.id].savings,
  highPriority: (highPriorityIds as readonly string[]).includes(project.id),
  normalizedTotal: scenarioTotal(project.normalized, 0.1),
  economicalTotal: scenarioTotal(economicalInputs[project.id].amounts, 0.1),
}));
export const estimateTotals = constructionEstimates.reduce(
  (s, p) => ({
    normalized: s.normalized + p.normalizedTotal.total,
    economical: s.economical + p.economicalTotal.total,
  }),
  { normalized: 0, economical: 0 },
);
export const highPriorityTotals = constructionEstimates
  .filter((p) => p.highPriority)
  .reduce(
    (s, p) => ({
      normalized: s.normalized + p.normalizedTotal.total,
      economical: s.economical + p.economicalTotal.total,
    }),
    { normalized: 0, economical: 0 },
  );
