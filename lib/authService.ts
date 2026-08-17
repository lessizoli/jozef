import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  signInWithCustomToken,
  signOut,
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';

// 1. Új cég és admin regisztrációja a Cloud Functionen keresztül
type RegisterCompanyInput = {
  email: string;
  password: string;
  companyName: string;
  fullName: string;
};

type RegisterCompanyResult = {
  success: boolean;
  uid: string;
};

export async function registerNewCompany(data: RegisterCompanyInput) {
  const functionsInstance = getFunctions(undefined, 'europe-west1');
  const registerCallable = httpsCallable<RegisterCompanyInput, RegisterCompanyResult>(
    functionsInstance,
    'registerTenant',
  );
  const result = await registerCallable(data);
  return result.data;
}

// 2. Bejelentkezés
export async function loginWithEmail(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email, password);
  try {
    const functionsInstance = getFunctions(undefined, 'europe-west1');
    const startSession = httpsCallable<Record<string, never>, { customToken: string }>(functionsInstance, 'startExclusiveSession');
    const result = await startSession({});
    const exclusiveCredential = await signInWithCustomToken(auth, result.data.customToken);
    await exclusiveCredential.user.getIdToken(true);
    return exclusiveCredential.user;
  } catch (error) {
    await signOut(auth);
    throw error;
  }
}

export async function validateCurrentSession() {
  if (!auth.currentUser) return false;
  const functionsInstance = getFunctions(undefined, 'europe-west1');
  const validate = httpsCallable<Record<string, never>, { valid: boolean }>(functionsInstance, 'validateExclusiveSession');
  try { return (await validate({})).data.valid; }
  catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    return !['functions/unauthenticated', 'functions/permission-denied'].includes(code);
  }
}

// 3. Kijelentkezés
export async function logoutUser() {
  await signOut(auth);
}

// 4. Felhasználói adatok betöltése Firestore-ból (opcionális segéd)
export async function getUserProfile(uid: string) {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
}
