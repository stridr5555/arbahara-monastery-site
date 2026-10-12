export function parseCsv(text: string): string[][] {
  text = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    afterQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          afterQuote = true;
        }
      } else field += c;
      continue;
    }
    if (c === '"') {
      if (field || afterQuote) throw new Error("Malformed CSV quoting.");
      quoted = true;
      continue;
    }
    if (c === "," || c === "\n" || c === "\r") {
      row.push(field);
      field = "";
      afterQuote = false;
      if (c !== ",") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        rows.push(row);
        row = [];
      }
      continue;
    }
    if (afterQuote && c !== " " && c !== "\t")
      throw new Error("Unexpected text after a quoted CSV field.");
    if (!afterQuote) field += c;
  }
  if (quoted) throw new Error("Unclosed CSV field.");
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  if (rows[0]?.[0]) rows[0][0] = rows[0][0].replace(/^\uFEFF/, "");
  return rows;
}
export function exportCsv(rows: unknown[][]) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((cell) => {
            let value = String(cell ?? "");
            if (/^[\s]*[=+@-]/.test(value)) value = "'" + value;
            return '"' + value.replace(/"/g, '""') + '"';
          })
          .join(","),
      )
      .join("\r\n")
  );
}
export function downloadCsv(name: string, rows: unknown[][]) {
  const url = URL.createObjectURL(
    new Blob([exportCsv(rows)], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function readSpreadsheet(file: File) {
  if (file.size > 3 * 1024 * 1024)
    throw new Error("Choose a spreadsheet under 3 MB.");
  if (file.name.toLowerCase().endsWith(".csv"))
    return [{ name: "CSV", rows: parseCsv(await file.text()) }];
  if (!file.name.toLowerCase().endsWith(".xlsx"))
    throw new Error(
      "Choose .xlsx or UTF-8 .csv. Macro-enabled workbooks are not supported.",
    );
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  return workbook.worksheets.map((sheet) => {
    if (sheet.rowCount > 5000 || sheet.columnCount > 100)
      throw new Error(
        "Use a smaller bounded workbook (at most 5000 rows / 100 columns).",
      );
    const rows: string[][] = [];
    sheet.eachRow({ includeEmpty: true }, (row) => {
      const values: string[] = [];
      for (let i = 1; i <= sheet.columnCount; i++)
        values.push(row.getCell(i).text);
      rows.push(values);
    });
    return { name: sheet.name, rows };
  });
}
