import { useState, useRef, type ReactNode } from "react";
import { MotionToggle, usePageMotion } from "./Motion";
import { LanguageSwitcher, TranslationController } from "./Translation";
import { ArrowRight, Menu, X, ArrowUpRight } from "lucide-react";
import { site } from "../content";
export function Cross() {
  return (
    <svg
      className="cross"
      viewBox="0 0 48 64"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M24 3v58M5 23h38M15 12l18 22M33 12 15 34M13 42h22M18 49h12" />
      <path d="m24 1 4 5-4 5-4-5Zm0 10 6 12-6 12-6-12ZM1 23l5-4 5 4-5 4Zm36 0 5-4 5 4-5 4ZM11 8l5 1 1 5-5-1Zm20 1 5-1-1 5-5 1ZM12 32l5-1-1 5-5 1Zm18-1 5 1 1 5-5-1ZM24 53l5 5-5 5-5-5Z" />
    </svg>
  );
}
export function LinkButton({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <a className={`button ${secondary ? "secondary" : ""}`} href={href}>
      {children}
      <ArrowRight size={17} />
    </a>
  );
}
export function TextLink({
  href,
  children,
  external = false,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
}) {
  return (
    <a
      className="text-link"
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {children}
      {external ? <ArrowUpRight size={17} /> : <ArrowRight size={17} />}
    </a>
  );
}
export function Header({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a href="/" className="brand" aria-label="Arbahara home">
            <Cross />
            <span>
              Arbahara<small>Ethiopian Orthodox Tewahedo Monastery</small>
            </span>
          </a>
          <LanguageSwitcher />
          <button
            type="button"
            className="menu-button"
            aria-expanded={open}
            aria-controls="primary-nav"
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
          <nav
            id="primary-nav"
            className={open ? "open" : ""}
            aria-label="Main navigation"
          >
            {[
              ["/monastery", "Our monastery"],
              ["/faith", "Faith & learning"],
              ["/archive", "Archive"],
              ["/visit", "Visit"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                aria-current={path === href ? "page" : undefined}
              >
                {label}
              </a>
            ))}
            <a
              className="nav-member"
              href="/members"
              aria-current={path === "/members" ? "page" : undefined}
            >
              Member login
            </a>
            <a className="button compact" href="/donate">
              Give
            </a>
          </nav>
        </div>
      </header>
    </>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top wrap">
        <div>
          <a className="brand" href="/">
            <Cross />
            <span>
              Arbahara<small>A home for prayer. A legacy of faith.</small>
            </span>
          </a>
          <p>
            {site.fullName}
            <br />
            {site.faith}
            <br />
            {site.location}
          </p>
        </div>
        <div>
          <h2>Our community</h2>
          <a href="/visit">Visit & contact</a>
          <a href="/events">Gatherings & events</a>
          <a href="/members">Member portal</a>
          <a href="/donate">Give to the monastery</a>
        </div>
        <div>
          <h2>Our shared memory</h2>
          <a href="/archive">Church archive</a>
          <a href="/gallery">Photographs & films</a>
          <a href="/monastery#plans">Campus plans</a>
          <a href="/faith">Faith & learning</a>
        </div>
        <div>
          <h2>Stay connected</h2>
          <a href={`mailto:${site.email}`}>{site.email}</a>
          <a href="tel:+12148031347">{site.phone}</a>
          <a href={site.facebook} target="_blank" rel="noreferrer">
            Facebook <ArrowUpRight size={13} />
          </a>
          <a href={site.youtube} target="_blank" rel="noreferrer">
            YouTube <ArrowUpRight size={13} />
          </a>
          <a href="/am" lang="am">
            አማርኛ
          </a>
        </div>
      </div>
      <div className="footer-bottom wrap">
        <span>© {new Date().getFullYear()} Arbahara Monastery</span>
        <span>{site.mailing}</span>
        <div>
          <LanguageSwitcher />
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/visit#accessibility">Accessibility</a>
          <MotionToggle />
        </div>
      </div>
    </footer>
  );
}
export function PageIntro({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-intro">
      <h1>{title}</h1>
      {children ? <p className="lead">{children}</p> : null}
    </div>
  );
}
export function Layout({
  path,
  children,
}: {
  path: string;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  usePageMotion(root);
  return (
    <div className="site-shell" ref={root}>
      <TranslationController />
      <div className="reading-progress" aria-hidden="true" />
      <Header path={path} />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
