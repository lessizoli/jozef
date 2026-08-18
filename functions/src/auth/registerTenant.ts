import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export const registerTenant = onCall(async (request) => {
  const email = String(request.data?.email ?? '').trim().toLowerCase();
  const password = String(request.data?.password ?? '');
  const companyName = String(request.data?.companyName ?? '').trim();
  const fullName = String(request.data?.fullName ?? '').trim();
  
  if (!email || !password || !companyName || !fullName) {
    throw new HttpsError('invalid-argument', 'Minden mező kitöltése kötelező.');
  }
  if (password.length < 8) {
    throw new HttpsError('invalid-argument', 'A jelszó legalább 8 karakter hosszú legyen.');
  }

  try {
    // 1. Felhasználó létrehozása a Firebase Auth-ban
    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName: fullName,
    });

    // 2. Egyedi cégazonosító generálása (Firestore automatikus ID)
    const companyRef = db.collection('companies').doc();
    const companyId = companyRef.id;

    // 3. Cég dokumentum elmentése
    await companyRef.set({
      name: companyName,
      plan: 'basic',
      enabledModules: ['survey', 'construction', 'completion', 'files'],
      createdAt: new Date(),
    });

    // 4. Custom Claims (szerepkör) ráégetése a felhasználó tokenjére
    await getAuth().setCustomUserClaims(userRecord.uid, {
      companyId: companyId,
      role: 'company_admin',
    });

    // 5. Felhasználói profil elmentése a Firestore-ba
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      fullName,
      companyId,
      role: 'company_admin',
      active: true,
      memberships: { [companyId]: { companyId, companyName, role: 'company_admin', active: true } },
      createdAt: new Date(),
    });

    await companyRef.collection('members').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      fullName,
      role: 'company_admin',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await companyRef.collection('settings').doc('permissions').set({
      roles: {
        company_admin: { createProjects: true, editProjects: true, manageSurvey: true, manageQuote: true, manageContract: true, manageConstruction: true, manageCompletion: true, manageCalendar: true, manageDocuments: true, manageFinance: true, manageTeams: true, manageMembers: true, manageCompany: true },
        project_manager: { createProjects: true, editProjects: true, manageSurvey: true, manageQuote: true, manageContract: true, manageConstruction: true, manageCompletion: true, manageCalendar: true, manageDocuments: true, manageFinance: true, manageTeams: true, manageMembers: false, manageCompany: false },
        office: { createProjects: true, editProjects: true, manageSurvey: true, manageQuote: true, manageContract: true, manageConstruction: true, manageCompletion: true, manageCalendar: true, manageDocuments: true, manageFinance: false, manageTeams: false, manageMembers: false, manageCompany: false },
        surveyor: { createProjects: false, editProjects: false, manageSurvey: true, manageQuote: false, manageContract: false, manageConstruction: false, manageCompletion: false, manageCalendar: true, manageDocuments: true, manageFinance: false, manageTeams: false, manageMembers: false, manageCompany: false },
        installer: { createProjects: false, editProjects: false, manageSurvey: false, manageQuote: false, manageContract: false, manageConstruction: true, manageCompletion: true, manageCalendar: true, manageDocuments: true, manageFinance: false, manageTeams: false, manageMembers: false, manageCompany: false },
        finance: { createProjects: false, editProjects: false, manageSurvey: false, manageQuote: false, manageContract: false, manageConstruction: false, manageCompletion: false, manageCalendar: false, manageDocuments: false, manageFinance: true, manageTeams: false, manageMembers: false, manageCompany: false },
      },
      createdAt: new Date(),
    });

    return { success: true, uid: userRecord.uid };
  } catch (error: unknown) {
    console.error("Regisztrációs hiba:", error);
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (code === 'auth/email-already-exists') throw new HttpsError('already-exists', 'Ehhez az e-mail-címhez már tartozik fiók. Lépj be, majd hozz létre új céget a Munkatársak menüben.');
    const message = error instanceof Error ? error.message : 'A regisztráció nem sikerült.';
    throw new HttpsError('internal', message);
  }
});
