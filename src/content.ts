import manifest from "../assets/audio/processed/manifest.json";
import recordingTitles from "../assets/audio/processed/titles.json";
export const site = {
  name: "Arbahara",
  fullName: "Monastery of Abuna Hara Dengeel",
  faith: "Ethiopian Orthodox Tewahedo Church",
  email: "support@haramonastery.org",
  phone: "214 803 1347",
  phone2: "469 212 6370",
  mailing: "P.O. Box 850721, Richardson, TX 75085-0721",
  location: "Crandall, Texas",
  zelle:
    "https://enroll.zellepay.com/qr-codes?data=eyJuYW1lIjoiTU9OQVNURVJZIE9GIEFCVU5BIEhBUkEgREVOR0VFTCIsInRva2VuIjoiYXJiYWhhcmEyN0BnbWFpbC5jb20iLCJhY3Rpb24iOiJwYXltZW50In0=",
  zelleRecipient: "arbahara27@gmail.com",
  facebook: "https://facebook.com/40hara",
  youtube: "https://youtube.com/@Arbaharadallas",
  url: "https://www.haramonastery.org",
};
export const invocation =
  "In the name of the Father, and of the Son, and of the Holy Spirit, one God.";
export const appeal = [
  "With joy and thanksgiving to God, we announce the establishment of the Monastery of Abuna Hara Dengeel, a new sanctuary for the Ethiopian Orthodox Tewahedo Church. Through His grace, we have secured a ten-acre property in Crandall, Texas, a peaceful setting for spiritual retreat, prayer, and divine worship.",
  "This tranquil haven includes a four-bedroom residence, a peaceful lake, and a two-door garage that we are preparing to transform into an assembly hall for congregational prayer, with consecration and its sacred use under the guidance of our clergy.",
  "We also look with hope toward the aquifer beneath the land and the possibility of drilling a well for tsebel, holy water. This work will require professional assessment, the necessary permissions, and the blessing and guidance of the Church. We pray that this place may become a source of spiritual comfort and blessing for the faithful.",
  "Remember, “The hand that gives is more blessed than the hand that receives.” In the words of our Lord, “It is more blessed to give than to receive” (Acts 20:35).",
  "This work depends on your prayers and generous contributions. We appeal to your conscience and faith to help us move forward with the development of this house of God: preparing a place to gather, caring for the land, and building for those who will come after us.",
  "May the Lord reward your faithfulness and bless your generosity a hundredfold. May He remember you and your families in His mercy, and establish the work of our hands. Amen.",
];
export type Announcement = {
  slug: string;
  title: string;
  published: string;
  displayDate: string;
  excerpt: string;
  paragraphs: string[];
  photos?: {
    src: string;
    alt: string;
    caption: string;
    width: number;
    height: number;
  }[];
};
export const announcements: Announcement[] = [
  {
    slug: "grand-opening-ceremony",
    title: "Our Grand Opening: a beginning blessed by prayer",
    published: "2026-10-27",
    displayDate: "Published October 27, 2026",
    excerpt:
      "About 50 people gathered for our monastery’s Grand Opening, sharing prayer and a blessed feast beneath the tents. Together, this small gathering raised $50,000 for the work ahead.",
    paragraphs: [
      "In the name of the Father, and of the Son, and of the Holy Spirit, one God.",
      "With hearts full of thanksgiving, we celebrate the Grand Opening Ceremony of the Monastery of Abuna Hara Dengeel. This joyful gathering commemorated the beginning of our monastery’s life together: a place being prepared for prayer, worship, hospitality, and the generations to come.",
      "About 50 people came together for the ceremony. Though our gathering was small, its generosity was remarkable: together, we raised $50,000 for the monastery. We are deeply grateful to everyone who gave, served, prayed, and helped make this beginning possible.",
      "We were blessed by the presence of clergy, who joined us in prayer and blessed the feast. Their presence helped make the occasion a deeply meaningful beginning, bringing our spiritual family together in gratitude to God.",
      "Afterward, we sat and ate outside beneath the tents, sharing food and fellowship on the monastery grounds. These simple shelters called to mind Israel’s journey before entering the Promised Land: a people traveling in faith, sustained along the way, with hope for what lay ahead. For our community, the meal was a reminder that we can begin walking together even while our permanent places of worship and gathering are still being prepared.",
      "We are very pleased with the ceremony and thankful for the care that went into it—from preparing the feast and arranging the tents to welcoming families and supporting the work of the monastery. The photographs below preserve moments from this shared beginning.",
      "This Grand Opening is a beginning, not the completion of our work. With the guidance of our clergy and the prayers and generosity of our spiritual family, we look forward to caring for this land and preparing a lasting home for worship and service. May God bless all who have helped establish the Monastery of Abuna Hara Dengeel, and guide the work still before us. Amen.",
    ],
    photos: [
      {
        src: "/assets/images/grand-opening/blessing-the-feast.webp",
        width: 360,
        height: 480,
        alt: "Clergy and community members gather beside a table of food beneath an outdoor canopy.",
        caption:
          "Clergy join the community at the feast, blessed before the shared meal.",
      },
      {
        src: "/assets/images/grand-opening/gathered-for-prayer.webp",
        width: 360,
        height: 480,
        alt: "Members seated outdoors face clergy gathered at a table on the residence porch.",
        caption:
          "Our spiritual family gathers for the ceremony on the monastery grounds.",
      },
      {
        src: "/assets/images/grand-opening/clergy-at-the-ceremony.webp",
        width: 600,
        height: 800,
        alt: "Three clergy members stand behind a covered table on the porch, with one speaking into a microphone.",
        caption:
          "The presence and prayers of our clergy mark this joyful beginning.",
      },
      {
        src: "/assets/images/grand-opening/voices-from-the-porch.webp",
        width: 360,
        height: 480,
        alt: "Two participants stand with papers on the shaded porch during the gathering.",
        caption:
          "Words shared with the community during the Grand Opening ceremony.",
      },
      {
        src: "/assets/images/grand-opening/sacred-images-in-the-shade.webp",
        width: 360,
        height: 480,
        alt: "Sacred images stand along the residence porch beside chairs and a large shade tree.",
        caption:
          "Sacred images and the shade of the trees form part of the gathering place.",
      },
      {
        src: "/assets/images/grand-opening/a-message-to-the-community.webp",
        width: 480,
        height: 640,
        alt: "A speaker holding a blue folder addresses the gathering from the porch.",
        caption:
          "A message shared with those gathered to commemorate the monastery’s beginning.",
      },
      {
        src: "/assets/images/grand-opening/fellowship-beneath-the-tents.webp",
        width: 240,
        height: 320,
        alt: "Community members gather under white canopies among trees on the monastery grounds.",
        caption:
          "Fellowship beneath the tents: sharing a meal and looking ahead in faith.",
      },
    ],
  },
  {
    slug: "establishment-of-abuna-hara-dengeel-monastery",
    title: "A new sanctuary for our spiritual family",
    published: "2026-09-27",
    displayDate: "September 27, 2026",
    excerpt:
      "With profound joy, we announce the establishment of the Monastery of Abuna Hara Dengeel and invite our spiritual family to help build this house of God.",
    paragraphs: [
      "In the name of the Father, and of the Son, and of the Holy Spirit, one God.",
      "To our cherished spiritual family and supporters,",
      "We are filled with profound joy as we announce the establishment of the Monastery of Abuna Hara Dengeel, a new sanctuary for the Ethiopian Orthodox Tewahedo Church. Through the grace of God, we have secured a ten-acre property that offers a serene and sacred environment, perfectly suited for spiritual retreat and divine worship.",
      "This tranquil haven includes a four-bedroom residence, a peaceful lake, and a versatile two-door garage that we are preparing to transform into a consecrated assembly hall for congregational prayers. Furthermore, the land is blessed with an aquifer that holds the great promise of drilling for holy water, TSEBEL, bringing healing and blessings to the faithful.",
      'Remember, "The hand that gives is more blessed than the hand that receives."',
      "This monumental work is only possible through your prayers and generous contributions. Hence, we appeal to your conscience and faith to help us move forward with these vital development projects to complete this house of God. May the Lord reward your faithfulness and bless your generosity a hundredfold.",
    ],
  },
];
export const phases = [
  {
    title: "Prepare a place to gather",
    text: "Renovate and extend the existing garage for congregational prayer. The earlier plan envisages 250–300 seats; final capacity depends on design, permitting, and safety approvals.",
  },
  {
    title: "Plan and prepare the land",
    text: "Complete surveying, architectural and engineering work, permitting, access, utilities, and site preparation. Assess the proposed well and water supply.",
  },
  {
    title: "Build the church and monastery",
    text: "Develop a permanent Ethiopian Orthodox Tewahedo church and monastery, with the sacred spaces planned under ecclesiastical guidance.",
  },
  {
    title: "Welcome and care for people",
    text: "Plan monks’ residences, guest accommodations, senior care, meeting rooms, and educational spaces as resources and approvals allow.",
  },
  {
    title: "Provide for future generations",
    text: "Develop theological education, youth technology learning, farming, and beekeeping. The long-term campus vision also includes a burial area, subject to the required approvals.",
  },
];
export const resources = [
  {
    title: "Saint Yared and sacred hymnody",
    text: "Read about the saint remembered for the Church’s sacred chant and a life of prayer.",
    source: "Mahibere Kidusan",
    href: "https://eotcmk.org/e/feast-of-saint-yared/",
  },
  {
    title: "Our Holy Mother Saint Mary",
    text: "An introduction to the Church’s teaching on the honor and perpetual virginity of Saint Mary.",
    source: "Mahibere Kidusan",
    href: "https://eotcmk.org/e/mariology/",
  },
  {
    title: "The seven sacraments",
    text: "A Sunday school introduction to Baptism, Myron, Holy Communion, Ordination, Matrimony, Penance, and Unction of the Sick.",
    source: "Mahibere Kidusan",
    href: "https://eotcmk.org/e/the-seven-sacraments/",
  },
  {
    title: "Belief, worship, and monastic life",
    text: "Explore a library of Ethiopian Orthodox teachings, liturgical music, history, and monastic life.",
    source: "Nine Saints Ethiopian Orthodox Monastery",
    href: "https://ninesaintsethiopianorthodoxmonastery.org/",
  },
  {
    title: "Life in a Tewahedo parish",
    text: "Visit the website of Saint Mary’s Ethiopian Orthodox Tewahedo Church in Los Angeles.",
    source: "Saint Mary’s EOTC",
    href: "https://www.ethiopianorthodoxchurch.org/",
  },
  {
    title: "Continue learning",
    text: "Read articles and Sunday school lessons from the Ethiopian Orthodox Tewahedo Church Sunday School Department.",
    source: "Mahibere Kidusan",
    href: "https://eotcmk.org/e/",
  },
];
export type ArchiveItem = {
  id: string;
  title: string;
  description: string;
  kind: string;
  date: string;
  url: string;
  duration?: number;
  rights?: string;
  protectedFile?: boolean;
};
export const archiveItems: ArchiveItem[] = [
  ...manifest.recordings.map((r) => ({
    id: `meeting-${r.date}`,
    title:
      (recordingTitles as Record<string, string>)[r.date] ||
      `Community meeting · ${r.displayDate}`,
    description:
      "Meeting recording preserved from the monastery’s existing archive. Audio is available to listen to or download; a transcript has not yet been published.",
    kind: "recording",
    date: r.date,
    url: r.path,
    duration: r.durationSeconds,
    rights: "Arbahara monastery recording collection",
  })),
  {
    id: "master-plan",
    title: "Conceptual campus master plan",
    description:
      "Full campus concept and numbered legend. This is a planning document, not an approved construction drawing.",
    kind: "document",
    date: "2026-08-13",
    url: "/assets/images/monastery-campus-master-plan.png",
    rights: "Monastery site-plan collection",
  },
  ...[0, 1, 2].map((n) => ({
    id: `plan-${n}`,
    title: `Site plan · sheet ${n + 1}`,
    description:
      "Preserved planning reference from the monastery’s original website.",
    kind: "document",
    date: "",
    url: `/assets/docs/medhanialem-site-plan-0${n}.png`,
    rights: "Monastery site-plan collection",
  })),
  {
    id: "property",
    title: "The Crandall property",
    description:
      "Photographs of the acquired property. Interior listing images marked “Virtually Staged” show illustrative furnishings.",
    kind: "photograph",
    date: "",
    url: "/gallery",
    rights:
      "Existing property listing collection; retained with original markings",
  },
];
export const pageMeta: Record<
  string,
  { title: string; description: string; image?: string }
