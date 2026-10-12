import { announcements } from "../content";
import { LinkButton, TextLink, Cross } from "../components/Layout";
import { ProcessionHero } from "../components/ProcessionHero";
import { NextGatherings } from "../components/ChurchCalendar";
import { LandJourney } from "../components/LandJourney";
import { MediaProcession } from "../components/MediaProcession";
export function Home() {
  return (
    <div className="procession-home">
      <ProcessionHero />
      <section className="community-chapter" id="community">
        <MediaProcession />
        <div className="wrap community-bottom">
          <NextGatherings />
          <div className="community-invitation">
            <Cross />
            <h3>
              There is room
              <br />
              for every generation.
            </h3>
            <p>
              Come to learn. Come to serve. Come with your family. The monastery
              office can help you take your first step.
            </p>
            <TextLink href="/visit">Plan a visit</TextLink>
            <TextLink href="/gallery">More films and photographs</TextLink>
          </div>
        </div>
      </section>
      <LandJourney />
      <section
        className="announcement-feature wrap"
        id="participate"
        aria-labelledby="latest-announcement"
      >
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
      <section className="journey-invitation wrap">
        <div>
          <span className="chapter-number">For generations</span>
          <h2>
            What we receive,
            <br />
            we carry forward.
          </h2>
        </div>
        <div>
          <p className="lead">
            A home for prayer. A place to learn. A community that remembers its
            elders and welcomes its children.
          </p>
          <p>
            Explore the teachings of our Church, listen to our community’s
            recordings, and help prepare this house of God.
          </p>
          <div className="actions">
            <TextLink href="/faith">Explore our faith</TextLink>
            <TextLink href="/archive">Enter the archive</TextLink>
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
    </div>
  );
}
