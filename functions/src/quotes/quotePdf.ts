import PDFDocument from 'pdfkit';
import type { QuoteContext, QuoteLine } from './quoteModel';

const regularFont = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans.ttf');
const boldFont = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf');
const money = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 0 });

const categoryLabels: Record<QuoteLine['category'], string> = {
  material: 'Anyag',
  labor: 'Munkadíj',
  other: 'Egyéb',
};

function dateLabel(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString('hu-HU');
}

function formatMoney(value: number) {
  return `${money.format(value)} Ft`;
}

export async function createQuotePdf({ project, company, quote }: QuoteContext) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('Regular', regularFont);
    doc.registerFont('Bold', boldFont);
    doc.font('Regular');

    doc.fillColor('#0f172a').font('Bold').fontSize(22).text('ÁRAJÁNLAT', { align: 'right' });
    doc.moveDown(0.4).fontSize(11).fillColor('#334155').text(String(company.name ?? 'Szolgáltató'), { align: 'right' });
    doc.moveDown(1.5);

    const infoY = doc.y;
    doc.font('Bold').fontSize(10).fillColor('#64748b').text('AJÁNLAT ADATAI', 48, infoY);
    doc.font('Regular').fillColor('#0f172a').text(`Sorszám: ${quote.quoteNumber}`, 48, infoY + 20);
    doc.text(`Kiállítás: ${dateLabel(quote.issueDate)}`, 48, infoY + 36);
    doc.text(`Érvényes: ${dateLabel(quote.validUntil)}`, 48, infoY + 52);

    doc.font('Bold').fillColor('#64748b').text('MEGRENDELŐ', 315, infoY);
    doc.font('Regular').fillColor('#0f172a').text(String(project.client?.name ?? ''), 315, infoY + 20, { width: 232 });
    doc.text(String(project.client?.address ?? ''), 315, infoY + 36, { width: 232 });
    doc.text(String(project.client?.email ?? ''), 315, infoY + 52, { width: 232 });
    doc.y = infoY + 88;
    doc.font('Bold').fontSize(12).text(String(project.title ?? 'Projekt'));
    doc.moveDown(1);

    const columns = { description: 48, quantity: 296, unitPrice: 362, vat: 446, total: 486 };
    const widths = { description: 238, quantity: 56, unitPrice: 74, vat: 34, total: 61 };

    function header() {
      const y = doc.y;
      doc.rect(48, y, 499, 24).fill('#e2e8f0');
      doc.font('Bold').fontSize(8).fillColor('#334155');
      doc.text('MEGNEVEZÉS', columns.description + 5, y + 8, { width: widths.description });
      doc.text('MENNY.', columns.quantity, y + 8, { width: widths.quantity, align: 'right' });
      doc.text('EGYSÉGÁR', columns.unitPrice, y + 8, { width: widths.unitPrice, align: 'right' });
      doc.text('ÁFA', columns.vat, y + 8, { width: widths.vat, align: 'right' });
      doc.text('NETTÓ', columns.total, y + 8, { width: widths.total, align: 'right' });
      doc.y = y + 30;
    }

    header();
    quote.items.forEach((item) => {
      const description = `${categoryLabels[item.category]} · ${item.description}`;
      const rowHeight = Math.max(28, doc.heightOfString(description, { width: widths.description }) + 12);
      if (doc.y + rowHeight > 740) {
        doc.addPage();
        header();
      }
      const y = doc.y;
      doc.moveTo(48, y + rowHeight).lineTo(547, y + rowHeight).strokeColor('#e2e8f0').stroke();
      doc.font('Regular').fontSize(8).fillColor('#0f172a');
      doc.text(description, columns.description + 5, y + 6, { width: widths.description });
      doc.text(`${item.quantity} ${item.unit}`, columns.quantity, y + 6, { width: widths.quantity, align: 'right' });
      doc.text(formatMoney(item.unitPrice), columns.unitPrice, y + 6, { width: widths.unitPrice, align: 'right' });
      doc.text(`${item.vatRate}%`, columns.vat, y + 6, { width: widths.vat, align: 'right' });
      doc.text(formatMoney(Math.round(item.quantity * item.unitPrice)), columns.total, y + 6, { width: widths.total, align: 'right' });
      doc.y = y + rowHeight;
    });

    const totalX = 350;
    const totalsY = doc.y + 14;
    doc.font('Regular').fontSize(10).fillColor('#334155').text('Nettó összesen', totalX, totalsY, { width: 110 });
    doc.font('Bold').fillColor('#0f172a').text(formatMoney(quote.netTotal), 460, totalsY, { width: 87, align: 'right' });
    doc.font('Regular').fillColor('#334155').text('ÁFA összesen', totalX, totalsY + 20, { width: 110 });
    doc.font('Bold').fillColor('#0f172a').text(formatMoney(quote.vatTotal), 460, totalsY + 20, { width: 87, align: 'right' });
    doc.rect(totalX, totalsY + 42, 197, 34).fill('#0f766e');
    doc.font('Bold').fontSize(11).fillColor('#ffffff').text('BRUTTÓ', totalX + 10, totalsY + 53, { width: 70 });
    doc.text(formatMoney(quote.grossTotal), totalX + 82, totalsY + 53, { width: 105, align: 'right' });
    doc.y = totalsY + 94;

    if (quote.note) {
      doc.font('Bold').fontSize(9).fillColor('#64748b').text('MEGJEGYZÉS', 48, doc.y, { width: 499 });
      doc.moveDown(0.4).font('Regular').fontSize(9).fillColor('#334155').text(quote.note, 48, doc.y, { width: 499, lineGap: 2 });
    }

    const range = doc.bufferedPageRange();
    for (let index = range.start; index < range.start + range.count; index += 1) {
      doc.switchToPage(index);
      doc.font('Regular').fontSize(8).fillColor('#94a3b8').text(
        `${quote.quoteNumber} · ${index + 1}/${range.count}`,
        48,
        770,
        { width: 499, align: 'center' },
      );
    }
    doc.end();
  });
}