> = {
  "/calendar": {
    title: "Community calendar | Arbahara",
    description:
      "Ethiopian and Gregorian dates for the monthly Arbahara Mahiber and Medhanialem Ziker, with a downloadable calendar.",
  },
  "/": {
    title: "Arbahara Monastery | A home for prayer. A legacy of faith.",
    description:
      "Discover Arbahara, an Ethiopian Orthodox Tewahedo monastery growing on ten acres in Crandall, Texas. Learn, give, and become part of our community.",
  },
  "/monastery": {
    title: "Our monastery | Arbahara",
    description:
      "Our story, the acquired Crandall property, and the phased vision for a permanent monastery campus.",
  },
  "/faith": {
    title: "Faith & learning | Arbahara",
    description:
      "Ethiopian Orthodox Tewahedo resources on the saints, sacraments, worship, and monastic life.",
  },
  "/archive": {
    title: "Church archive | Arbahara",
    description:
      "Listen to meeting recordings and explore the monastery’s plans, photographs, and community records.",
  },
  "/announcements": {
    title: "Announcements & reflections | Arbahara",
    description:
      "Read announcements, pastoral messages, and reflections from the Monastery of Abuna Hara Dengeel.",
  },
  "/announcements/establishment-of-abuna-hara-dengeel-monastery": {
    title: "A new sanctuary for our spiritual family | Arbahara",
    description:
      "The founding announcement of the Monastery of Abuna Hara Dengeel and an invitation to help build this house of God.",
  },
  "/announcements/grand-opening-ceremony": {
    title: "Grand Opening Ceremony | Arbahara Monastery",
    description:
      "Remember our monastery’s Grand Opening: about 50 people gathered with clergy for prayer and a blessed feast under tents, raising $50,000 for the work ahead. See seven photographs from the ceremony.",
    image: "/assets/images/grand-opening/clergy-at-the-ceremony.webp",
  },
  "/gallery": {
    title: "Photographs & films | Arbahara",
    description:
      "View the monastery’s existing collection of property photographs, sacred art, and community films.",
  },
  "/visit": {
    title: "Visit & contact | Arbahara",
    description:
      "Contact the monastery office for current service times, visiting arrangements, accessibility, and membership.",
  },
  "/donate": {
    title: "Help build this house of God | Arbahara",
    description:
      "Read our appeal and support the monastery through Zelle or the member giving portal.",
  },
  "/events": {
    title: "Gatherings & events | Arbahara",
    description:
      "Find published monastery gatherings and reserve your member event ticket.",
  },
  "/members": {
    title: "Member portal | Arbahara",
    description:
      "Secure member sign-in for membership, giving records, and event tickets.",
  },
  "/sms": {
    title: "Optional text messages | Arbahara",
    description: "Optional text messages",
  },
  "/privacy": {
    title: "Privacy notice | Arbahara",
    description:
      "How Arbahara uses and protects member information and donation records.",
  },
  "/terms": {
    title: "Website & giving terms | Arbahara",
    description:
      "Terms for using the monastery website, giving portal, and event registration.",
  },
  "/am": {
    title: "አርባሐራ ገዳም | Arbahara",
    description: "የገዳሙ መረጃ፣ አባልነት፣ ልገሳ እና መገናኛ።",
  },
  "/store": {
    title: "Home blessing cross | Arbahara",
    description:
      "Support the monastery through the existing home blessing cross offering.",
  },
  "/store-success": {
    title: "Thank you | Arbahara",
    description: "Your checkout return and next steps.",
  },
};
