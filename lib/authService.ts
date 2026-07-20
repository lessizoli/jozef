import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';

// 1. Új cég és admin regisztrációja a Cloud Functionen keresztül
export async function registerNewCompany(data: any) {
  const functionsInstance = getFunctions(undefined, 'europe-west1');
  const registerCallable = httpsCallable(functionsInstance, 'registerTenant');
  const result = await registerCallable(data);
  return result.data;
}

// 2. Bejelentkezés
export async function loginWithEmail(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  // Kényszerítjük a tokent, hogy azonnal frissüljön a Custom Claims-szel
  await userCredential.user.getIdToken(true);
  return userCredential.user;
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