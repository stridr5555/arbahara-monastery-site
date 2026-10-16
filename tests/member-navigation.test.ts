import { describe, expect, it } from "vitest";
import { memberSignInReturn } from "../src/lib/memberNavigation";
describe("Member sign-in return routing", () => {
  it("preserves card/Zelle choices and the chosen gift without enrolling a member", () => {
    expect(
      memberSignInReturn(
        "?view=give&amount=100&fund=construction&frequency=monthly&method=card",
      ),
    ).toBe(
      "/members?view=give&amount=100&fund=construction&frequency=monthly&method=card",
    );
    expect(memberSignInReturn("?view=give&method=zelle")).toBe(
      "/members?view=give&method=zelle",
    );
  });
  it("ignores arbitrary redirects, bank data and staff views", () => {
    expect(memberSignInReturn("?view=admin&next=https://evil.invalid")).toBe(
      "/members",
    );
    expect(
      memberSignInReturn(
        "?view=give&bank=private&next=https://evil.invalid&method=card",
      ),
    ).toBe("/members?view=give&method=card");
  });
});
