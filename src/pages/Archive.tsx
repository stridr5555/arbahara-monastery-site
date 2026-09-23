import { useState } from "react";
import { useQuery } from "convex/react";
import { useAuthToken } from "@convex-dev/auth/react";
import {
  Search,
  Download,
  FileText,
  Headphones,
  Image as ImageIcon,
  ArrowUpRight,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { archiveItems, type ArchiveItem, resources } from "../content";
import { PageIntro, TextLink } from "../components/Layout";
import { Live, ErrorMessage, message } from "../components/Live";
function NewArchive({ search, filter }: { search: string; filter: string }) {
  const items = useQuery(api.archive.list);
  const token = useAuthToken();
  const [error, setError] = useState("");
  const filtered = items?.filter(
    (r) =>
      (filter === "all" || r.kind === filter) &&
      `${r.title} ${r.description}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return items?.length ? (
    <>
      <h2 className="minor-heading">From the monastery office</h2>
      <ErrorMessage message={error} />
      {!filtered?.length ? (
        <p>No newly published records match these filters.</p>
      ) : null}
      <Catalogue
        onDownload={async (item) => {
          setError("");
          try {
            const url = import.meta.env.VITE_CONVEX_URL.replace(
              ".convex.cloud",
              ".convex.site",
            );
            const r = await fetch(
              `${url}/archive-file?id=${encodeURIComponent(item.id)}`,
              { headers: { Authorization: `Bearer ${token}` } },
            );
            if (!r.ok)
              throw new Error(
                "This file requires active membership. Contact the office for access.",
              );
            const blob = await r.blob();
            const href = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = href;
            a.download = item.title;
            a.click();
            setTimeout(() => URL.revokeObjectURL(href), 1000);
          } catch (e) {
            setError(message(e));
          }
        }}
        items={(filtered || []).map((r) => ({
          id: r._id,
          title: r.title,
          description: r.description,
          kind: r.kind,
          date: r.date,
          url: r.url || "",
          rights: r.rights,
          protectedFile: r.protectedFile,
        }))}
      />
    </>
  ) : null;
}
export function Catalogue({
  items,
  onDownload,
}: {
  items: ArchiveItem[];
  onDownload?: (item: ArchiveItem) => void;
}) {
  return (
    <div className="catalogue">
      {items.map((item) => (
        <article key={item.id} id={item.id} className="catalogue-row">
          <span className="catalogue-icon" aria-hidden="true">
            {item.kind === "recording" ? (
              <Headphones />
            ) : item.kind === "photograph" ? (
              <ImageIcon />
            ) : (
              <FileText />
            )}
          </span>
          <div className="catalogue-body">
            <div className="catalogue-meta">
              {item.kind}
              {item.date ? (
                <>
                  <span>·</span>
                  <time dateTime={item.date}>
                    {new Date(item.date + "T12:00:00").toLocaleDateString(
                      "en-US",
                      { year: "numeric", month: "long", day: "numeric" },
                    )}
                  </time>
                </>
              ) : null}
            </div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            {item.kind === "recording" && item.url ? (
              <audio
                controls
                preload="none"
                aria-label={item.title}
                src={item.url}
              />
            ) : null}
            {item.rights ? <small>{item.rights}</small> : null}
          </div>
          {item.protectedFile ? (
            <button
              className="archive-action text-button"
              type="button"
              onClick={() => onDownload?.(item)}
              aria-label={`Download ${item.title}`}
            >
              <Download size={20} />
              <span>Download</span>
            </button>
          ) : item.url ? (
            <a
              className="archive-action"
              href={item.url}
              {...(item.kind === "recording"
                ? { download: true }
                : { target: "_blank", rel: "noreferrer" })}
              aria-label={`${item.kind === "recording" ? "Download" : "Open"} ${item.title}`}
            >
              {item.kind === "recording" ? (
                <Download size={20} />
              ) : (
                <ArrowUpRight size={20} />
              )}
              <span>{item.kind === "recording" ? "Download" : "Open"}</span>
            </a>
          ) : null}
        </article>
      ))}
    </div>
  );
}
export function Archive() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const filtered = archiveItems.filter(
    (i) =>
      (filter === "all" || i.kind === filter) &&
      `${i.title} ${i.description}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="wrap">
      <PageIntro title="Our story, kept for generations.">
        Listen, learn, and return to the records of our shared life.
      </PageIntro>
      <section className="archive-controls">
        <label className="search-box">
          <Search size={20} />
          <span className="sr-only">Search the archive</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the archive"
          />
        </label>
        <div className="filter-row" aria-label="Archive categories">
          {[
            ["all", "All"],
            ["recording", "Recordings"],
            ["document", "Plans & documents"],
            ["photograph", "Photographs"],
            ["announcement", "Announcements"],
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
      </section>
      <p className="small" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "item" : "items"} in the
        founding collection
      </p>
      {filtered.length ? (
        <Catalogue items={filtered} />
      ) : (
        <div className="empty">
          <h2>No matching records</h2>
          <p>Try a different word or choose another category.</p>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setSearch("");
              setFilter("all");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      <Live>
        <NewArchive search={search} filter={filter} />
      </Live>
      <section className="section">
        <div className="section-heading">
          <h2>
            Learn within our
            <br />
            Tewahedo tradition.
          </h2>
          <TextLink href="/faith">All learning resources</TextLink>
        </div>
        <div className="three-columns resources-preview">
          {resources.slice(0, 3).map((r) => (
            <article key={r.href}>
              <h3>{r.title}</h3>
              <p>{r.text}</p>
              <TextLink href={r.href} external>
                Read at Mahibere Kidusan
              </TextLink>
            </article>
          ))}
        </div>
      </section>
      <section className="callout">
        <h2>Help keep the record complete.</h2>
        <p>
          To contribute a transcript, describe a photograph, or request a
          correction, contact the monastery office. Members can also access
          approved member-only materials after sign-in.
        </p>
        <div className="actions">
          <TextLink href="mailto:support@haramonastery.org">
            Contact the archive team
          </TextLink>
          <TextLink href="/members">Member login</TextLink>
        </div>
      </section>
    </div>
  );
}
