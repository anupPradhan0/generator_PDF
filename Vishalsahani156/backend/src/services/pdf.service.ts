import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PDFFont } from "pdf-lib";
import type { z } from "zod";
import { pdfInputSchema } from "../validators/pdf.validators";

export type PdfInput = z.infer<typeof pdfInputSchema>;

const A4 = { width: 595.28, height: 841.89 };

function wrapText(args: {
  text: string;
  maxWidth: number;
  font: PDFFont;
  fontSize: number;
}) {
  const { text, maxWidth, font, fontSize } = args;
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    const w = font.widthOfTextAtSize(next, fontSize);
    if (w <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function formatDate(dateInput: string) {
  const dt = new Date(dateInput);
  if (Number.isNaN(dt.getTime())) return dateInput;
  return dt.toISOString().slice(0, 10);
}

export async function generateA4PdfBytes(input: PdfInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const maxWidth = A4.width - 100; // margins: 50 left/right
  const marginX = 50;
  const marginTop = 62;
  const marginBottom = 54;

  let page = pdfDoc.addPage([A4.width, A4.height]);
  let y = A4.height - marginTop;

  // Header draws down to the divider at (A4.height - 70). Start body *below* that
  // divider to avoid text overlap with the header's subtitle line.
  const headerDividerY = A4.height - 70;
  const bodyStartY = headerDividerY - 22;

  const drawHeader = () => {
    // Good-looking vector icon (self-contained; no external image file needed).
    const iconSize = 26;
    const iconX = marginX;
    const iconY = A4.height - 52;

    // Shadow
    page.drawRectangle({
      x: iconX + 1.2,
      y: iconY - 1.2,
      width: iconSize,
      height: iconSize,
      color: rgb(0, 0, 0),
      opacity: 0.08
    });

    // Badge background
    page.drawRectangle({
      x: iconX,
      y: iconY,
      width: iconSize,
      height: iconSize,
      color: rgb(0.12, 0.36, 0.95)
    });

    // Inner document card
    page.drawRectangle({
      x: iconX + 6.2,
      y: iconY + 6,
      width: iconSize - 12.4,
      height: iconSize - 12,
      color: rgb(1, 1, 1),
      opacity: 0.95
    });

    // Lines on the "document"
    page.drawLine({
      start: { x: iconX + 8.2, y: iconY + 16.2 },
      end: { x: iconX + iconSize - 8.2, y: iconY + 16.2 },
      thickness: 1,
      color: rgb(0.12, 0.36, 0.95),
      opacity: 0.9
    });
    page.drawLine({
      start: { x: iconX + 8.2, y: iconY + 12.4 },
      end: { x: iconX + iconSize - 10.5, y: iconY + 12.4 },
      thickness: 1,
      color: rgb(0.12, 0.36, 0.95),
      opacity: 0.7
    });

    // Header title
    page.drawText("PDF Generator", {
      x: marginX + iconSize + 10,
      y: A4.height - 42,
      size: 16,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1)
    });

    // Subheader
    page.drawText(`Category: ${input.sheetCategory}`, {
      x: marginX + iconSize + 10,
      y: A4.height - 62,
      size: 10.5,
      font: regularFont,
      color: rgb(0.35, 0.35, 0.35)
    });

    // Divider line
    page.drawLine({
      start: { x: marginX, y: A4.height - 70 },
      end: { x: A4.width - marginX, y: A4.height - 70 },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85)
    });
  };

  drawHeader();
  y = bodyStartY;

  const lineHeight = 13;

  const ensureSpace = (neededHeight: number) => {
    if (y - neededHeight < marginBottom) {
      page = pdfDoc.addPage([A4.width, A4.height]);
      drawHeader();
      y = bodyStartY;
    }
  };

  const drawWrapped = (text: string, opts: { fontSize: number; indentX?: number }) => {
    const fontSize = opts.fontSize;
    const indentX = opts.indentX ?? 0;
    const lines = wrapText({
      text,
      maxWidth,
      font: regularFont,
      fontSize
    });

    for (const line of lines) {
      ensureSpace(lineHeight);
      page.drawText(line, {
        x: marginX + indentX,
        y,
        size: fontSize,
        font: regularFont,
        color: rgb(0.15, 0.15, 0.15)
      });
      y -= lineHeight;
    }
  };

  const drawSectionTitle = (title: string) => {
    ensureSpace(lineHeight * 1.3);
    page.drawText(title, {
      x: marginX,
      y,
      size: 13,
      font: boldFont,
      color: rgb(0.05, 0.05, 0.05)
    });
    y -= lineHeight;
  };

  const drawField = (label: string, value: string, valueFontSize = 10.8) => {
    ensureSpace(lineHeight * 1.1);
    page.drawText(`${label}:`, {
      x: marginX,
      y,
      size: 10.8,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2)
    });
    y -= 11;
    drawWrapped(value, { fontSize: valueFontSize, indentX: 0 });
    // a little spacing after each field block
    y -= 2;
  };

  // Body
  drawSectionTitle("Sheet Details");
  drawField("Event Name", input.eventName ?? "");
  if (input.name) drawField("Name", input.name);
  if (input.email) drawField("Email", input.email);
  if (input.phone) drawField("Phone", input.phone);
  drawField("Event Date", formatDate(input.eventDate), 10.3);
  drawField("Sheet Category", input.sheetCategory, 10.3);

  ensureSpace(lineHeight);
  drawSectionTitle("Description / Notes");
  drawWrapped(input.description, { fontSize: 10.8, indentX: 0 });

  // Footer (page numbers need total page count)
  const pages = pdfDoc.getPages();
  const generatedAt = new Date().toISOString().slice(0, 10);

  pages.forEach((p, idx) => {
    const pageNumber = idx + 1;
    const total = pages.length;

    const footerText = `Generated: ${generatedAt}    Page ${pageNumber} of ${total}`;
    p.drawText(footerText, {
      x: marginX,
      y: 32,
      size: 9.5,
      font: regularFont,
      color: rgb(0.45, 0.45, 0.45)
    });

    p.drawLine({
      start: { x: marginX, y: 44 },
      end: { x: A4.width - marginX, y: 44 },
      thickness: 1,
      color: rgb(0.9, 0.9, 0.9)
    });
  });

  const bytes = await pdfDoc.save();
  return bytes;
}

