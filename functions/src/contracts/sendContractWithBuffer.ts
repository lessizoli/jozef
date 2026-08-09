import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as nodemailer from 'nodemailer';
import { getContractContext, contractFilename } from './contractModel';
import { createContractPdf } from './contractPdf';

const SMTP_USER = defineSecret('SMTP_USER');
const SMTP_PASS = defineSecret('SMTP_PASS');
const SMTP_HOST = defineSecret('SMTP_HOST');

export const sendContractWithBuffer = onCall({ secrets: [SMTP_USER, SMTP_PASS, SMTP_HOST] }, async (request) => {
  const context = await getContractContext(request.auth?.uid, request.data?.projectId);
  const email = context.project.client?.email;
  if (typeof email !== 'string' || !email.trim()) {
    throw new HttpsError('failed-precondition', 'Az ügyfél e-mail-címe nincs megadva.');
  }
  if (context.project.modules?.quote?.enabled !== false && context.project.modules?.quote?.status !== 'Elfogadva') {
    throw new HttpsError('failed-precondition', 'A szerződés csak elfogadott ajánlat után küldhető ki.');
  }

  const pdf = await createContractPdf(context);
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST.value(),
    port: 465,
    secure: true,
    auth: { user: SMTP_USER.value(), pass: SMTP_PASS.value() },
  });

  await transporter.sendMail({
    from: `"${String(context.company.name ?? context.contract.contractorName)}" <${SMTP_USER.value()}>`,
    to: email,
    subject: `Szerződés - ${String(context.project.title ?? context.contract.contractNumber)}`,
    text: `Tisztelt ${String(context.project.client?.name ?? 'Ügyfelünk')}!\n\nMellékelten küldjük a(z) ${context.contract.contractNumber} számú szerződéstervezetet. Kérjük, átolvasás és elfogadás után juttassa vissza az aláírt példányt.\n\nÜdvözlettel:\n${context.contract.contractorName}`,
    attachments: [{ filename: contractFilename(context.contract.contractNumber), content: pdf }],
  });

  await context.projectRef.update({
    'contractData.sentAt': new Date(),
    'modules.contract.status': 'Kiküldve',
    'modules.contract.delayed': false,
    'modules.contract.statusChangedAt': new Date(),
    status: 'Folyamatban',
    lastAction: 'Szerződés: Kiküldve',
    updatedAt: new Date(),
  });
  return { success: true };
});
