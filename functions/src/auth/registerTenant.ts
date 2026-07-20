import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export const registerTenant = onCall(async (request) => {
  const { email, password, companyName, fullName } = request.data;
  
  if (!email || !password || !companyName || !fullName) {
    throw new HttpsError('invalid-argument', 'Minden mező kitöltése kötelező.');
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
      createdAt: new Date(),
    });

    // 4. Custom Claims (szerepkör) ráégetése a felhasználó tokenjére
    await getAuth().setCustomUserClaims(userRecord.uid, {
      companyId: companyId,
      role: 'admin', // Az első regisztráló mindig a cégtulajdonos/admin
    });

    // 5. Felhasználói profil elmentése a Firestore-ba
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      fullName,
      companyId,
      role: 'admin',
      createdAt: new Date(),
    });

    return { success: true, uid: userRecord.uid };
  } catch (error: any) {
    console.error("Regisztrációs hiba:", error);
    throw new HttpsError('internal', error.message);
  }
});