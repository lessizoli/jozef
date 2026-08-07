import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const db = getFirestore();

export const downloadSignedContract = onCall(async (request) => {
  const callerUid = request.auth?.uid;
  const projectId = request.data?.projectId;
  if (!callerUid) throw new HttpsError('unauthenticated', 'Bejelentkezés szükséges.');
  if (typeof projectId !== 'string' || !projectId) throw new HttpsError('invalid-argument', 'Hiányzó projektazonosító.');

  const userSnap = await db.doc(`users/${callerUid}`).get();
  const user = userSnap.data();
  if (!userSnap.exists || !user?.companyId || user.active === false) {
    throw new HttpsError('permission-denied', 'Nincs jogosultságod ehhez a projekthez.');
  }

  const projectSnap = await db.doc(`companies/${user.companyId}/projects/${projectId}`).get();
  if (!projectSnap.exists) throw new HttpsError('not-found', 'A projekt nem található.');
  const document = projectSnap.data()?.contractData?.signedDocument;
  if (!document?.storagePath || typeof document.storagePath !== 'string') {
    throw new HttpsError('not-found', 'Nincs feltöltött aláírt szerződés.');
  }
  const expectedPrefix = `companies/${user.companyId}/projects/${projectId}/signed-contracts/`;
  if (!document.storagePath.startsWith(expectedPrefix)) {
    throw new HttpsError('permission-denied', 'Érvénytelen dokumentumútvonal.');
  }

  const [content] = await getStorage().bucket().file(document.storagePath).download();
  if (content.byteLength > 15 * 1024 * 1024) {
    throw new HttpsError('resource-exhausted', 'A dokumentum túl nagy a letöltéshez.');
  }
  return {
    filename: typeof document.fileName === 'string' ? document.fileName : 'alairt-szerzodes',
    contentBase64: content.toString('base64'),
  };
});
