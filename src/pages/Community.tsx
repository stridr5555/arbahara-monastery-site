import { useState } from "react";
import { DepthFrame } from "../components/Motion";
import { ArrowUpRight, MapPin, Mail, Phone } from "lucide-react";
import { site, phases, resources, invocation } from "../content";
import { PageIntro, TextLink, LinkButton } from "../components/Layout";
export function Monastery() {
  return (
    <div className="wrap">
      <PageIntro title="Rooted in faith. Growing together.">
        The story and vision of {site.fullName}.
      </PageIntro>
      <section className="editorial-split">
        <div className="prose">
          <p className="invocation">{invocation}</p>
          <h2>A beginning in Crandall</h2>
          <p>
            Through the grace of God and the support of our spiritual family, we
            have secured a ten-acre property in Crandall, Texas. Here we hope to
            establish a lasting home for prayer, the Divine Liturgy, spiritual
            retreat, and service within the Ethiopian Orthodox Tewahedo Church.
          </p>
          <p>
            The property includes a four-bedroom residence, a peaceful lake, and
            a two-door garage. Our first building priority is to prepare the
            garage as a place for congregational prayer, with its sacred use and
            consecration under ecclesiastical guidance.
          </p>
          <p>
            We also hope to explore the aquifer beneath the land and the
            possibility of a well for tsebel, holy water. Professional
            assessment and required permissions must accompany the Church’s
            blessing and direction.
          </p>
          <p>
            We build for those who will pray here after us. Our shared records,
            photographs, and teachings preserve the story of these beginnings so
            that future generations can know the faith and care behind them.
          </p>
        </div>
        <figure>
          <img
            className="landscape"
            src="/assets/property/land-02.webp"
            width="2344"
            height="1310"
            alt="Aerial view of the existing residence surrounded by trees"
          />
          <figcaption>
            The acquired Crandall property. Existing residence.
          </figcaption>
          <div className="property-facts">
            <span>
              <strong>10 acres</strong>Land acquired
            </span>
            <span>
              <strong>Crandall</strong>Texas
            </span>
          </div>
        </figure>
      </section>
      <section className="section" id="plans">
        <div className="section-heading">
          <div>
            <span className="section-label">The campus vision</span>
            <h2>A place for generations.</h2>
          </div>
          <TextLink
            href="/assets/images/monastery-campus-master-plan.png"
            external
          >
            Open full-size plan
          </TextLink>
        </div>
        <figure className="master-plan">
          <a
            href="/assets/images/monastery-campus-master-plan.png"
            target="_blank"
            rel="noreferrer"
          >
            <img
              loading="lazy"
              width="1448"
              height="1086"
              src="/assets/images/monastery-campus-master-plan.png"
              alt="Conceptual campus master plan with the complete numbered legend"
            />
          </a>
          <figcaption>
            Conceptual campus master plan, preserved from the existing monastery
            records. Facilities shown are proposed and remain subject to design,
            funding, and approvals.
          </figcaption>
        </figure>
        <ol className="phase-list">
          {phases.map((p, i) => (
            <li key={p.title}>
              <span className="phase-number">0{i + 1}</span>
              <div>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
              <span className="status">Planned</span>
            </li>
          ))}
        </ol>
      </section>
      <section className="callout">
        <h2>There is work for many hands.</h2>
        <p>
          Support the construction fund, volunteer your skills, or help preserve
          the monastery’s records. Contact the office to discuss how you can
          serve.
        </p>
        <div className="actions">
          <LinkButton href="/donate">Support the monastery</LinkButton>
          <LinkButton href="/visit" secondary>
            Speak with the office
          </LinkButton>
        </div>
      </section>
    </div>
  );
}
export function Faith() {
  return (
    <div className="wrap">
      <PageIntro title="Receive the faith. Pass it on.">
        Learning within the Ethiopian Orthodox Tewahedo tradition.
      </PageIntro>
      <div className="faith-intro">
        <p className="invocation">{invocation}</p>
        <div className="two-columns">
          <div>
            <h2>A life of prayer and worship</h2>
            <p>
              The monastery’s purpose is to nurture a life centered on Christ
              through prayer, the Divine Liturgy, the sacraments, fasting,
              charity, and fellowship. Families, elders, and young people each
              have a place in preserving this living tradition.
            </p>
          </div>
          <div>
            <h2>Learn with the Church</h2>
            <p>
              These resources come from Ethiopian Orthodox Tewahedo church
              organizations. They offer a starting point for study. For personal
              spiritual guidance, preparation for the sacraments, or questions
              about fasting and worship, speak with your spiritual father or the
              monastery clergy.
            </p>
            <TextLink href="/visit">Ask the monastery office</TextLink>
          </div>
        </div>
      </div>
      <section className="section">
        <div className="section-heading">
          <h2>
            The saints, the mysteries,
            <br />
            and the life of the Church.
          </h2>
          <span className="small">Ethiopian Orthodox Tewahedo sources</span>
        </div>
        <div className="resource-list">
          {resources.map((r, i) => (
            <article key={r.href}>
              <span className="resource-index">0{i + 1}</span>
              <div>
                <p className="section-label">{r.source}</p>
                <h3>
                  <a href={r.href} target="_blank" rel="noreferrer">
                    {r.title}
                    <ArrowUpRight size={23} />
                  </a>
                </h3>
                <p>{r.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="callout">
        <h2>Help a younger generation learn.</h2>
        <p>
          The campus vision includes theological education and youth learning.
          Members can register an interest in education, volunteering, and
          archive preservation through their profile.
        </p>
        <LinkButton href="/members">Offer your time</LinkButton>
      </section>
    </div>
  );
}
export function Visit() {
  return (
    <div className="wrap">
      <PageIntro title="Peace be with you.">
        Whether you are coming home to the Church or visiting for the first
        time, you are welcome to get in touch.
      </PageIntro>
      <section className="visit-grid" id="contact">
        <div className="prose">
          <h2>Plan your visit</h2>
          <p>
            Our acquired property is in Crandall, Texas. The campus is in
            development. Please contact the monastery office before travelling
            for current worship arrangements, service times, the exact visiting
            address, and access instructions.
          </p>
          <p>
            The Richardson P.O. Box is our mailing address, not a worship or
            visitor location.
          </p>
          <div className="contact-rows">
            <a href="tel:+12148031347">
              <Phone />
              <span>
                {site.phone}
                <small>Monastery contact</small>
              </span>
              <ArrowUpRight />
            </a>
            <a href="tel:+14692126370">
              <Phone />
              <span>
                {site.phone2}
                <small>Additional contact</small>
              </span>
              <ArrowUpRight />
            </a>
            <a href={`mailto:${site.email}`}>
              <Mail />
              <span>
                {site.email}
                <small>Questions, visits, and membership</small>
              </span>
              <ArrowUpRight />
            </a>
            <div>
              <MapPin />
              <span>
                {site.mailing}
                <small>Mailing address only</small>
              </span>
            </div>
          </div>
        </div>
        <aside className="visit-note">
          <span className="section-label">Your first visit</span>
          <h2>
            Come as a guest.
            <br />
            Be met with care.
          </h2>
          <p>
            Let the office know that you are visiting for the first time. Ask
            about the service, appropriate dress, and any practical arrangements
            for your family.
          </p>
          <p>
            Our clergy can guide you on participation in the sacraments. A
            website account or a financial gift is not a condition of seeking
            pastoral care.
          </p>
          <TextLink href="/events">See published gatherings</TextLink>
        </aside>
      </section>
      <section className="section two-columns" id="accessibility">
        <div>
          <h2>Access and assistance</h2>
          <p>
            If you need step-free access, seating assistance, interpretation, or
            another accommodation, please speak with the office before your
            visit so arrangements can be discussed.
          </p>
          <p>
            This website supports keyboard navigation, visible focus, screen
            readers, text resizing, and reduced motion. Audio transcripts will
            be added as they become available. Contact us if a document or page
            is difficult to use.
          </p>
        </div>
        <div>
          <h2>Stay in touch</h2>
          <p>
            Follow the monastery’s existing community channels for announcements
            and reflections. Confirm time-sensitive arrangements with the
            office.
          </p>
          <div className="actions">
            <TextLink href={site.facebook} external>
              Facebook
            </TextLink>
            <TextLink href={site.youtube} external>
              YouTube
            </TextLink>
            <TextLink href="/am">አማርኛ</TextLink>
          </div>
        </div>
      </section>
    </div>
  );
}
const photoLabels: Record<number, string> = {
  1: "Existing residence and grounds",
  2: "Aerial view of the residence",
  3: "Property listing photograph",
  4: "Living room, virtually staged",
  5: "Property listing photograph",
  6: "Property listing photograph",
  7: "Kitchen in the existing residence",
  8: "Dining area, virtually staged",
  9: "Bedroom, virtually staged",
  10: "Bathroom, virtually staged",
};
export function Gallery() {
  const [filter, setFilter] = useState("collection");
  return (
    <div className="wrap">
      <PageIntro title="A place. A people. A shared memory.">
        Photographs and films preserved from the monastery’s existing
        collection.
      </PageIntro>
      <div className="filter-row" aria-label="Gallery collections">
        {[
          ["collection", "Original collection"],
          ["property", "The property"],
          ["sacred", "Sacred art"],
          ["films", "Community films"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {filter === "collection" ? (
        <>
          <p className="small">
            The photographs, sacred images, and visual records from our original
            website. Historical images are preserved as part of the collection,
            not as photographs of completed facilities in Texas.
          </p>
          <div className="original-gallery">
            {[
              [
                "meditation-portrait.png",
                "Portrait from the original collection",
              ],
              ["community-gathering.jpg", "Community gathering"],
              ["pilgrims.jpg", "Pilgrimage"],
              ["mountain-temple.jpg", "Mountain sanctuary"],
              ["choral-procession.jpg", "Choral procession"],
              ["hall-night.jpg", "Evening gathering place"],
              ["calcite.jpg", "Stone detail"],
              ["assembly.jpg", "Assembly"],
              ["jesus-icon.png", "Icon of Christ"],
              ["saint-portrait.jpg", "Sacred portrait"],
              ["announcement.jpg", "Community announcement"],
              ["view-terrace.jpg", "Terrace view"],
              ["flowers.jpg", "Garden flowers"],
              ["arch-mural.jpg", "Arch and mural"],
              ["axum-vision.png", "Axum visual reference"],
            ].map(([file, label]) => (
              <DepthFrame key={file}>
                <figure>
                  <a
                    href={`/assets/images/${file}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={`/assets/images/${file}`}
                      alt={`${label} from the original monastery collection`}
                      loading="lazy"
                    />
                  </a>
                  <figcaption>{label}</figcaption>
                </figure>
              </DepthFrame>
            ))}
          </div>
        </>
      ) : filter === "property" ? (
        <>
          <p className="small">
            Original property listing photographs. Images marked “Virtually
            Staged” contain illustrative furnishings and do not document the
            monastery’s current interior.
          </p>
          <div className="photo-grid">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <figure key={n}>
                <a
                  href={`/assets/property/land-${String(n).padStart(2, "0")}.webp`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src={`/assets/property/land-${String(n).padStart(2, "0")}.webp`}
                    alt={photoLabels[n]}
                    loading="lazy"
                    width="2150"
                    height="1428"
                  />
                </a>
                <figcaption>{photoLabels[n]}</figcaption>
              </figure>
            ))}
          </div>
          <TextLink href="/assets/property/user-map-overhead.jpg" external>
            Property map from the original collection
          </TextLink>
        </>
      ) : filter === "sacred" ? (
        <div className="sacred-gallery">
          <figure>
            <img
              src="/assets/images/jesus-icon.png"
              alt="Icon of Christ from the original monastery website"
            />
            <figcaption>Icon of Christ from the original website.</figcaption>
          </figure>
          <figure>
            <img
              src="/assets/images/saint-portrait.jpg"
              alt="Sacred portrait from the monastery collection"
            />
            <figcaption>
              Sacred portrait preserved from the original website.
            </figcaption>
          </figure>
          <p>
            We preserve this image as part of the monastery’s existing
            collection. For its history and identification, please ask the
            monastery office.
          </p>
        </div>
      ) : (
        <div className="photo-grid">
          {[
            "230552_179",
            "230555_407",
            "230601_446",
            "230724_600",
            "230814_250",
            "230849_742",
            "230855_830",
          ].map((id, i) => (
            <figure key={id}>
              <video
                controls
                preload="none"
                poster={`/assets/images/video-VID_20220607_${id}.jpg`}
                aria-label={`Community film ${i + 1}`}
              >
                <source
                  src={`/assets/videos/VID_20220607_${id}.mp4`}
                  type="video/mp4"
                />
              </video>
              <figcaption>
                Community film {i + 1} · original 2022 collection. Captions and
                detailed descriptions are not yet available.
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      <section className="callout">
        <h2>Help us preserve the names and stories.</h2>
        <p>
          If you can identify a person, place, or occasion in our collection,
          contact the office. Please obtain permission before sharing
          photographs of others, especially children.
        </p>
        <TextLink href={`mailto:${site.email}`}>
          Contribute a description
        </TextLink>
      </section>
    </div>
  );
}
