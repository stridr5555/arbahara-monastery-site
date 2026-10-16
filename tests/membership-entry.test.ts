import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { getFunctionName } from "convex/server";
import Portal from "../src/portal/Portal";

const fixture = vi.hoisted(() => ({
  authenticated: false,
  profile: null as null | { status: "active" | "pending"; name: string },
}));
vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));
vi.mock("convex/react", () => ({
  useConvexAuth: () => ({
    isLoading: false,
    isAuthenticated: fixture.authenticated,
  }),
  useConvex: () => ({}),
  useMutation: () => vi.fn(),
  useAction: () => vi.fn(),
  useQuery: (ref: Parameters<typeof getFunctionName>[0]) => {
    const name = getFunctionName(ref);
    if (name === "authOptions:available")
      return { google: true, facebook: false };
    if (name === "members:me")
      return {
        email: "synthetic@example.invalid",
        role: "member",
        profile: fixture.profile,
      };
    if (name === "achRecords:mine") return [];
    if (name === "duesReports:mine") return null;
    return undefined;
  },
}));
function route(search = "") {
  vi.stubGlobal("window", { location: { search } });
}
describe("Membership-first entry", () => {
  beforeEach(() => {
    fixture.authenticated = false;
    fixture.profile = null;
    route();
  });
  afterEach(() => vi.unstubAllGlobals());
  it("opens membership creation by default, with sign-in secondary and no donation shortcuts", () => {
    const html = renderToStaticMarkup(createElement(Portal));
    expect(html).toContain("Create membership");
    expect(html).toContain("Confirm password");
    expect(html).toContain("Already have an account? Sign in");
    expect(html).toContain("Continue with Google");
    expect(html).toContain(
      "creating an account alone does not activate membership or authorize payment",
    );
    expect(html).not.toContain("Create or set a password");
    expect(html).not.toContain("Donate by card through Stripe");
    expect(html).not.toContain("Donate through Zelle");
    expect(html).not.toContain('href="/donate');
  });
  it("does not mislabel an explicitly requested donation-only account as a paid membership", () => {
    route("?view=give&method=card");
    const html = renderToStaticMarkup(createElement(Portal));
    expect(html).toContain("Welcome to Arbahara");
    expect(html).toContain("Create giving account");
    expect(html).not.toContain("Confirm password");
    expect(html).toContain("does not enroll you as a paying member");
  });
  it.each([null, { status: "pending" as const, name: "Synthetic family" }])(
    "keeps donations out of unfinished membership registration",
    (profile) => {
      fixture.authenticated = true;
      fixture.profile = profile;
      route("?view=bank-setup");
      const html = renderToStaticMarkup(createElement(Portal));
      expect(html).toContain(
        profile ? "Your household profile" : "Join our spiritual family",
      );
      expect(html).not.toContain("Prefer to donate");
      expect(html).not.toContain("Donate through Zelle");
      expect(html).not.toContain("Make an offering");
      expect(html).not.toContain("An optional gift, after joining");
    },
  );
  it("offers separate optional donations after membership is active and ACH setup is reached", () => {
    fixture.authenticated = true;
    fixture.profile = { status: "active", name: "Synthetic family" };
    route("?view=bank-setup");
    const html = renderToStaticMarkup(createElement(Portal));
    expect(html).toContain("Set up ACH for your $20 monthly family membership");
    expect(html).toContain("An optional gift, after joining");
    expect(html).toContain(
      "Donations are optional and separate from your $20 monthly family dues",
    );
    expect(html).toContain(
      "/members?view=give&amp;method=card&amp;fund=general",
    );
    expect(html).toContain(
      "/members?view=give&amp;method=zelle&amp;fund=general",
    );
  });
});
