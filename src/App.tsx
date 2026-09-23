import { Component, lazy, Suspense, type ReactNode } from "react";
import { Layout, PageIntro } from "./components/Layout";
import { Home } from "./pages/Home";
import { Monastery, Faith, Visit, Gallery } from "./pages/Community";
import { Archive } from "./pages/Archive";
import { Give } from "./pages/Give";
import {
  Privacy,
  Terms,
  Amharic,
  Store,
  StoreSuccess,
} from "./pages/Information";
import { Live } from "./components/Live";
import { MotionProvider } from "./components/Motion";
const Portal = lazy(() => import("./portal/Portal"));
const EventList = lazy(() =>
  import("./portal/Tickets").then((m) => ({ default: m.EventList })),
);
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="wrap panel" role="alert">
        <h2>We could not load this section.</h2>
        <p>
          Please refresh the page. If the problem continues, contact{" "}
          <a href="mailto:support@haramonastery.org">the monastery office</a>.
        </p>
        <button className="button" onClick={() => window.location.reload()}>
          Reload page
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export function App({ path }: { path: string }) {
  let page: ReactNode;
  switch (path) {
    case "/":
      page = <Home />;
      break;
    case "/monastery":
      page = <Monastery />;
      break;
    case "/faith":
      page = <Faith />;
      break;
    case "/visit":
      page = <Visit />;
      break;
    case "/gallery":
      page = <Gallery />;
      break;
    case "/archive":
      page = <Archive />;
      break;
    case "/donate":
      page = <Give />;
      break;
    case "/privacy":
      page = <Privacy />;
      break;
    case "/terms":
      page = <Terms />;
      break;
    case "/am":
      page = <Amharic />;
      break;
    case "/store":
      page = <Store />;
      break;
    case "/store-success":
      page = <StoreSuccess />;
      break;
    case "/members":
      page = (
        <div className="wrap portal-wrap">
          <PageIntro title="Your monastery, connected.">
            Membership, giving, and gatherings in one place.
          </PageIntro>
          <Live
            fallback={
              <p className="panel">
                The member portal requires JavaScript to sign in. Please enable
                it, or <a href="/visit">contact the office for help</a>.
              </p>
            }
          >
            <Suspense
              fallback={<p className="empty">Opening the member portal…</p>}
            >
              <Portal />
            </Suspense>
          </Live>
        </div>
      );
      break;
    case "/events":
      page = (
        <div className="wrap">
          <PageIntro title="Gather in faith and fellowship.">
            Published monastery events and community gatherings.
          </PageIntro>
          <p>
            For regular worship and current service times,{" "}
            <a href="/visit">contact the monastery office</a>. Event
            registration is separate from worship attendance.
          </p>
          <Live
            fallback={
              <p className="panel">
                Enable JavaScript to load current events and reserve a ticket.
                The office can also help you register.
              </p>
            }
          >
            <Suspense fallback={<p>Loading gatherings…</p>}>
              <EventList />
            </Suspense>
          </Live>
        </div>
      );
      break;
    default:
      page = (
        <div className="wrap narrow">
          <PageIntro title="This page could not be found.">
            The address may have changed.
          </PageIntro>
          <a className="button" href="/">
            Return home
          </a>
        </div>
      );
  }
  return (
    <MotionProvider>
      <Layout path={path}>
        <ErrorBoundary>{page}</ErrorBoundary>
      </Layout>
    </MotionProvider>
  );
}
