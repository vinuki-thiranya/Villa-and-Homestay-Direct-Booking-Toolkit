import { Injectable } from '@nestjs/common';
import { formatMoney } from '@staydirect/shared';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export interface DocParty {
  name: string;
  lines: string[]; // address, phone, email, registration numbers …
}

export interface DocLine {
  description: string;
  qty?: number;
  unitPrice?: number;
  amount: number;
}

export interface InvoiceDoc {
  title: string; // "Invoice", "Tax invoice", "Statement"
  number: string;
  issuedAt: Date;
  seller: DocParty;
  billTo: DocParty;
  /** Extra key/value rows under the header, e.g. Period, Stay address, Booking reference. */
  facts: [string, string][];
  lines: DocLine[];
  currency: string;
  totals: [string, number][]; // e.g. [['Subtotal', x], ['Taxes', y], ['Total', z], ['Paid', p], ['Balance due', b]]
  /** Free-text paragraphs after the totals (residence confirmation for the nomad visa, payment terms…). */
  notes: string[];
  footer: string; // "Powered by StayDirect LK" or the white-label brand
}

const INK = '#14201f';
const MUTED = '#5b6765';
const RULE = '#d9d6ce';

/** PDF invoices and statements (pdfkit: pure JS, no headless browser on the API box). */
@Injectable()
export class DocumentsService {
  pdf(doc: InvoiceDoc): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const pdf = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `${doc.title} ${doc.number}`, Author: doc.seller.name } });
      const chunks: Buffer[] = [];
      pdf.on('data', (c: Buffer) => chunks.push(c));
      pdf.on('end', () => resolve(Buffer.concat(chunks)));
      pdf.on('error', reject);
      const money = (n: number) => formatMoney(n, doc.currency);
      const left = 50;
      const right = pdf.page.width - 50;
      const width = right - left;

      // Header: seller on the left, document title and number on the right.
      pdf.fillColor(INK).font('Helvetica-Bold').fontSize(16).text(doc.seller.name, left, 50, { width: width * 0.6 });
      pdf.font('Helvetica').fontSize(9).fillColor(MUTED);
      for (const l of doc.seller.lines) pdf.text(l, { width: width * 0.6 });
      pdf.font('Helvetica-Bold').fontSize(18).fillColor(INK).text(doc.title, left, 50, { width, align: 'right' });
      pdf.font('Helvetica').fontSize(10).fillColor(MUTED).text(doc.number, { width, align: 'right' });
      pdf.text(doc.issuedAt.toISOString().slice(0, 10), { width, align: 'right' });

      // Bill to + facts.
      let y = Math.max(pdf.y, 130) + 20;
      pdf.font('Helvetica-Bold').fontSize(9).fillColor(MUTED).text('Billed to', left, y);
      pdf.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(doc.billTo.name, left, y + 12, { width: width / 2 - 10 });
      pdf.font('Helvetica').fontSize(9).fillColor(MUTED);
      for (const l of doc.billTo.lines) pdf.text(l, { width: width / 2 - 10 });
      const leftBottom = pdf.y;
      let fy = y;
      for (const [k, v] of doc.facts) {
        pdf.font('Helvetica').fontSize(9).fillColor(MUTED).text(k, left + width / 2, fy, { width: 110 });
        pdf.font('Helvetica').fontSize(9).fillColor(INK).text(v, left + width / 2 + 110, fy, { width: width / 2 - 110 });
        fy = pdf.y + 3;
      }
      y = Math.max(leftBottom, fy) + 24;

      // Line items.
      const cols = { desc: left, qty: left + width * 0.58, unit: left + width * 0.7, amt: left + width * 0.84 };
      pdf.font('Helvetica-Bold').fontSize(9).fillColor(MUTED);
      pdf.text('Description', cols.desc, y);
      pdf.text('Qty', cols.qty, y, { width: 50, align: 'right' });
      pdf.text('Unit', cols.unit, y, { width: 70, align: 'right' });
      pdf.text('Amount', cols.amt, y, { width: right - cols.amt, align: 'right' });
      y += 16;
      pdf.moveTo(left, y - 4).lineTo(right, y - 4).strokeColor(RULE).lineWidth(0.7).stroke();
      pdf.font('Helvetica').fontSize(10).fillColor(INK);
      for (const line of doc.lines) {
        if (y > pdf.page.height - 160) {
          pdf.addPage();
          y = 50;
        }
        pdf.text(line.description, cols.desc, y, { width: cols.qty - cols.desc - 10 });
        const rowBottom = pdf.y;
        if (line.qty != null) pdf.text(String(line.qty), cols.qty, y, { width: 50, align: 'right' });
        if (line.unitPrice != null) pdf.text(money(line.unitPrice), cols.unit, y, { width: 70, align: 'right' });
        pdf.text(money(line.amount), cols.amt, y, { width: right - cols.amt, align: 'right' });
        y = Math.max(rowBottom, pdf.y) + 6;
      }
      pdf.moveTo(left, y).lineTo(right, y).strokeColor(RULE).stroke();
      y += 10;

      // Totals, right-aligned; the last row is emphasised.
      doc.totals.forEach(([label, value], i) => {
        const strong = i === doc.totals.length - 1;
        pdf.font(strong ? 'Helvetica-Bold' : 'Helvetica').fontSize(strong ? 11 : 10).fillColor(strong ? INK : MUTED);
        pdf.text(label, cols.unit - 60, y, { width: 130, align: 'right' });
        pdf.fillColor(INK).text(money(value), cols.amt, y, { width: right - cols.amt, align: 'right' });
        y = pdf.y + 4;
      });

      y += 16;
      pdf.font('Helvetica').fontSize(9.5).fillColor(INK);
      for (const n of doc.notes) {
        pdf.text(n, left, y, { width, lineGap: 2 });
        y = pdf.y + 8;
      }
      pdf.font('Helvetica').fontSize(8).fillColor(MUTED).text(doc.footer, left, pdf.page.height - 60, { width, align: 'center' });
      pdf.end();
    });
  }

  /** One-sheet Excel export (statements, ledgers). */
  async xlsx(sheetName: string, columns: { header: string; key: string; width?: number; money?: boolean }[], rows: Record<string, unknown>[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'StayDirect LK';
    const ws = wb.addWorksheet(sheetName.slice(0, 31));
    ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18, style: c.money ? { numFmt: '#,##0.00' } : {} }));
    ws.getRow(1).font = { bold: true };
    for (const r of rows) ws.addRow(r);
    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
