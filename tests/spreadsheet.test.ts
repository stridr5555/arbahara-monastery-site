import { describe, it, expect } from "vitest";
import { parseCsv, exportCsv } from "../src/lib/spreadsheet";
describe("Spreadsheet interchange", () => {
  it("reads quotes, commas, Amharic and embedded newlines", () => {
    expect(
      parseCsv(
        '\uFEFFName,Address\r\n"ስም","1 Road, Texas"\r\n"Two ""names""","Line1\nLine2"',
      ),
    ).toEqual([
      ["Name", "Address"],
      ["ስም", "1 Road, Texas"],
      ['Two "names"', "Line1\nLine2"],
    ]);
  });
  it("rejects malformed quoting instead of silently corrupting rows", () => {
    expect(() => parseCsv('"unfinished')).toThrow();
    expect(() => parseCsv('"name"extra,123')).toThrow();
  });
  it("neutralizes spreadsheet formulas in exports", () => {
    const result = parseCsv(
      exportCsv([['=IMPORTXML("x")', "+cmd", "@SUM(A1)", "-1", "normal"]]),
    );
    expect(result[0]).toEqual([
      '\'=IMPORTXML("x")',
      "'+cmd",
      "'@SUM(A1)",
      "'-1",
      "normal",
    ]);
  });
});
