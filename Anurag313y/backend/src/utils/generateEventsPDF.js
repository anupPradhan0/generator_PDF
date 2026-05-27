import PDFDocument from 'pdfkit';

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 48;
const CONTENT_WIDTH = PAGE.width - MARGIN * 2;
const FOOTER_Y = PAGE.height - 40;

const COLORS = {
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  primaryLight: '#EEF2FF',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  rowAlt: '#F8FAFC',
  white: '#FFFFFF',
  accent: '#10B981',
};

const formatDisplayDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const formatShortDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const groupEventsByDate = (events) => {
  const groups = {};
  events.forEach((event) => {
    const key = new Date(event.eventDate).toISOString().split('T')[0];
    if (!groups[key]) groups[key] = [];
    groups[key].push(event);
  });
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
};

const drawPageFooter = (doc, pageNum) => {
  const generatedAt = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  doc
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .moveTo(MARGIN, FOOTER_Y - 12)
    .lineTo(PAGE.width - MARGIN, FOOTER_Y - 12)
    .stroke();

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(COLORS.textMuted)
    .text(`Generated on ${generatedAt}`, MARGIN, FOOTER_Y, { lineBreak: false })
    .text(`Page ${pageNum}`, MARGIN, FOOTER_Y, {
      width: CONTENT_WIDTH,
      align: 'right',
      lineBreak: false,
    });
};

const drawHeader = (doc, selectedDateLabels, totalEvents) => {
  doc.rect(0, 0, PAGE.width, 120).fill(COLORS.primary);

  doc.rect(0, 110, PAGE.width, 10).fill(COLORS.primaryDark);

  doc
    .font('Helvetica-Bold')
    .fontSize(26)
    .fillColor(COLORS.white)
    .text('Events Report', MARGIN, 38, { lineBreak: false });

  doc
    .font('Helvetica')
    .fontSize(11)
    .fillColor('#C7D2FE')
    .text('Event booking summary', MARGIN, 72, { lineBreak: false });

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(COLORS.white)
    .text(
      selectedDateLabels.length === 1
        ? selectedDateLabels[0]
        : `${selectedDateLabels.length} dates selected`,
      MARGIN,
      92,
      { width: CONTENT_WIDTH * 0.65, lineBreak: false },
    );

  const badgeW = 88;
  const badgeH = 36;
  const badgeX = PAGE.width - MARGIN - badgeW;
  const badgeY = 42;

  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 6).fill('#6366F1');
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#C7D2FE')
    .text('Total events', badgeX, badgeY + 8, { width: badgeW, align: 'center' });
  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor(COLORS.white)
    .text(String(totalEvents), badgeX, badgeY + 20, { width: badgeW, align: 'center' });

  doc.y = 140;
};

const drawDateChips = (doc, selectedDateLabels) => {
  if (selectedDateLabels.length <= 1) return;

  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor(COLORS.textMuted)
    .text('SELECTED DATES', MARGIN, doc.y);

  doc.y += 14;
  let chipX = MARGIN;
  const chipY = doc.y;
  const chipH = 22;
  const gap = 8;

  selectedDateLabels.forEach((label) => {
    doc.font('Helvetica').fontSize(9);
    const chipW = doc.widthOfString(label) + 20;

    if (chipX + chipW > PAGE.width - MARGIN) {
      chipX = MARGIN;
      doc.y += chipH + gap;
    }

    doc
      .roundedRect(chipX, doc.y, chipW, chipH, 4)
      .fill(COLORS.primaryLight);
    doc
      .fillColor(COLORS.primaryDark)
      .text(label, chipX + 10, doc.y + 6, { lineBreak: false });

    chipX += chipW + gap;
  });

  doc.y += chipH + 16;
};

const drawTableHeader = (doc, columns) => {
  const y = doc.y;
  const rowH = 28;

  doc.rect(MARGIN, y, CONTENT_WIDTH, rowH).fill(COLORS.primaryDark);

  let x = MARGIN + 10;
  columns.forEach((col) => {
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(COLORS.white)
      .text(col.label, x, y + 9, { width: col.width - 12, lineBreak: false });
    x += col.width;
  });

  doc.y = y + rowH;
  return rowH;
};

