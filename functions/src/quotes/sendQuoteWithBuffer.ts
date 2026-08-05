import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as nodemailer from 'nodemailer';
import { createQuotePdf } from './quotePdf';
import { getQuoteContext, quoteFilename } from './quoteModel';

const SMTP_USER = defineSecret('SMTP_USER');
const SMTP_PASS = defineSecret('SMTP_PASS');
const SMTP_HOST = defineSecret('SMTP_HOST');

export const sendQuoteWithBuffer = onCall({ secrets: [SMTP_USER, SMTP_PASS, SMTP_HOST] }, async (request) => {
  const context = await getQuoteContext(request.auth?.uid, request.data?.projectId);
  const email = context.project.client?.email;
  if (typeof email !== 'string' || !email.trim()) {
    throw new HttpsError('failed-precondition', 'Az ügyfél e-mail-címe nincs megadva.');
  }

  const pdf = await createQuotePdf(context);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST.value(),
    port: 465,
    secure: true,
    auth: { user: SMTP_USER.value(), pass: SMTP_PASS.value() },
  });

  await transporter.sendMail({
    from: `"${String(context.company.name ?? 'Envision CRM')}" <${SMTP_USER.value()}>`,
    to: email,
    subject: `Árajánlat – ${String(context.project.title ?? context.quote.quoteNumber)}`,
    text: `Tisztelt ${String(context.project.client?.name ?? 'Ügyfelünk')}!\n\nMellékelten küldjük a(z) ${context.quote.quoteNumber} számú árajánlatot, amely ${context.quote.validUntil}-ig érvényes.\n\nÜdvözlettel:\n${String(context.company.name ?? 'Envision CRM')}`,
    attachments: [{ filename: quoteFilename(context.quote.quoteNumber), content: pdf }],
  });

  await context.projectRef.update({
    'quoteData.sentAt': new Date(),
    'modules.quote.status': 'Kiküldve',
    'modules.quote.delayed': false,
    status: 'Folyamatban',
    lastAction: 'Ajánlat: Kiküldve',
    updatedAt: new Date(),
  });
  return { success: true };
});
