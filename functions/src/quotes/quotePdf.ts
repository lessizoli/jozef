import PDFDocument from 'pdfkit';
import type { QuoteContext } from './quoteModel';

const regularFont = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans.ttf');
const boldFont = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf');
const labels = {
  hu: { title: 'ÁRAJÁNLAT', provider: 'Szolgáltató', details: 'AJÁNLAT ADATAI', number: 'Sorszám', issued: 'Kiállítás', valid: 'Érvényes', customer: 'MEGRENDELŐ', project: 'Projekt', description: 'MEGNEVEZÉS', quantity: 'MENNY.', unitPrice: 'EGYSÉGÁR', vat: 'ÁFA', net: 'NETTÓ', netTotal: 'Nettó összesen', vatTotal: 'ÁFA összesen', gross: 'BRUTTÓ', note: 'MEGJEGYZÉS', categories: { material: 'Anyag', labor: 'Munkadíj', other: 'Egyéb' } },
  de: { title: 'ANGEBOT', provider: 'Auftragnehmer', details: 'ANGEBOTSDATEN', number: 'Nummer', issued: 'Ausgestellt', valid: 'Gültig bis', customer: 'AUFTRAGGEBER', project: 'Projekt', description: 'BEZEICHNUNG', quantity: 'MENGE', unitPrice: 'EINZELPREIS', vat: 'MWST.', net: 'NETTO', netTotal: 'Nettosumme', vatTotal: 'MwSt. gesamt', gross: 'BRUTTO', note: 'BEMERKUNG', categories: { material: 'Material', labor: 'Arbeitslohn', other: 'Sonstiges' } },
} as const;

function dateLabel(value: string, locale: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString(locale);
}

export async function createQuotePdf({ project, company, quote }: QuoteContext) {
  const language = project.communicationLanguage === 'de' ? 'de' : 'hu';
  const text = labels[language];
  const locale = language === 'de' ? 'de-DE' : 'hu-HU';
  const baseCurrency = project.currency === 'EUR' ? 'EUR' : 'HUF';
  const currency = language === 'de' ? 'EUR' : 'HUF';
  const rate = Number(project.quoteData?.exchangeRate?.hufPerEur);
  const convert = (value: number) => baseCurrency === currency ? value : baseCurrency === 'HUF' ? value / rate : value * rate;
  const localizedMoney = new Intl.NumberFormat(locale, { maximumFractionDigits: currency === 'HUF' ? 0 : 2, minimumFractionDigits: currency === 'EUR' ? 2 : 0 });
  const formatMoney = (value: number) => `${localizedMoney.format(convert(value))} ${currency === 'HUF' ? 'Ft' : '€'}`;
  const localizedDescription = (item: typeof quote.items[number]) => item.descriptionTranslations?.[language] || item.description;
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('Regular', regularFont);
    doc.registerFont('Bold', boldFont);
    doc.font('Regular');

    doc.fillColor('#0f172a').font('Bold').fontSize(22).text(text.title, { align: 'right' });
    doc.moveDown(0.4).fontSize(11).fillColor('#334155').text(String(company.name ?? text.provider), { align: 'right' });
    doc.moveDown(1.5);

    const infoY = doc.y;
    doc.font('Bold').fontSize(10).fillColor('#64748b').text(text.details, 48, infoY);
    doc.font('Regular').fillColor('#0f172a').text(`${text.number}: ${quote.quoteNumber}`, 48, infoY + 20);
    doc.text(`${text.issued}: ${dateLabel(quote.issueDate, locale)}`, 48, infoY + 36);
    doc.text(`${text.valid}: ${dateLabel(quote.validUntil, locale)}`, 48, infoY + 52);

    doc.font('Bold').fillColor('#64748b').text(text.customer, 315, infoY);
    doc.font('Regular').fillColor('#0f172a').text(String(project.client?.name ?? ''), 315, infoY + 20, { width: 232 });
    doc.text(String(project.client?.address ?? ''), 315, infoY + 36, { width: 232 });
    doc.text(String(project.client?.email ?? ''), 315, infoY + 52, { width: 232 });
    doc.y = infoY + 88;
    doc.font('Bold').fontSize(12).text(String(project.title ?? text.project));
    doc.moveDown(1);

    const columns = { description: 48, quantity: 296, unitPrice: 362, vat: 446, total: 486 };
    const widths = { description: 238, quantity: 56, unitPrice: 74, vat: 34, total: 61 };

    function header() {
      const y = doc.y;
      doc.rect(48, y, 499, 24).fill('#e2e8f0');
      doc.font('Bold').fontSize(8).fillColor('#334155');
      doc.text(text.description, columns.description + 5, y + 8, { width: widths.description });
      doc.text(text.quantity, columns.quantity, y + 8, { width: widths.quantity, align: 'right' });
      doc.text(text.unitPrice, columns.unitPrice, y + 8, { width: widths.unitPrice, align: 'right' });
      doc.text(text.vat, columns.vat, y + 8, { width: widths.vat, align: 'right' });
      doc.text(text.net, columns.total, y + 8, { width: widths.total, align: 'right' });
      doc.y = y + 30;
    }

    header();
    quote.items.forEach((item) => {
      const description = `${text.categories[item.category]} · ${localizedDescription(item)}`;
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
    doc.font('Regular').fontSize(10).fillColor('#334155').text(text.netTotal, totalX, totalsY, { width: 110 });
    doc.font('Bold').fillColor('#0f172a').text(formatMoney(quote.netTotal), 460, totalsY, { width: 87, align: 'right' });
    doc.font('Regular').fillColor('#334155').text(text.vatTotal, totalX, totalsY + 20, { width: 110 });
    doc.font('Bold').fillColor('#0f172a').text(formatMoney(quote.vatTotal), 460, totalsY + 20, { width: 87, align: 'right' });
    doc.rect(totalX, totalsY + 42, 197, 34).fill('#0f766e');
    doc.font('Bold').fontSize(11).fillColor('#ffffff').text(text.gross, totalX + 10, totalsY + 53, { width: 70 });
    doc.text(formatMoney(quote.grossTotal), totalX + 82, totalsY + 53, { width: 105, align: 'right' });
    doc.y = totalsY + 94;

    const localizedNote = quote.noteTranslations?.[language] || quote.note;
    if (localizedNote) {
      doc.font('Bold').fontSize(9).fillColor('#64748b').text(text.note, 48, doc.y, { width: 499 });
      doc.moveDown(0.4).font('Regular').fontSize(9).fillColor('#334155').text(localizedNote, 48, doc.y, { width: 499, lineGap: 2 });
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
