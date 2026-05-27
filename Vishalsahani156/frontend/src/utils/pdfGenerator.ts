import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';
import { PdfFormData } from '../types';

// A4 dimensions in points (72 points = 1 inch)
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const HEADER_HEIGHT = 60;
const FOOTER_HEIGHT = 40;
const CONTENT_TOP = PAGE_HEIGHT - MARGIN - HEADER_HEIGHT;
const CONTENT_BOTTOM = MARGIN + FOOTER_HEIGHT;
const LINE_HEIGHT = 16;
const MAX_WIDTH = PAGE_WIDTH - MARGIN * 2;

const wrapText = (text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length ? lines : [''];
};

const drawHeaderFooter = (
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  pageNumber: number,
  totalPages: number,
  category: string
) => {
  // Header background
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - HEADER_HEIGHT - 10,
    width: PAGE_WIDTH,
    height: HEADER_HEIGHT + 10,
    color: rgb(0.15, 0.39, 0.92),
  });

  page.drawText('PDF Generator Pro', {
    x: MARGIN,
    y: PAGE_HEIGHT - 35,
    size: 18,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  page.drawText(category, {
    x: PAGE_WIDTH - MARGIN - boldFont.widthOfTextAtSize(category, 12),
    y: PAGE_HEIGHT - 35,
    size: 12,
    font,
    color: rgb(0.9, 0.9, 1),
  });

  // Footer line
  page.drawLine({
    start: { x: MARGIN, y: FOOTER_HEIGHT + 15 },
    end: { x: PAGE_WIDTH - MARGIN, y: FOOTER_HEIGHT + 15 },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });

  const footerText = `Page ${pageNumber} of ${totalPages} | Generated on ${new Date().toLocaleDateString()}`;
  page.drawText(footerText, {
    x: MARGIN,
    y: FOOTER_HEIGHT - 5,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
};

export const generatePdfBytes = async (data: PdfFormData): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // First pass: estimate pages (start with 1)
  let pages: PDFPage[] = [];
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  pages.push(page);
  let y = CONTENT_TOP;
  let pageNum = 1;

  const addNewPage = () => {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    pageNum++;
    y = CONTENT_TOP;
  };

  // Title block
  page.drawText(data.sheetCategory.toUpperCase(), {
    x: MARGIN,
    y,
    size: 22,
    font: boldFont,
    color: rgb(0.15, 0.39, 0.92),
  });
  y -= 30;

  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 2,
    color: rgb(0.15, 0.39, 0.92),
  });
  y -= 25;

  const fields: { label: string; value: string; multiline?: boolean }[] = [
    { label: 'Full Name', value: data.name },
    { label: 'Email Address', value: data.email },
    { label: 'Phone Number', value: data.phone },
    {
      label: 'Event Date',
      value: new Date(data.eventDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    },
    { label: 'Sheet Category', value: data.sheetCategory },
    { label: 'Description / Notes', value: data.description, multiline: true },
  ];

  for (const field of fields) {
    const lines = field.multiline
      ? wrapText(field.value, font, 11, MAX_WIDTH)
      : [field.value];
    const neededHeight = LINE_HEIGHT * (2 + lines.length) + 8;

    if (y - neededHeight < CONTENT_BOTTOM) {
      addNewPage();
    }

    page.drawText(field.label, {
      x: MARGIN,
      y,
      size: 10,
      font: boldFont,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= LINE_HEIGHT;

    for (const line of lines) {
      if (y < CONTENT_BOTTOM) {
        addNewPage();
      }
      page.drawText(line, {
        x: MARGIN,
        y,
        size: 11,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= LINE_HEIGHT;
    }
    y -= 8;
  }

  const totalPages = pages.length;

  // Draw headers and footers on all pages
  pages.forEach((p, index) => {
    drawHeaderFooter(p, font, boldFont, index + 1, totalPages, data.sheetCategory);
  });

  return pdfDoc.save();
};

const toBlob = (bytes: Uint8Array): Blob =>
  new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });

export const downloadPdf = (bytes: Uint8Array, filename: string) => {
  const blob = toBlob(bytes);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const pdfToDataUrl = (bytes: Uint8Array): string => {
  const blob = toBlob(bytes);
  return URL.createObjectURL(blob);
};
