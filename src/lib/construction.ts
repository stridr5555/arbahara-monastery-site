export const constructionProjects = [
  ["Fire emergency water tank", 10000],
  ["Septic tank", 35000],
  ["Public bathrooms — men and women", 90000],
  ["Temporary liturgy temple", 350000],
  ["Entrance road and 50-space parking", 90000],
  ["Aquifer well", 27000],
  ["Holy water baptismal rooms", 50000],
  ["Cross water fountain", 2000],
  ["Lake safety fence", 2500],
  ["Clean the lake", 35000],
  ["Three cows", 9000],
  ["Tractor lawn mower", 5000],
  ["Seventy fruit trees", 7000],
  ["Fifteen park benches", 9750],
  ["Ten holy icons", 5000],
  ["Seven Persian rugs", 14000],
  ["Relocate two priests from Ethiopia", 12000],
  ["Temporary prayer house", 5000],
  ["40-room temporary dormitory", 400000],
] as const;
export const constructionTotal = constructionProjects.reduce(
  (sum, [, amount]) => sum + amount,
  0,
);
export const constructionSource =
  "https://docs.google.com/document/d/1ar4FB1dn25miUdcNpG9LlaZytBXKm8j7G60_NEmKbS4/edit";

// Titles, quantities, Amharic labels and estimates follow the illustrated budget.
// Purpose and planning checks are explanatory copy, not approved specifications.
const illustrations = [
  [
    "fire-water-tank",
    "የእሳት አደጋ መከላከያ ውሃ ገንዳ",
    "Water ready when it matters.",
    "A dedicated reserve for emergency fire response helps prepare the monastery to welcome its community.",
    "Capacity, location and connections require professional review.",
  ],
  [
    "septic-tank",
    "የቆሻሻ ማጠራቀሚያ",
    "The foundations of everyday care.",
    "A wastewater system supports the daily needs of residents, worshippers and visiting families.",
    "Site suitability, soil testing, system sizing and permits must be assessed before installation.",
  ],
  [
    "public-bathrooms",
    "የሕዝብ መጸዳጃ ቤት (የወንድና የሴት)",
    "Dignity and comfort for every visitor.",
    "Separate public bathrooms for men and women are part of preparing the grounds for gatherings and longer visits.",
    "Accessible routes, fixture counts, plumbing and maintenance arrangements need design review.",
  ],
  [
    "temporary-liturgy-temple",
    "ቅዳሴ ቤት (ጊዜያዊ)",
    "A place to gather in worship.",
    "A temporary liturgy temple would provide a dedicated setting for congregational prayer while the permanent monastery vision develops.",
    "Clergy guidance, occupancy, accessibility, fire safety and building approvals will shape the final design.",
  ],
  [
    "entrance-road-parking",
    "ወደ ግቢው መግቢያ በር፣ መንገድና መኪና ማቆሚያ (50)",
    "A welcoming way into the grounds.",
    "The proposal brings together an entrance, an access road and parking for 50 vehicles to make community arrivals more organized.",
    "Drainage, emergency access, accessible parking and the final layout require site assessment.",
  ],
  [
    "aquifer-well",
    "የውሃ ጉድጓድ ማስቆፈሪያ (ለጸበል)",
    "Preparing a source of water.",
    "The budget includes drilling an aquifer well for the monastery’s holy-water ministry, subject to what a professional investigation establishes.",
    "Water availability, drilling permissions, water quality and treatment needs are not yet established by this illustration.",
  ],
  [
    "holy-water-rooms",
    "መጠመቂያ ከፍሎች (የወንድና የሴት)",
    "A reverent setting for holy water.",
    "Separate rooms for men and women would support the monastery’s holy-water baptismal practice with privacy and care.",
    "Clergy guidance, accessibility, drainage, hygiene and safe water provision require detailed planning.",
  ],
  [
    "cross-water-fountain",
    "የውሃ ፋውንቴን (ባለ መስቀል)",
    "A quiet point of reflection.",
    "A cross fountain is proposed as a devotional feature within the grounds, bringing the sound of flowing water to a place of prayer.",
    "Location, circulation, water supply and ongoing upkeep must be considered.",
  ],
  [
    "lake-safety-fence",
    "ሐይቁን መከለል (ለሕፃናት ደህንነት)",
    "Care for the youngest among us.",
    "A protective boundary around the lake is proposed with children’s safety in mind. Fencing does not replace adult supervision.",
    "Fence height, gate security, placement and applicable safety requirements need professional assessment.",
  ],
  [
    "lake-restoration",
    "ሐይቁን ማጽዳት",
    "Stewardship of the lake.",
    "Cleaning and caring for the lake would help preserve a peaceful natural setting for the monastery and its visitors.",
    "The scope of work depends on water conditions, ecological advice and any required permissions.",
  ],
  [
    "three-cows",
    "የሦስት ላሞች ዋጋ",
    "Nurturing life on the land.",
    "The budget proposes three cows as part of the monastery’s agricultural life and everyday stewardship.",
    "Suitable pasture, shelter, fencing, veterinary care and a long-term care plan are needed.",
  ],
  [
    "tractor-lawn-mower",
    "የሣር ማጨጃ",
    "Keeping the grounds welcoming.",
    "A tractor lawn mower would support routine groundskeeping across the property and help maintain spaces used by the community.",
    "Terrain, equipment suitability, safe storage, operator training and maintenance costs require review.",
  ],
  [
    "fruit-trees",
    "የፍራፍሬ ዛፎች (70)",
    "Planting for the generations ahead.",
    "Seventy fruit trees are proposed for an orchard that can grow alongside the monastery’s community.",
    "Tree varieties, soil, irrigation, spacing and seasonal care must suit the local climate.",
  ],
  [
    "park-benches",
    "አግዳሚ ወንበሮች (15)",
    "Room to pause together.",
    "Fifteen park benches would offer places to rest, share conversation and reflect along the monastery’s outdoor spaces.",
    "Accessible placement, shade, stable foundations and durable materials will guide selection.",
  ],
  [
    "holy-icons",
    "የቅዱሳን ስዕሎች (10)",
    "Sacred images for a life of prayer.",
    "Ten holy icons are included in the proposal to support the monastery’s worship and Ethiopian Orthodox devotional tradition.",
    "Icon subjects, artists, placement and care will be guided by the clergy.",
  ],
  [
    "persian-rugs",
    "የአበባ ምንጣፎች (7)",
    "Preparing the worship space with care.",
    "Seven floral Persian rugs are proposed as furnishings for the monastery’s prayer and worship spaces.",
    "Final dimensions, placement, cleaning and safe circulation need to be considered before purchase.",
  ],
  [
    "priests-relocation",
    "ሁለት ካህናት ከኢትዮጵያ ማስመጣት",
    "Welcoming those who will serve.",
    "The proposal includes support to relocate two priests from Ethiopia for the monastery’s spiritual and pastoral life.",
    "Travel, lawful immigration arrangements, accommodation and ongoing support require separate coordination.",
  ],
  [
    "temporary-prayer-house",
    "ጊዜያዊ የጸሎት ቤት",
    "A modest place for quiet prayer.",
    "A temporary prayer house is listed separately from the liturgy temple, providing another proposed setting for devotion.",
    "Its purpose, location, capacity and relationship to other worship spaces need confirmation with the clergy.",
  ],
  [
    "temporary-dormitory",
    "የጸበልተኞች መቆያ 40 ክፍሎች (የወንዶችና የሴቶች)",
    "Hospitality for a longer stay.",
    "A temporary 40-room dormitory is proposed for holy-water visitors, with separate accommodation for men and women.",
    "Room arrangements, accessibility, utilities, sanitation, safeguarding and occupancy approvals require detailed design.",
  ],
] as const;

export const constructionDetails = constructionProjects.map(
  ([title, cost], i) => {
    const [id, amharic, lead, description, checks] = illustrations[i];
    return {
      id,
      title,
      cost,
      amharic,
      lead,
      description,
      checks,
      image: `/assets/images/planning/${id}.webp`,
      thumbnail: `/assets/images/planning/${id}-thumb.webp`,
    };
  },
);
export type ConstructionProject = (typeof constructionDetails)[number];
