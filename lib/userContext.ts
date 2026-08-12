import { doc, getDoc, getDocFromCache } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';

export type ActiveUserContext = {
  uid: string;
  companyId: string;
  role: string;
  active: boolean;
  fullName: string;
  email: string;
};

let cached: { uid: string; value: ActiveUserContext; expiresAt: number } | null = null;
let pending: Promise<ActiveUserContext> | null = null;

onAuthStateChanged(auth, (user) => {
  if (!user || cached?.uid !== user.uid) cached = null;
  pending = null;
});

function normalize(uid: string, data: Record<string, unknown>): ActiveUserContext {
  if (data.active === false || !data.companyId) throw new Error('Nincs aktív céges hozzáférés.');
  return {
    uid,
    companyId: String(data.companyId),
    role: typeof data.role === 'string' ? data.role : '',
    active: data.active !== false,
    fullName: typeof data.fullName === 'string' ? data.fullName : '',
    email: typeof data.email === 'string' ? data.email : '',
  };
}

export function seedUserContext(uid: string, data: Record<string, unknown>) {
  try { cached = { uid, value: normalize(uid, data), expiresAt: Date.now() + 60_000 }; }
  catch { cached = null; }
}

export async function getActiveUserContext(): Promise<ActiveUserContext> {
  const user = auth.currentUser;
  if (!user) throw new Error('Nincs bejelentkezett felhasználó.');
  if (cached?.uid === user.uid && cached.expiresAt > Date.now()) return cached.value;
  if (pending) return pending;

  pending = (async () => {
    const reference = doc(db, 'users', user.uid);
    let snapshot;
    try { snapshot = await getDocFromCache(reference); }
    catch { snapshot = await getDoc(reference); }
    if (!snapshot.exists()) throw new Error('A felhasználói profil nem található.');
    const value = normalize(user.uid, snapshot.data());
    cached = { uid: user.uid, value, expiresAt: Date.now() + 60_000 };
    return value;
  })().finally(() => { pending = null; });
  return pending;
}
