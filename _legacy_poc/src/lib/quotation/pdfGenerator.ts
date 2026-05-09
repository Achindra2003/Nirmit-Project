import { jsPDF } from 'jspdf';
import type { BOQ } from './billOfQuantities';
import { formatINR, generateHindiSection, generateRoomSketchSVG } from './billOfQuantities';

export function generateQuotationPDF(
  boq: BOQ,
  metadata: {
    roomType: string;
    roomDimensions: string;
    city: string;
    date: string;
    imageData?: string;
    scope?: string;
    /** Room dimensions for floor plan sketch */
    roomW?: number;
    roomL?: number;
    /** Layout items for sketch */
    layoutItems?: Array<{ name: string; x: number; y: number; width: number; length: number; rotation: number; code: string }>;
  }
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 20;
  let y = margin;
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - margin * 2;

  // Helper functions
  const addLine = (text: string, fontSize = 10, bold = false, color = '#1C1917') => {
    doc.setFontSize(fontSize);
    doc.setTextColor(color);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(text, margin, y);
    y += fontSize * 0.45;
  };

  const addSpacer = (height = 4) => { y += height; };

  const addTableHeader = (headers: string[], widths: number[]) => {
    let x = margin;
    doc.setFillColor('#1C1917');
    doc.setTextColor('#FFFFFF');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    headers.forEach((header, i) => {
      doc.rect(x, y, widths[i], 7, 'F');
      doc.text(header, x + 2, y + 5);
      x += widths[i];
    });
    y += 8;
    doc.setTextColor('#1C1917');
  };

  const addTableRow = (cells: string[], widths: number[], alternate = false) => {
    let x = margin;
    if (alternate) {
      doc.setFillColor('#F8F5F0');
      doc.rect(margin, y - 1, usableWidth, 7, 'F');
    }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    cells.forEach((cell, i) => {
      doc.text(cell, x + 2, y + 5);
      x += widths[i];
    });
    y += 7;
  };

  const checkPageBreak = (needed = 15) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // ─── Page 1: Cover ───
  addLine('NIRMIT BRIEF', 18, true);
  addSpacer(6);
  addLine(`${metadata.roomType} — ${metadata.roomDimensions}`, 12, false, '#555');
  addLine(`${metadata.city} | ${metadata.date}`, 10, false, '#777');
  addSpacer(10);

  doc.setDrawColor('#1C1917');
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  addLine('TOTAL ESTIMATE (Tax-Inclusive)', 10, false, '#555');
  addLine(`₹${formatINR(boq.grandTotal)}`, 22, true);
  addSpacer(4);
  addLine('(Includes 10% contingency + GST)', 9, false, '#888');
  addSpacer(10);

  addLine('Furniture:', 10, true);
  addLine(`₹${formatINR(boq.furniture.reduce((s, i) => s + i.amount, 0))}`, 10);
  addLine('Materials:', 10, true);
  addLine(`₹${formatINR(boq.materials.reduce((s, i) => s + i.amount, 0))}`, 10);
  addLine('Labor:', 10, true);
  addLine(`₹${formatINR(boq.labor.reduce((s, i) => s + i.amount, 0))}`, 10);
  addSpacer(4);

  // Tax breakdown on cover
  addLine('Tax Breakdown:', 10, true);
  addLine(`CGST (9%): ₹${formatINR(boq.taxBreakdown.cgst)}`, 9, false, '#555');
  addLine(`SGST (9%): ₹${formatINR(boq.taxBreakdown.sgst)}`, 9, false, '#555');
  addLine(`Total GST: ₹${formatINR(boq.taxBreakdown.totalTax)}`, 9, true, '#1C1917');

  if (metadata.imageData) {
    addSpacer(10);
    addLine('VISUAL EVIDENCE', 11, true);
    addSpacer(4);
    // 2D/3D captures typically come out wide. We scale to fit usable width.
    doc.addImage(metadata.imageData, 'PNG', margin, y, usableWidth, usableWidth / 2.2);
    y += (usableWidth / 2.2) + 10;
  }

  // ─── Room Sketch (SVG) on cover ───
  if (metadata.roomW && metadata.roomL) {
    addSpacer(4);
    addLine('ROOM FLOOR PLAN', 11, true);
    addSpacer(3);
    try {
      const svg = generateRoomSketchSVG({
        width: metadata.roomW,
        length: metadata.roomL,
        items: metadata.layoutItems ?? [],
      });
      // Embed SVG via canvas approach: jsPDF can't embed SVG directly,
      // so we include it as a text note that the sketch is available.
      // Use a rendered data URI approach if available, otherwise show dimensions.
      // jsPDF supports addSvgAsImage in newer versions
      if (typeof (doc as unknown as Record<string, unknown>)['addSvgAsImage'] === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (doc as any).addSvgAsImage(svg, margin, y, usableWidth, usableWidth * 0.5);
        y += usableWidth * 0.5 + 6;
      } else {
        // Fallback: show room sketch dimensions text
        addLine(`Room: ${metadata.roomW}m × ${metadata.roomL}m (${Math.round(metadata.roomW * metadata.roomL * 10.7639)} sq ft)`, 9, false, '#555');
        addLine('(2D floor plan sketch attached separately)', 7, false, '#999');
        addSpacer(2);
      }
    } catch {
      addLine(`Room: ${metadata.roomW}m × ${metadata.roomL}m`, 9, false, '#555');
    }
    addSpacer(6);
  }

  if (metadata.scope) {
    checkPageBreak(40);
    addLine('SCOPE OF WORK', 11, true);
    addSpacer(4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#444');
    const lines = doc.splitTextToSize(metadata.scope, usableWidth);
    doc.text(lines, margin, y);
    y += lines.length * 4.5 + 10;
  }

  // ─── Page 2: BOQ Table ───
  doc.addPage();
  y = margin;
  addLine('BILL OF QUANTITIES', 14, true);
  addSpacer(8);

  const colWidths = [10, 80, 15, 20, 25, 30];
  const headers = ['#', 'Item Description', 'Qty', 'Unit', 'Rate (₹)', 'Amount (₹)'];

  const renderSection = (title: string, items: BOQ['furniture']) => {
    checkPageBreak(20);
    addLine(title, 11, true);
    addSpacer(2);
    addTableHeader(headers, colWidths);
    items.forEach((item, i) => {
      checkPageBreak();
      addTableRow(
        [String(item.slNo), item.description, String(item.qty), item.unit, formatINR(item.rate), formatINR(item.amount)],
        colWidths,
        i % 2 === 0
      );
    });
    const total = items.reduce((s, i) => s + i.amount, 0);
    addTableRow(['', 'Subtotal', '', '', '', formatINR(total)], colWidths, false);
    addSpacer(4);
  };

  renderSection('FURNITURE', boq.furniture);
  renderSection('MATERIALS', boq.materials);
  renderSection('LABOR', boq.labor);

  // ─── Execution Sequence ───
  if (boq.executionSequence && boq.executionSequence.length > 0) {
    doc.addPage();
    y = margin;
    addLine('EXECUTION SEQUENCE', 14, true);
    addSpacer(6);
    addLine('Recommended phase-by-phase execution plan:', 9, false, '#555');
    addSpacer(4);

    const phaseColWidths = [8, 80, 50, 25];
    const phaseHeaders = ['#', 'Phase', 'Duration (Days)', 'Cost (₹)'];
    addTableHeader(phaseHeaders, phaseColWidths);

    let phaseIdx = 0;
    for (const phase of boq.executionSequence) {
      checkPageBreak();
      const depStr = phase.dependsOn.length > 0
        ? `      ↳ depends on: ${phase.dependsOn.join(', ')}`
        : '      ↳ can start immediately';
      addTableRow(
        [String(phase.order), `${phase.label}${phaseIdx > 0 ? ' [' + depStr.trim() + ']' : ''}`,
          String(phase.durationDays), formatINR(phase.phaseTotal)],
        phaseColWidths,
        phaseIdx % 2 === 0
      );

      // Show items in this phase
      for (const item of phase.items) {
        addTableRow(
          ['', `  • ${item.description}`, '', formatINR(item.amount)],
          phaseColWidths,
          false
        );
      }
      phaseIdx++;
      addSpacer(2);
    }

    const totalDays = boq.executionSequence.reduce((s, p) => s + p.durationDays, 0);
    addSpacer(4);
    addLine(`Total estimated duration: ${totalDays} working days`, 9, false, '#555');
    addLine('(Actual timeline depends on material availability and contractor schedule)', 7, false, '#999');
    addSpacer(8);
  }

  // ─── Summary ───
  checkPageBreak(40);
  addSpacer(4);
  doc.setDrawColor('#1C1917');
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;
  addLine(`Subtotal: ₹${formatINR(boq.subtotal)}`, 11, true);
  addLine(`Contingency (10%): ₹${formatINR(boq.contingency)}`, 10);
  addSpacer(2);
  addLine(`Total (Excl. Tax): ₹${formatINR(boq.total)}`, 12, true, '#1C1917');
  addSpacer(4);

  // Tax breakdown in summary
  doc.setDrawColor('#C8A96E');
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;
  addLine('GST Breakdown:', 10, true);
  addLine(`CGST @9%: ₹${formatINR(boq.taxBreakdown.cgst)}`, 9, false, '#555');
  addLine(`SGST @9%: ₹${formatINR(boq.taxBreakdown.sgst)}`, 9, false, '#555');
  addLine(`Total GST: ₹${formatINR(boq.taxBreakdown.totalTax)}`, 10, true, '#1C1917');
  addSpacer(4);

  doc.setDrawColor('#1C1917');
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;
  addLine(`GRAND TOTAL (Incl. Tax): ₹${formatINR(boq.grandTotal)}`, 14, true, '#1C1917');
  addSpacer(6);
  addLine('This is an estimate. Actual costs may vary ±10%.', 8, false, '#888');
  addLine('GST rates: 18% on furniture, 28% on luxury items.', 8, false, '#888');
  addLine('Valid for 30 days from date of issue.', 8, false, '#888');
  addSpacer(4);
  addLine('Generated by Nirmit', 8, false, '#AAA');

  // ─── Hindi Carpenter Section (new page) ───
  const hindiText = generateHindiSection(boq);
  if (hindiText) {
    doc.addPage();
    y = margin;
    // Render Hindi text as monospaced (courier preserves ASCII box chars)
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor('#1C1917');
    const hindiLines = hindiText.split('\n');
    for (const line of hindiLines) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 4;
    }
  }

  // ─── Footer on all pages except cover ───
  const pageCount = doc.getNumberOfPages();
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor('#CCC');
    doc.text(`Nirmit Brief | Generated ${metadata.date}`, margin, doc.internal.pageSize.getHeight() - 10);
  }

  // Download
  doc.save(`Nirmit_Brief_${metadata.roomType.replace(/\s/g, '_')}.pdf`);

  return doc;
}