import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import * as nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

const db = getFirestore();

const SMTP_USER = defineSecret('SMTP_USER');
const SMTP_PASS = defineSecret('SMTP_PASS');
const SMTP_HOST = defineSecret('SMTP_HOST');

export const sendQuoteWithBuffer = onCall({ secrets: [SMTP_USER, SMTP_PASS, SMTP_HOST] }, async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError('unauthenticated', 'Bejelentkezés szükséges.');

  const { projectId } = request.data;
  if (!projectId) throw new HttpsError('invalid-argument', 'Hiányzó projektazonosító.');

  // 1. Projekt adatok kiolvasása a Firestore-ból
  const projectSnap = await db.doc(`projects/${projectId}`).get();
  if (!projectSnap.exists) throw new HttpsError('not-found', 'A projekt nem található.');
  const project = projectSnap.data();

  // 2. Biztonsági ellenőrzés (Multi-Tenant izoláció)
  const userSnap = await db.doc(`users/${callerUid}`).get();
  if (!userSnap.exists || userSnap.data()?.companyId !== project?.companyId) {
    throw new HttpsError('permission-denied', 'Nincs jogosultságod ehhez a projekthez.');
  }

  if (!project?.quoteData) {
    throw new HttpsError('failed-precondition', 'Ehhez a projekthez még nem készült kalkuláció.');
  }

  // 3. PDF generálása a memóriában (Buffer)
  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    // PDF Tartalom felépítése
    doc.fontSize(20).text('ÁRAJÁNLAT', { align: 'center' }).moveDown();
    doc.fontSize(12).text(`Projekt: ${project.title}`);
    doc.text(`Ügyfél: ${project.client?.name}`);
    doc.text(`Helyszín: ${project.client?.address}`).moveDown();

    doc.text('--------------------------------------------------').moveDown();
    doc.text(`Anyagköltség összesen: ${project.quoteData.materialCost.toLocaleString()} Ft`);
    doc.text(`Munkadíj összesen: ${project.quoteData.laborCost.toLocaleString()} Ft`);
    doc.text(`Végösszeg: ${project.quoteData.totalCost.toLocaleString()} Ft`).moveDown();
    
    doc.fontSize(10).text('Köszönjük a bizalmat!', { align: 'center' });
    doc.end();
  });

  // 4. E-mail küldése Nodemailerrel
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST.value(),
    port: 465,
    secure: true,
    auth: {
      user: SMTP_USER.value(),
      pass: SMTP_PASS.value(),
    },
  });

  await transporter.sendMail({
    from: `"Envision PMS" <${SMTP_USER.value()}>`,
    to: project.client?.email || 'teszt@email.com', // Ha nincs megadva, ideiglenes cím
    subject: `Árajánlat - ${project.title}`,
    text: `Tisztelt ${project.client?.name}!\n\nMellékelten küldjük a kért árajánlatot.`,
    attachments: [
      {
        filename: `arajanlat_${projectId}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  // 5. Státusz frissítése Firestore-ban
  await db.doc(`projects/${projectId}`).update({
    status: 'Árajánlat elküldve',
    updatedAt: new Date()
  });

  return { success: true };
});