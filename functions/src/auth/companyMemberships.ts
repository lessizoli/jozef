import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { assertValidSession } from './exclusiveSession';

const db = getFirestore();
const defaultRoles = {
  company_admin: { createProjects: true, editProjects: true, manageSurvey: true, manageQuote: true, manageContract: true, manageConstruction: true, manageCompletion: true, manageCalendar: true, manageDocuments: true, manageFinance: true, manageTeams: true, manageMembers: true, manageCompany: true },
  project_manager: { createProjects: true, editProjects: true, manageSurvey: true, manageQuote: true, manageContract: true, manageConstruction: true, manageCompletion: true, manageCalendar: true, manageDocuments: true, manageFinance: true, manageTeams: true, manageMembers: false, manageCompany: false },
  office: { createProjects: true, editProjects: true, manageSurvey: true, manageQuote: true, manageContract: true, manageConstruction: true, manageCompletion: true, manageCalendar: true, manageDocuments: true, manageFinance: false, manageTeams: false, manageMembers: false, manageCompany: false },
  surveyor: { createProjects: false, editProjects: false, manageSurvey: true, manageQuote: false, manageContract: false, manageConstruction: false, manageCompletion: false, manageCalendar: true, manageDocuments: true, manageFinance: false, manageTeams: false, manageMembers: false, manageCompany: false },
  installer: { createProjects: false, editProjects: false, manageSurvey: false, manageQuote: false, manageContract: false, manageConstruction: true, manageCompletion: true, manageCalendar: true, manageDocuments: true, manageFinance: false, manageTeams: false, manageMembers: false, manageCompany: false },
  finance: { createProjects: false, editProjects: false, manageSurvey: false, manageQuote: false, manageContract: false, manageConstruction: false, manageCompletion: false, manageCalendar: false, manageDocuments: false, manageFinance: true, manageTeams: false, manageMembers: false, manageCompany: false },
};

export const createCompanyForCurrentUser = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Bejelentkezés szükséges.');
  await assertValidSession(uid, request.auth?.token);
  const companyName = typeof request.data?.companyName === 'string' ? request.data.companyName.trim() : '';
  if (!companyName) throw new HttpsError('invalid-argument', 'A vállalkozás neve kötelező.');
  const user = await getAuth().getUser(uid);
  const profileRef = db.doc(`users/${uid}`);
  const profile = (await profileRef.get()).data() ?? {};
  const fullName = String(profile.fullName ?? user.displayName ?? user.email ?? 'Adminisztrátor');
  const companyRef = db.collection('companies').doc();
  const now = new Date();
  const batch = db.batch();
  batch.set(companyRef, { name: companyName, plan: 'basic', enabledModules: ['survey', 'construction', 'completion', 'files'], createdAt: now, createdBy: uid });
  batch.set(companyRef.collection('members').doc(uid), { uid, email: user.email ?? '', fullName, role: 'company_admin', active: true, createdAt: now, updatedAt: now });
  batch.set(companyRef.collection('settings').doc('permissions'), { roles: defaultRoles, createdAt: now });
  const memberships = { ...(profile.memberships ?? {}) } as Record<string, unknown>;
  if (profile.companyId && !memberships[String(profile.companyId)]) {
    const oldCompany = await db.doc(`companies/${profile.companyId}`).get();
    memberships[String(profile.companyId)] = { companyId: String(profile.companyId), companyName: String(oldCompany.data()?.name ?? 'Korábbi cég'), role: String(profile.role ?? 'installer'), active: profile.active !== false };
  }
  memberships[companyRef.id] = { companyId: companyRef.id, companyName, role: 'company_admin', active: true };
  batch.set(profileRef, {
    companyId: companyRef.id, role: 'company_admin', active: true, updatedAt: now,
    memberships,
  }, { merge: true });
  await batch.commit();
  const existingClaims = (await getAuth().getUser(uid)).customClaims ?? {};
  await getAuth().setCustomUserClaims(uid, { ...existingClaims, companyId: companyRef.id, role: 'company_admin' });
  return { success: true, companyId: companyRef.id };
});

export const switchActiveCompany = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Bejelentkezés szükséges.');
  await assertValidSession(uid, request.auth?.token);
  const companyId = typeof request.data?.companyId === 'string' ? request.data.companyId : '';
  if (!companyId) throw new HttpsError('invalid-argument', 'Hiányzó cégazonosító.');
  const [memberSnapshot, companySnapshot] = await Promise.all([
    db.doc(`companies/${companyId}/members/${uid}`).get(),
    db.doc(`companies/${companyId}`).get(),
  ]);
  const member = memberSnapshot.data();
  if (!memberSnapshot.exists || member?.active === false) throw new HttpsError('permission-denied', 'Ehhez a céghez nincs aktív hozzáférésed.');
  const role = String(member?.role ?? 'installer');
  const companyName = String(companySnapshot.data()?.name ?? 'Névtelen cég');
  await db.doc(`users/${uid}`).set({
    companyId, role, active: true, updatedAt: new Date(),
    memberships: { [companyId]: { companyId, companyName, role, active: true } },
  }, { merge: true });
  const existingClaims = (await getAuth().getUser(uid)).customClaims ?? {};
  await getAuth().setCustomUserClaims(uid, { ...existingClaims, companyId, role });
  return { success: true };
});
