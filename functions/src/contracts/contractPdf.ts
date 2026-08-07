import PDFDocument from 'pdfkit';
import type { ContractContext } from './contractModel';

const regularFont = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans.ttf');
const boldFont = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf');
const money = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 0 });
const pageWidth = 499;
const left = 48;
const contentBottom = 748;

function dateLabel(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString('hu-HU');
}

function formatMoney(value: number) {
  return `${money.format(value)} Ft`;
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number) {
  if (doc.y + height > contentBottom) doc.addPage();
}

function sectionTitle(doc: PDFKit.PDFDocument, index: number, title: string) {
  ensureSpace(doc, 36);
  doc.moveDown(0.8);
  doc.font('Bold').fontSize(11).fillColor('#0f766e').text(`${index}. ${title}`, left, doc.y, { width: pageWidth });
  doc.moveDown(0.45);
}

function paragraph(doc: PDFKit.PDFDocument, value: string) {
  const height = doc.font('Regular').fontSize(9).heightOfString(value, { width: pageWidth, lineGap: 2 });
  ensureSpace(doc, Math.min(height + 12, 160));
  doc.fillColor('#334155').text(value, left, doc.y, { width: pageWidth, lineGap: 2, align: 'justify' });
  doc.moveDown(0.6);
}

function partyBlock(doc: PDFKit.PDFDocument, title: string, lines: string[]) {
  const visibleLines = lines.filter(Boolean);
  const height = 32 + visibleLines.length * 16;
  ensureSpace(doc, height + 8);
  const y = doc.y;
  doc.roundedRect(left, y, pageWidth, height, 6).fillAndStroke('#f8fafc', '#cbd5e1');
  doc.font('Bold').fontSize(9).fillColor('#64748b').text(title.toUpperCase(), left + 12, y + 10, { width: pageWidth - 24 });
  visibleLines.forEach((line, index) => {
    doc.font(index === 0 ? 'Bold' : 'Regular').fontSize(9).fillColor('#0f172a').text(line, left + 12, y + 29 + index * 16, { width: pageWidth - 24 });
  });
  doc.y = y + height + 8;
}

