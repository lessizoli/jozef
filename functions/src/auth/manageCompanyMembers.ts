import { randomBytes } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import * as nodemailer from 'nodemailer';

const db = getFirestore();
const SMTP_USER = defineSecret('SMTP_USER');
const SMTP_PASS = defineSecret('SMTP_PASS');
const SMTP_HOST = defineSecret('SMTP_HOST');
const allowedRoles = ['company_admin', 'project_manager', 'surveyor', 'installer', 'finance'] as const;

async function requireCompanyPermission(uid: string | undefined, permission: 'manageMembers') {
  if (!uid) throw new HttpsError('unauthenticated', 'Bejelentkezés szükséges.');
  const snapshot = await db.doc(`users/${uid}`).get();
  const profile = snapshot.data();
  if (!snapshot.exists || profile?.active === false || !profile?.companyId) {
    throw new HttpsError('permission-denied', 'A felhasználói profil nem aktív.');
  }
  if (!['company_admin', 'admin', 'superadmin'].includes(profile.role)) {
    const settings = await db.doc(`companies/${profile.companyId}/settings/permissions`).get();
    if (settings.data()?.roles?.[profile.role]?.[permission] !== true) {
      throw new HttpsError('permission-denied', 'Ehhez nincs céges jogosultságod.');
    }
  }
  return { companyId: String(profile.companyId), role: String(profile.role) };
}

function validateRole(role: unknown): asserts role is typeof allowedRoles[number] {
  if (typeof role !== 'string' || !allowedRoles.includes(role as typeof allowedRoles[number])) {
    throw new HttpsError('invalid-argument', 'Érvénytelen szerepkör.');
  }
}

export const inviteCompanyMember = onCall({ secrets: [SMTP_USER, SMTP_PASS, SMTP_HOST] }, async (request) => {
  const { companyId } = await requireCompanyPermission(request.auth?.uid, 'manageMembers');
  const fullName = typeof request.data?.fullName === 'string' ? request.data.fullName.trim() : '';
  const email = typeof request.data?.email === 'string' ? request.data.email.trim().toLowerCase() : '';
  const role = request.data?.role;
  validateRole(role);
  if (!fullName || !email) throw new HttpsError('invalid-argument', 'A név és az e-mail-cím kötelező.');

  const existingInvite = await db.collection(`companies/${companyId}/invites`).where('email', '==', email).where('status', '==', 'sent').limit(1).get();
  if (!existingInvite.empty) throw new HttpsError('already-exists', 'Erre az e-mail-címre már van függő meghívás.');

  let userRecord;
  let isNewUser = false;
  try {
    userRecord = await getAuth().getUserByEmail(email);
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (code !== 'auth/user-not-found') throw error;
    userRecord = await getAuth().createUser({
      email,
      displayName: fullName,
      password: randomBytes(32).toString('base64url'),
    });
    isNewUser = true;
  }

  const companySnapshot = await db.doc(`companies/${companyId}`).get();
  const companyName = String(companySnapshot.data()?.name ?? 'Névtelen cég');
  const profileSnapshot = await db.doc(`users/${userRecord.uid}`).get();
  const hasActiveCompany = profileSnapshot.exists && Boolean(profileSnapshot.data()?.companyId);
  if (!hasActiveCompany) await getAuth().setCustomUserClaims(userRecord.uid, { companyId, role });
  const batch = db.batch();
  batch.set(db.doc(`users/${userRecord.uid}`), {
    uid: userRecord.uid,
    email,
    fullName,
    ...(!hasActiveCompany ? { companyId, role, active: true } : {}),
    memberships: { [companyId]: { companyId, companyName, role, active: true } },
    createdAt: new Date(),
    updatedAt: new Date(),
  }, { merge: true });
  batch.set(db.doc(`companies/${companyId}/members/${userRecord.uid}`), {
    uid: userRecord.uid,
    email,
    fullName,
    role,
    active: true,
    updatedAt: new Date(),
  }, { merge: true });
  const inviteRef = db.collection(`companies/${companyId}/invites`).doc();
  batch.set(inviteRef, { email, fullName, role, status: 'sent', userId: userRecord.uid, createdAt: new Date(), invitedBy: request.auth?.uid });
  await batch.commit();

  const passwordLink = isNewUser ? await getAuth().generatePasswordResetLink(email) : '';
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST.value(),
    port: 465,
    secure: true,
    auth: { user: SMTP_USER.value(), pass: SMTP_PASS.value() },
  });
  try {
    await transporter.sendMail({
      from: `"Envision CRM" <${SMTP_USER.value()}>`,
      to: email,
      subject: 'Meghívás az Envision CRM rendszerbe',
      text: isNewUser
        ? `Szia ${fullName}!\n\nMeghívást kaptál az Envision CRM rendszerbe. A jelszavadat ezen a hivatkozáson állíthatod be:\n${passwordLink}\n\nA hivatkozás egyszer használható.`
        : `Szia ${fullName}!\n\nMeghívást kaptál a(z) ${companyName} céghez az Envision CRM rendszerben. A meglévő fiókoddal belépve a fejlécben válthatsz a cégeid között.`,
    });
  } catch (error) {
    await inviteRef.update({ status: 'email_error', errorAt: new Date() });
    console.error('Meghívó e-mail küldési hiba:', error);
    throw new HttpsError('internal', 'A felhasználó létrejött, de a meghívó e-mail nem küldhető el. Próbáld újra.');
  }
  return { success: true };
});

export const updateCompanyMember = onCall(async (request) => {
  const callerUid = request.auth?.uid;
  const { companyId } = await requireCompanyPermission(callerUid, 'manageMembers');
  const uid = typeof request.data?.uid === 'string' ? request.data.uid : '';
  const active = request.data?.active;
  const role = request.data?.role;
  validateRole(role);
  if (!uid || typeof active !== 'boolean') throw new HttpsError('invalid-argument', 'Hiányos felhasználói adatok.');
  if (uid === callerUid && (!active || role !== 'company_admin')) {
    throw new HttpsError('failed-precondition', 'A saját adminisztrátori hozzáférésedet nem kapcsolhatod ki.');
  }

  const memberSnapshot = await db.doc(`companies/${companyId}/members/${uid}`).get();
  if (!memberSnapshot.exists) throw new HttpsError('not-found', 'A munkatárs nem található.');

  const profileSnapshot = await db.doc(`users/${uid}`).get();
  const isActiveCompany = profileSnapshot.data()?.companyId === companyId;
  const companyName = String((await db.doc(`companies/${companyId}`).get()).data()?.name ?? 'Névtelen cég');
  if (isActiveCompany) await getAuth().setCustomUserClaims(uid, { companyId, role });
  const batch = db.batch();
  batch.set(db.doc(`users/${uid}`), {
    ...(isActiveCompany ? { role, active } : {}),
    memberships: { [companyId]: { companyId, companyName, role, active } },
    updatedAt: new Date(),
  }, { merge: true });
  batch.update(db.doc(`companies/${companyId}/members/${uid}`), { role, active, updatedAt: new Date() });
  await batch.commit();
  return { success: true };
});
