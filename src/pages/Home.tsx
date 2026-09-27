import { announcements, phases } from "../content";
import { LinkButton, TextLink, Cross } from "../components/Layout";
import { SacredHero } from "../components/SacredHero";
import { DepthFrame } from "../components/Motion";
export function Home() {
  return (
    <>
      <SacredHero />
      <section className="welcome-strip" aria-label="Find your place">
        <div className="wrap three-columns">
          <article>
            <h2>Worship & prayer</h2>
            <p>
              Come with your questions, your prayers, and your family. The
              monastery office can help you plan your first visit.
            </p>
            <TextLink href="/visit">Plan a visit</TextLink>
          </article>
          <article>
            <h2>Grow in faith</h2>
            <p>
              Explore teachings, sacred hymnody, and the lives of the saints
              within our Ethiopian Orthodox Tewahedo tradition.
            </p>
            <TextLink href="/faith">Explore the faith</TextLink>
          </article>
          <article>
            <h2>Belong & serve</h2>
            <p>
              Join the community, offer your time, and help care for a place
              that our children will inherit.
            </p>
            <TextLink href="/members">Become a member</TextLink>
          </article>
        </div>
      </section>
      <section className="announcement-feature wrap" aria-labelledby="latest-announcement">
        <div className="announcement-feature-mark">
          <span className="section-label">Latest announcement</span>
          <time dateTime={announcements[0].published}>
            {announcements[0].displayDate}
          </time>
        </div>
        <div>
          <h2 id="latest-announcement">{announcements[0].title}</h2>
          <p className="lead">{announcements[0].excerpt}</p>
          <TextLink href={`/announcements/${announcements[0].slug}`}>
            Read our founding announcement
          </TextLink>
        </div>
      </section>
      <section className="section wrap story-split" id="vision">
        <figure className="sacred-image" data-depth>
          <img
            src="/assets/images/saint-portrait.jpg"
            width="701"
            height="1024"
            loading="lazy"
            alt="Ethiopian Orthodox sacred portrait preserved in the monastery’s existing collection"
          />
          <figcaption>From the monastery’s sacred art collection.</figcaption>
        </figure>
        <div>
          <span className="section-label">Our monastery</span>
          <h2>
            A living faith.
            <br />A place to call home.
          </h2>
          <p className="lead">
            A sanctuary for our spiritual family, and a living inheritance for
            our children.
          </p>
          <p>
            By the grace of God, the land has been acquired. A four-bedroom
            residence, a peaceful lake, and an existing garage offer a beginning
            for a life of prayer, hospitality, and service.
          </p>
          <p>
            We are preparing a space for congregational prayer while planning
            the permanent church and monastery. We carry this work forward
            together, through the blessing of the Church, careful stewardship,
            and your support.
          </p>
          <TextLink href="/monastery">
            The land, the story, and the vision
          </TextLink>
        </div>
      </section>
      <section className="faith-story section wrap">
        <div className="faith-story-heading">
          <span className="section-label">The life we share</span>
          <h2>
            Prayer becomes
            <br />a way of life.
          </h2>
          <p>At the heart of every plan is the life of the Church.</p>
          <Cross />
        </div>
        <div className="faith-story-chapters">
          <span className="faith-story-line" aria-hidden="true" />
          <article>
            <span className="section-label">01 · Receive</span>
            <h3>Rooted in worship.</h3>
            <p>
              We gather in the name of the Holy Trinity, seeking a life shaped
              by prayer, the Divine Liturgy, and the teachings of the Ethiopian
              Orthodox Tewahedo Church.
            </p>
          </article>
          <article>
            <span className="section-label">02 · Belong</span>
            <h3>Care for one another.</h3>
            <p>
              Hospitality, service, and fellowship make room for the elder, the
              young person, the returning member, and the person visiting for
              the first time.
            </p>
          </article>
          <article>
            <span className="section-label">03 · Pass on</span>
            <h3>Keep faith with the future.</h3>
            <p>
              We preserve our sacred traditions and the story of our community
              so that the generations after us can learn, remember, and continue
              the work.
            </p>
            <TextLink href="/faith">Learn within our tradition</TextLink>
          </article>
        </div>
      </section>
      <section className="gallery-memory wrap">
        <div className="section-heading">
          <div>
            <span className="section-label">From our original collection</span>
            <h2>
              Images of faith
              <br />
              and shared life.
            </h2>
          </div>
          <TextLink href="/gallery">Explore the full gallery</TextLink>
        </div>
        <div className="memory-rail">
          {[
            ["jesus-icon.png", "Icon of Christ"],
            ["saint-portrait.jpg", "Sacred portrait"],
            ["announcement.jpg", "Community announcement"],
            ["view-terrace.jpg", "Terrace view"],
            ["flowers.jpg", "Garden flowers"],
          ].map(([file, label]) => (
            <DepthFrame key={file}>
              <a href="/gallery" className="memory-image">
                <img
                  loading="lazy"
                  src={`/assets/images/${file}`}
                  alt={`${label} from the original monastery collection`}
                />
                <span>{label}</span>
              </a>
            </DepthFrame>
          ))}
        </div>
      </section>
      <section className="plan-band" id="timeline">
        <div className="wrap">
          <div className="section-heading">
            <div>
              <span className="section-label">Building with care</span>
              <h2>One faithful step at a time.</h2>
            </div>
            <TextLink href="/monastery#plans">
              Explore the campus plans
            </TextLink>
          </div>
          <ol className="phase-preview">
            {phases.slice(0, 3).map((p, i) => (
              <li key={p.title}>
                <span className="phase-number">0{i + 1}</span>
                <h3>{p.title}</h3>
                <p>
                  {i === 0
                    ? "Prepare the existing garage for prayer and community gathering."
                    : i === 1
                      ? "Complete professional planning, access, utilities, and required approvals."
                      : "Create the permanent spiritual heart of our monastery campus."}
                </p>
              </li>
            ))}
          </ol>
          <p className="small">
            These are planned phases. Work will proceed as funding, professional
            reviews, and approvals allow.
          </p>
        </div>
      </section>
      <section className="section wrap archive-invitation">
        <div>
          <span className="section-label">For those who come after us</span>
          <h2>
            Keep the story.
            <br />
            Pass on the faith.
          </h2>
        </div>
        <div>
          <p className="lead">
            Our recordings, plans, photographs, and teachings belong to a story
            larger than one generation.
          </p>
          <p>
            Return to a community meeting, learn from our tradition, or explore
            the records of the monastery’s beginnings. Our archive brings these
            materials into one place.
          </p>
          <div className="actions">
            <TextLink href="/archive">Enter the archive</TextLink>
            <TextLink href="/events">Find a gathering</TextLink>
          </div>
        </div>
      </section>
      <section className="giving-band">
        <div className="wrap">
          <Cross />
          <blockquote>
            “It is more blessed to give
            <br />
            than to receive.”<cite>Acts 20:35</cite>
          </blockquote>
          <p>Your prayers and gifts help prepare this house of God.</p>
          <LinkButton href="/donate">Make an offering</LinkButton>
        </div>
      </section>
    </>
  );
}
