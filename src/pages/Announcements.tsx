import { useRef } from "react";
import { announcements } from "../content";
import { Cross, LinkButton, PageIntro, TextLink } from "../components/Layout";
import { MotionToggle } from "../components/Motion";
import { useAnnouncementMotion } from "../components/AnnouncementMotion";

export function Announcements() {
  const root = useRef<HTMLDivElement>(null);
  useAnnouncementMotion(root);
  return (
    <div className="wrap announcements-page" ref={root}>
      <div className="announcements-page-heading">
        <PageIntro title="Announcements & reflections">
          News, pastoral messages, and milestones from the life of our
          monastery.
        </PageIntro>
      </div>
      <section
        className="announcement-list"
        aria-label="Published announcements"
      >
        {announcements.map((announcement, index) => (
          <article className="announcement-card" key={announcement.slug}>
            <div className="announcement-card-meta">
              <span className="section-label">
                {index === 0 ? "Latest announcement" : "Announcement"}
              </span>
              <time dateTime={announcement.published}>
                {announcement.displayDate}
              </time>
            </div>
            <div>
              <h2>{announcement.title}</h2>
              <p>{announcement.excerpt}</p>
              {announcement.photos ? (
                <img
                  className="announcement-card-photo"
                  src={announcement.photos[2].src}
                  alt={announcement.photos[2].alt}
                  width={announcement.photos[2].width}
                  height={announcement.photos[2].height}
                  loading="lazy"
                />
              ) : null}
              <TextLink href={`/announcements/${announcement.slug}`}>
                Read the announcement
              </TextLink>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

export function FoundingAnnouncement() {
  const root = useRef<HTMLDivElement>(null);
  useAnnouncementMotion(root);
  const announcement = announcements.find(
    (post) => post.slug === "establishment-of-abuna-hara-dengeel-monastery",
  )!;
  return (
    <div className="wrap announcement-post-page" ref={root}>
      <div className="announcement-progress" aria-hidden="true" />
      <nav className="post-breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span aria-hidden="true">/</span>
        <a href="/announcements">Announcements</a>
      </nav>
      <article className="announcement-post">
        <header>
          <span className="section-label">Founding announcement</span>
          <h1>{announcement.title}</h1>
          <time dateTime={announcement.published}>
            {announcement.displayDate}
          </time>
        </header>
        <div className="announcement-letter">
          <p className="invocation">{announcement.paragraphs[0]}</p>
          <p className="salutation">{announcement.paragraphs[1]}</p>
          <p>{announcement.paragraphs[2]}</p>
          <p>{announcement.paragraphs[3]}</p>
          <blockquote>{announcement.paragraphs[4]}</blockquote>
          <p>{announcement.paragraphs[5]}</p>
        </div>
      </article>
      <aside
        className="announcement-response"
        aria-label="Respond to the appeal"
      >
        <Cross />
        <div>
          <span className="section-label">Answer the appeal</span>
          <h2>Help complete this house of God.</h2>
          <p>
            Your prayers and generous contributions carry this sacred work
            forward for the generations to come.
          </p>
          <div className="actions">
            <LinkButton href="/donate">Make an offering</LinkButton>
            <TextLink href="/monastery">See the monastery vision</TextLink>
          </div>
        </div>
      </aside>
    </div>
  );
}

export function GrandOpeningAnnouncement() {
  const root = useRef<HTMLDivElement>(null);
  useAnnouncementMotion(root);
  const post = announcements.find(
    (entry) => entry.slug === "grand-opening-ceremony",
  )!;
  const hero = post.photos![2];
  return (
    <div className="wrap announcement-post-page ceremony-page" ref={root}>
      <div className="announcement-progress" aria-hidden="true" />
      <nav className="post-breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span aria-hidden="true">/</span>
        <a href="/announcements">Announcements</a>
      </nav>
      <article className="announcement-post ceremony-post">
        <header>
          <div className="ceremony-ornament" aria-hidden="true">
            <span />
            <Cross />
            <span />
          </div>
          <span className="section-label">Grand Opening Ceremony</span>
          <h1>{post.title}</h1>
          <time dateTime={post.published}>{post.displayDate}</time>
          <p className="lead">
            A small gathering. A generous beginning. A shared journey of faith.
          </p>
          <div className="announcement-motion-control">
            <MotionToggle />
          </div>
        </header>
        <div className="ceremony-opening">
          <div>
            <p className="ceremony-invocation">{post.paragraphs[0]}</p>
            <p>{post.paragraphs[1]}</p>
            <dl
              className="ceremony-milestones"
              aria-label="Grand Opening milestones"
            >
              <div>
                <dt>Around 50</dt>
                <dd>People gathered</dd>
              </div>
              <div>
                <dt>$50,000</dt>
                <dd>Raised for the House of Prayer</dd>
              </div>
            </dl>
          </div>
          <figure>
            <img
              src={hero.src}
              alt={hero.alt}
              width={hero.width}
              height={hero.height}
              fetchPriority="high"
            />
            <figcaption>{hero.caption}</figcaption>
          </figure>
        </div>
        <div className="ceremony-story">
          <h2>Small in number, generous in spirit</h2>
          <p>{post.paragraphs[2]}</p>
          <p>
            <TextLink href="/members">Become a member to donate</TextLink>
          </p>
          <h2>A blessing for our beginning</h2>
          <p>{post.paragraphs[3]}</p>
          <h2>Fellowship beneath the tents</h2>
          <p>{post.paragraphs[4]}</p>
          <p>{post.paragraphs[5]}</p>
        </div>
        <section
          className="ceremony-photographs"
          aria-labelledby="ceremony-photographs-heading"
        >
          <span className="section-label">Our shared memory</span>
          <h2 id="ceremony-photographs-heading">
            Moments from the Grand Opening
          </h2>
          <p>
            Seven photographs from our community’s gathering. The clergy
            photograph above and the six moments below preserve the ceremony,
            the feast, and the fellowship.
          </p>
          <div className="ceremony-photo-grid">
            {post
              .photos!.filter((photo) => photo.src !== hero.src)
              .map((photo) => (
                <figure key={photo.src}>
                  <div className="ceremony-photo-frame">
                    <img
                      src={photo.src}
                      alt={photo.alt}
                      width={photo.width}
                      height={photo.height}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <figcaption>{photo.caption}</figcaption>
                </figure>
              ))}
          </div>
        </section>
        <div className="ceremony-story ceremony-closing">
          <h2>Help complete the House of Prayer</h2>
          <p>{post.paragraphs[6]}</p>
        </div>
      </article>
      <aside
        className="announcement-response"
        aria-label="Continue the journey"
      >
        <Cross />
        <div>
          <span className="section-label">With gratitude and hope</span>
          <h2>Another $50,000 will help finish the House of Prayer.</h2>
          <p>
            Create your membership, then make an optional donation through the
            member portal. Already a member? Sign in from the same page to give.
          </p>
          <div className="actions">
            <LinkButton href="/members">Become a member to donate</LinkButton>
            <TextLink href="/monastery">Explore the monastery vision</TextLink>
            <TextLink href="/announcements">All announcements</TextLink>
          </div>
        </div>
      </aside>
    </div>
  );
}
