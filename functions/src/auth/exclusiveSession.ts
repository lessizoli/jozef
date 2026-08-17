import { randomUUID } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const db = getFirestore();

export async function assertValidSession(uid: string | undefined, token: Record<string, unknown> | undefined) {
  if (!uid) throw new HttpsError('unauthenticated', 'Bejelentkezés szükséges.');
  const profile = (await db.doc(`users/${uid}`).get()).data();
  if (!profile || profile.active === false) throw new HttpsError('permission-denied', 'A felhasználói profil nem aktív.');
  const activeSessionId = typeof profile.activeSessionId === 'string' ? profile.activeSessionId : '';
  if (!activeSessionId || token?.sessionId !== activeSessionId) {
    throw new HttpsError('unauthenticated', 'Ezt a munkamenetet egy másik eszközön történt belépés felváltotta.');
  }
  return profile;
}

export const startExclusiveSession = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sikertelen bejelentkezés.');
  const authTime = Number(request.auth?.token.auth_time ?? 0);
  if (!authTime || Math.floor(Date.now() / 1000) - authTime > 120) {
    throw new HttpsError('unauthenticated', 'A munkamenet indításához friss jelszavas bejelentkezés szükséges.');
  }
  const profileRef = db.doc(`users/${uid}`);
  const profile = (await profileRef.get()).data();
  if (!profile || profile.active === false) throw new HttpsError('permission-denied', 'A felhasználói profil nem aktív.');
  const sessionId = randomUUID();
  const user = await getAuth().getUser(uid);
  const claims = {
    ...(user.customClaims ?? {}),
    companyId: String(profile.companyId ?? ''),
    role: String(profile.role ?? ''),
    sessionId,
  };
  await getAuth().revokeRefreshTokens(uid);
  await getAuth().setCustomUserClaims(uid, claims);
  await profileRef.set({ activeSessionId: sessionId, sessionStartedAt: new Date(), updatedAt: new Date() }, { merge: true });
  const customToken = await getAuth().createCustomToken(uid, claims);
  return { customToken };
});

export const validateExclusiveSession = onCall(async (request) => {
  await assertValidSession(request.auth?.uid, request.auth?.token);
  return { valid: true };
});
