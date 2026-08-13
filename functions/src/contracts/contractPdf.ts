import PDFDocument from 'pdfkit';
import type { ContractContext } from './contractModel';

const regularFont = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans.ttf');
const boldFont = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf');
const pageWidth = 499;
const left = 48;
const contentBottom = 748;

function dateLabel(value: string, locale: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString(locale);
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
  const german = project.communicationLanguage === 'de';
  const locale = german ? 'de-DE' : 'hu-HU';
  const money = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const currency = typeof project.currency === 'string' ? project.currency : 'HUF';
  const formatMoney = (value: number) => `${money.format(value)} ${currency === 'HUF' ? 'Ft' : currency}`;
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('Regular', regularFont);
    doc.registerFont('Bold', boldFont);
    doc.font('Regular');

    doc.font('Bold').fontSize(21).fillColor('#0f172a').text(german ? 'WERKVERTRAG' : 'VÁLLALKOZÁSI SZERZŐDÉS', { align: 'center' });
    doc.moveDown(0.35).font('Regular').fontSize(9).fillColor('#64748b').text(`${german ? 'Vertragsnummer' : 'Szerződésszám'}: ${contract.contractNumber}`, { align: 'center' });
    doc.moveDown(1.3);

    paragraph(doc, german ? 'geschlossen zwischen dem Auftragnehmer und dem Auftraggeber zu den folgenden Bedingungen:' : 'amely létrejött egyrészről a Vállalkozó, másrészről a Megrendelő között az alábbi feltételekkel:');
    partyBlock(doc, german ? 'Auftragnehmer' : 'Vállalkozó', [
      contract.contractorName,
      `${german ? 'Sitz / Anschrift' : 'Székhely / cím'}: ${contract.contractorAddress}`,
      contract.contractorTaxNumber ? `${german ? 'Steuernummer' : 'Adószám'}: ${contract.contractorTaxNumber}` : '',
      contract.contractorRepresentative ? `${german ? 'Vertreter' : 'Képviselő'}: ${contract.contractorRepresentative}` : '',
    ]);
    partyBlock(doc, german ? 'Auftraggeber' : 'Megrendelő', [
      String(project.client?.name ?? ''),
      `${german ? 'Anschrift / Sitz' : 'Lakcím / székhely'}: ${String(project.client?.address ?? '')}`,
      contract.clientTaxNumber ? `${german ? 'Steuernummer' : 'Adószám'}: ${contract.clientTaxNumber}` : '',
      contract.clientRepresentative ? `${german ? 'Vertreter' : 'Képviselő'}: ${contract.clientRepresentative}` : '',
      project.client?.email ? `E-mail: ${String(project.client.email)}` : '',
      project.client?.phone ? `Telefon: ${String(project.client.phone)}` : '',
    ]);

    sectionTitle(doc, 1, german ? 'Vertragsgegenstand' : 'A szerződés tárgya');
    paragraph(doc, german ? `Der Auftraggeber beauftragt den Auftragnehmer mit der ordnungsgemäßen Ausführung folgender Arbeiten: ${contract.workDescription}` : `A Megrendelő megrendeli, a Vállalkozó pedig elvállalja az alábbi munka eredményes elvégzését: ${contract.workDescription}`);
    paragraph(doc, german ? `Leistungsort: ${String(project.client?.address ?? 'der von den Parteien vereinbarte Ort')}. Die Arbeiten werden gemäß diesem Vertrag, dem angenommenen Angebot und den dokumentierten Vereinbarungen der Parteien ausgeführt.` : `A teljesítés helye: ${String(project.client?.address ?? 'a felek által egyeztetett helyszín')}. A Vállalkozó a munkát a szerződés, az elfogadott ajánlat és a felek dokumentált egyeztetései szerint végzi el.`);

    sectionTitle(doc, 2, german ? 'Vergütung und Zahlung' : 'Vállalkozói díj és fizetés');
    paragraph(doc, german ? `Die Brutto-Gesamtvergütung beträgt ${formatMoney(contract.grossAmount)}. Die Anzahlung beträgt ${formatMoney(contract.depositAmount)}, der Restbetrag ${formatMoney(contract.grossAmount - contract.depositAmount)}.` : `A teljes bruttó vállalkozói díj ${formatMoney(contract.grossAmount)}, amelyből az előleg összege ${formatMoney(contract.depositAmount)}. A fennmaradó összeg ${formatMoney(contract.grossAmount - contract.depositAmount)}.`);
    paragraph(doc, `${german ? 'Zahlungsbedingungen' : 'Fizetési feltételek'}: ${contract.paymentTerms}`);
    paragraph(doc, german ? 'Zusätzliche Arbeiten oder Änderungen des Leistungsumfangs werden vorab nachvollziehbar einschließlich Vergütung und Frist vereinbart.' : 'A szerződésben nem szereplő pótmunkát vagy műszaki tartalomváltozást a felek előzetesen, dokumentálható módon egyeztetik, annak díjával és határidejével együtt.');

    sectionTitle(doc, 3, german ? 'Ausführungsfristen' : 'Teljesítési határidők');
    paragraph(doc, german ? `Geplanter Arbeitsbeginn: ${dateLabel(contract.startDate, locale)}. Vereinbarter Fertigstellungstermin: ${dateLabel(contract.completionDate, locale)}.` : `A tervezett munkakezdés: ${dateLabel(contract.startDate, locale)}. A vállalt befejezési határidő: ${dateLabel(contract.completionDate, locale)}.`);
    paragraph(doc, german ? 'Der Auftraggeber gewährleistet den Zugang zum Arbeitsbereich und die vorab vereinbarten Ausführungsbedingungen. Die Parteien informieren einander unverzüglich über Leistungshindernisse.' : 'A Megrendelő biztosítja a munkaterület megközelíthetőségét és a teljesítéshez szükséges, előzetesen egyeztetett feltételeket. A felek a teljesítést érintő akadályról késedelem nélkül tájékoztatják egymást.');

    sectionTitle(doc, 4, german ? 'Abnahme, Garantie und Mängel' : 'Átadás, jótállás és hibás teljesítés');
    paragraph(doc, german ? `Nach Fertigstellung erfolgt die Abnahme. Die vereinbarte Garantiezeit beträgt ${contract.warrantyMonths} Monate. Gesetzliche Gewährleistungsrechte bleiben unberührt.` : `A felek a munka befejezésekor átadás-átvételt tartanak. A vállalt jótállási idő ${contract.warrantyMonths} hónap. Ez a kikötés nem korlátozza a Megrendelő jogszabály alapján fennálló szavatossági vagy kötelező jótállási jogait.`);
    paragraph(doc, german ? 'Festgestellte Mängel sind dem Auftragnehmer innerhalb angemessener Frist mitzuteilen; ihm ist Gelegenheit zur Prüfung und Nachbesserung zu geben.' : 'A Megrendelő az észlelt hibát annak felismerése után észszerű időn belül jelzi a Vállalkozónak, és lehetőséget biztosít a hiba megvizsgálására, illetve kijavítására.');

    sectionTitle(doc, 5, german ? 'Weitere Bedingungen' : 'Egyéb feltételek');
    paragraph(doc, contract.additionalTerms || (german ? 'Die Parteien haben keine weiteren individuellen Bedingungen vereinbart.' : 'A felek további egyedi feltételt nem rögzítettek.'));

    sectionTitle(doc, 6, german ? 'Schlussbestimmungen' : 'Záró rendelkezések');
    paragraph(doc, german ? 'Streitigkeiten werden vorrangig durch Verhandlungen beigelegt. Für nicht geregelte Fragen gelten das ungarische Bürgerliche Gesetzbuch und die sonstigen maßgeblichen ungarischen Rechtsvorschriften.' : 'A felek a vitás kérdéseket elsődlegesen egyeztetéssel rendezik. A szerződésben nem szabályozott kérdésekben a Polgári Törvénykönyv és az egyéb irányadó magyar jogszabályok rendelkezései alkalmazandók.');
    paragraph(doc, german ? 'Die Parteien unterzeichnen diesen Vertrag nach gemeinsamer Prüfung als vollständig ihrem Willen entsprechend.' : 'A felek a szerződést elolvasás és közös értelmezés után, mint akaratukkal mindenben megegyezőt írják alá.');

    ensureSpace(doc, 105);
    doc.moveDown(1.2).font('Regular').fontSize(9).fillColor('#334155').text(`${german ? 'Datum' : 'Kelt'}: ${dateLabel(contract.issueDate, locale)}`, left, doc.y, { width: pageWidth });
    const signatureY = doc.y + 55;
    doc.moveTo(left, signatureY).lineTo(left + 190, signatureY).strokeColor('#94a3b8').stroke();
    doc.moveTo(357, signatureY).lineTo(547, signatureY).strokeColor('#94a3b8').stroke();
    doc.font('Regular').fontSize(8).fillColor('#64748b').text(german ? 'Auftragnehmer' : 'Vállalkozó', left, signatureY + 7, { width: 190, align: 'center' });
    doc.text(german ? 'Auftraggeber' : 'Megrendelő', 357, signatureY + 7, { width: 190, align: 'center' });

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