const drawTableRow = (doc, columns, event, index, rowY) => {
  const rowH = 32;
  const isAlt = index % 2 === 1;

  if (isAlt) {
    doc.rect(MARGIN, rowY, CONTENT_WIDTH, rowH).fill(COLORS.rowAlt);
  }

  doc
    .rect(MARGIN, rowY, CONTENT_WIDTH, rowH)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();

  const values = [
    event.referenceNumber,
    event.customerName,
    event.mobileNo,
    event.eventName,
    formatShortDate(event.eventDate),
  ];

  let x = MARGIN + 10;
  values.forEach((val, i) => {
    const isRef = i === 0;
    doc
      .font(isRef ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(9)
      .fillColor(isRef ? COLORS.primary : COLORS.text)
      .text(String(val), x, rowY + 10, {
        width: columns[i].width - 14,
        lineBreak: false,
        ellipsis: true,
      });
    x += columns[i].width;
  });

  return rowH;
};

const drawSectionTitle = (doc, title, count) => {
  const y = doc.y + 8;

  doc.rect(MARGIN, y, 4, 22).fill(COLORS.primary);

  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor(COLORS.text)
    .text(title, MARGIN + 14, y + 4, { lineBreak: false });

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(COLORS.textMuted)
    .text(`${count} event${count !== 1 ? 's' : ''}`, PAGE.width - MARGIN - 60, y + 6, {
      width: 60,
      align: 'right',
      lineBreak: false,
    });

  doc.y = y + 32;
};

const ensureSpace = (doc, needed, pageNumRef, redrawHeader) => {
  if (doc.y + needed > FOOTER_Y - 20) {
    drawPageFooter(doc, pageNumRef.current);
    doc.addPage();
    pageNumRef.current += 1;
    if (redrawHeader) redrawHeader();
    doc.y = MARGIN + 20;
    return true;
  }
  return false;
};

export const generateEventsPDFBuffer = (events, selectedDateLabels) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      bufferPages: true,
    });
    const chunks = [];
    const pageNum = { current: 1 };

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const columns = [
      { label: 'REF #', width: 78 },
      { label: 'CUSTOMER', width: 115 },
      { label: 'MOBILE', width: 88 },
      { label: 'EVENT', width: 130 },
      { label: 'DATE', width: 84 },
    ];

    drawHeader(doc, selectedDateLabels, events.length);
    drawDateChips(doc, selectedDateLabels);

    if (events.length === 0) {
      const boxY = doc.y + 10;
      doc.roundedRect(MARGIN, boxY, CONTENT_WIDTH, 80, 8).fill(COLORS.rowAlt);
      doc
        .font('Helvetica')
        .fontSize(12)
        .fillColor(COLORS.textMuted)
        .text('No events found for the selected date(s).', MARGIN, boxY + 32, {
          width: CONTENT_WIDTH,
          align: 'center',
        });
      doc.y = boxY + 100;
    } else {
      const grouped = groupEventsByDate(events);
      const showSections = grouped.length > 1;

      grouped.forEach(([dateKey, dateEvents]) => {
        ensureSpace(doc, 80, pageNum, null);

        if (showSections) {
          drawSectionTitle(doc, formatDisplayDate(dateKey), dateEvents.length);
        }

        drawTableHeader(doc, columns);

        dateEvents.forEach((event, index) => {
          if (doc.y + 36 > FOOTER_Y - 20) {
            drawPageFooter(doc, pageNum.current);
            doc.addPage();
            pageNum.current += 1;
            doc.y = MARGIN;

            doc
              .font('Helvetica-Bold')
              .fontSize(10)
              .fillColor(COLORS.primary)
              .text('Events Report (continued)', MARGIN, doc.y);
            doc.y += 24;

            drawTableHeader(doc, columns);
          }

          const rowH = drawTableRow(doc, columns, event, index, doc.y);
          doc.y += rowH;
        });

        doc.y += 12;
      });

      const summaryY = doc.y + 4;
      if (summaryY + 50 < FOOTER_Y - 20) {
        doc.roundedRect(MARGIN, summaryY, CONTENT_WIDTH, 44, 6).fill(COLORS.primaryLight);
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor(COLORS.primaryDark)
          .text('Summary', MARGIN + 16, summaryY + 10);
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(COLORS.text)
          .text(
            `${events.length} total event${events.length !== 1 ? 's' : ''} across ${selectedDateLabels.length} date${selectedDateLabels.length !== 1 ? 's' : ''}`,
            MARGIN + 16,
            summaryY + 24,
          );
      }
    }

    drawPageFooter(doc, pageNum.current);
    doc.end();
  });
