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
};
export const announcements: Announcement[] = [
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
export const pageMeta: Record<string, { title: string; description: string }> =
  {
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