export async function createContractPdf({ project, contract }: ContractContext) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('Regular', regularFont);
    doc.registerFont('Bold', boldFont);
    doc.font('Regular');

    doc.font('Bold').fontSize(21).fillColor('#0f172a').text('VÁLLALKOZÁSI SZERZŐDÉS', { align: 'center' });
    doc.moveDown(0.35).font('Regular').fontSize(9).fillColor('#64748b').text(`Szerződésszám: ${contract.contractNumber}`, { align: 'center' });
    doc.moveDown(1.3);

    paragraph(doc, 'amely létrejött egyrészről a Vállalkozó, másrészről a Megrendelő között az alábbi feltételekkel:');
    partyBlock(doc, 'Vállalkozó', [
      contract.contractorName,
      `Székhely / cím: ${contract.contractorAddress}`,
      contract.contractorTaxNumber ? `Adószám: ${contract.contractorTaxNumber}` : '',
      contract.contractorRepresentative ? `Képviselő: ${contract.contractorRepresentative}` : '',
    ]);
    partyBlock(doc, 'Megrendelő', [
      String(project.client?.name ?? ''),
      `Lakcím / székhely: ${String(project.client?.address ?? '')}`,
      contract.clientTaxNumber ? `Adószám: ${contract.clientTaxNumber}` : '',
      contract.clientRepresentative ? `Képviselő: ${contract.clientRepresentative}` : '',
      project.client?.email ? `E-mail: ${String(project.client.email)}` : '',
      project.client?.phone ? `Telefon: ${String(project.client.phone)}` : '',
    ]);

    sectionTitle(doc, 1, 'A szerződés tárgya');
    paragraph(doc, `A Megrendelő megrendeli, a Vállalkozó pedig elvállalja az alábbi munka eredményes elvégzését: ${contract.workDescription}`);
    paragraph(doc, `A teljesítés helye: ${String(project.client?.address ?? 'a felek által egyeztetett helyszín')}. A Vállalkozó a munkát a szerződés, az elfogadott ajánlat és a felek dokumentált egyeztetései szerint végzi el.`);

    sectionTitle(doc, 2, 'Vállalkozói díj és fizetés');
    paragraph(doc, `A teljes bruttó vállalkozói díj ${formatMoney(contract.grossAmount)}, amelyből az előleg összege ${formatMoney(contract.depositAmount)}. A fennmaradó összeg ${formatMoney(contract.grossAmount - contract.depositAmount)}.`);
    paragraph(doc, `Fizetési feltételek: ${contract.paymentTerms}`);
    paragraph(doc, 'A szerződésben nem szereplő pótmunkát vagy műszaki tartalomváltozást a felek előzetesen, dokumentálható módon egyeztetik, annak díjával és határidejével együtt.');

    sectionTitle(doc, 3, 'Teljesítési határidők');
    paragraph(doc, `A tervezett munkakezdés: ${dateLabel(contract.startDate)}. A vállalt befejezési határidő: ${dateLabel(contract.completionDate)}.`);
    paragraph(doc, 'A Megrendelő biztosítja a munkaterület megközelíthetőségét és a teljesítéshez szükséges, előzetesen egyeztetett feltételeket. A felek a teljesítést érintő akadályról késedelem nélkül tájékoztatják egymást.');

    sectionTitle(doc, 4, 'Átadás, jótállás és hibás teljesítés');
    paragraph(doc, `A felek a munka befejezésekor átadás-átvételt tartanak. A vállalt jótállási idő ${contract.warrantyMonths} hónap. Ez a kikötés nem korlátozza a Megrendelő jogszabály alapján fennálló szavatossági vagy kötelező jótállási jogait.`);
    paragraph(doc, 'A Megrendelő az észlelt hibát annak felismerése után észszerű időn belül jelzi a Vállalkozónak, és lehetőséget biztosít a hiba megvizsgálására, illetve kijavítására.');

    sectionTitle(doc, 5, 'Egyéb feltételek');
    paragraph(doc, contract.additionalTerms || 'A felek további egyedi feltételt nem rögzítettek.');

    sectionTitle(doc, 6, 'Záró rendelkezések');
    paragraph(doc, 'A felek a vitás kérdéseket elsődlegesen egyeztetéssel rendezik. A szerződésben nem szabályozott kérdésekben a Polgári Törvénykönyv és az egyéb irányadó magyar jogszabályok rendelkezései alkalmazandók.');
    paragraph(doc, 'A felek a szerződést elolvasás és közös értelmezés után, mint akaratukkal mindenben megegyezőt írják alá.');

    ensureSpace(doc, 105);
    doc.moveDown(1.2).font('Regular').fontSize(9).fillColor('#334155').text(`Kelt: ${dateLabel(contract.issueDate)}`, left, doc.y, { width: pageWidth });
    const signatureY = doc.y + 55;
    doc.moveTo(left, signatureY).lineTo(left + 190, signatureY).strokeColor('#94a3b8').stroke();
    doc.moveTo(357, signatureY).lineTo(547, signatureY).strokeColor('#94a3b8').stroke();
    doc.font('Regular').fontSize(8).fillColor('#64748b').text('Vállalkozó', left, signatureY + 7, { width: 190, align: 'center' });
    doc.text('Megrendelő', 357, signatureY + 7, { width: 190, align: 'center' });

    const range = doc.bufferedPageRange();
    for (let index = range.start; index < range.start + range.count; index += 1) {
      doc.switchToPage(index);
      doc.font('Regular').fontSize(8).fillColor('#94a3b8').text(
        `${contract.contractNumber} · ${index + 1}/${range.count}`,
        left,
        770,
        { width: pageWidth, align: 'center' },
      );
    }
    doc.end();
  });
}
