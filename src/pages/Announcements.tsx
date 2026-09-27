import { announcements } from "../content";
import { Cross, LinkButton, PageIntro, TextLink } from "../components/Layout";

export function Announcements() {
  return (
    <div className="wrap announcements-page">
      <PageIntro title="Announcements & reflections">
        News, pastoral messages, and milestones from the life of our monastery.
      </PageIntro>
      <section className="announcement-list" aria-label="Published announcements">
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
  const announcement = announcements[0];
  return (
    <div className="wrap announcement-post-page">
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
      <aside className="announcement-response" aria-label="Respond to the appeal">
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
