import * as XLSX from "xlsx";

export interface ExportableCard {
  front: string;
  back: string;
  language: string;
  status?: string;
  timesCorrect?: number;
  timesWrong?: number;
  importSource?: string;
}

/**
 * Builds an .xlsx workbook from a deck's cards and triggers a browser download.
 * Runs entirely client-side so it doesn't consume serverless function time.
 */
export function exportDeckToExcel(
  deckTitle: string,
  frontLanguage: string,
  backLanguage: string,
  cards: ExportableCard[]
) {
  const rows = cards.map((c) => ({
    [`Front (${frontLanguage.toUpperCase()})`]: c.front,
    [`Back (${backLanguage.toUpperCase()})`]: c.back,
    Language: c.language,
    Status: c.status ?? "",
    Correct: c.timesCorrect ?? 0,
    Wrong: c.timesWrong ?? 0,
    Source: c.importSource ?? "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Reasonable column widths so the file is readable without manual resizing
  worksheet["!cols"] = [
    { wch: 28 },
    { wch: 28 },
    { wch: 10 },
    { wch: 12 },
    { wch: 9 },
    { wch: 9 },
    { wch: 12 },
  ];

  const workbook = XLSX.utils.book_new();
  // Excel sheet names cannot exceed 31 chars or contain : \ / ? * [ ]
  const safeSheetName = deckTitle.replace(/[:\\/?*[\]]/g, "").slice(0, 31) || "Deck";
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);

  const safeFileName = deckTitle.replace(/[^a-z0-9áéíóöőúüű\s-]/gi, "").trim() || "deck";
  XLSX.writeFile(workbook, `${safeFileName}.xlsx`);
}
