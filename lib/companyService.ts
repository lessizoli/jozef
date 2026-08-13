import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from './firebase';
import { getUserContext } from './teamService';
import { seedUserContext } from './userContext';

export type CompanyDetails = {
  name: string;
  taxNumber: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  representative: string;
  bankAccount: string;
  plan?: string;
  defaultLanguage: 'hu' | 'de';
};

export type CompanyMembership = { companyId: string; companyName: string; role: string; active: boolean };

const emptyCompany: CompanyDetails = {
  name: '', taxNumber: '', address: '', email: '', phone: '', website: '', representative: '', bankAccount: '', defaultLanguage: 'hu',
};

function normalize(data: Record<string, unknown>): CompanyDetails {
  const text = (key: keyof CompanyDetails) => typeof data[key] === 'string' ? String(data[key]) : '';
  return {
    name: text('name'),
    taxNumber: text('taxNumber'),
    address: text('address'),
    email: text('email'),
    phone: text('phone'),
    website: text('website'),
    representative: text('representative'),
    bankAccount: text('bankAccount'),
    plan: text('plan'),
    defaultLanguage: data.defaultLanguage === 'de' ? 'de' : 'hu',
  };
}

export function subscribeToCompanyDetails(callback: (details: CompanyDetails) => void) {
  let unsubscribe: (() => void) | undefined;
  let cancelled = false;
  void getUserContext().then(({ companyId }) => {
    if (cancelled) return;
    unsubscribe = onSnapshot(doc(db, 'companies', companyId), (snapshot) => {
      callback(snapshot.exists() ? normalize(snapshot.data()) : emptyCompany);
    });
  });
  return () => { cancelled = true; unsubscribe?.(); };
}

export async function updateCompanyDetails(details: CompanyDetails) {
  const context = await getUserContext();
  if (!context.canManage) throw new Error('Csak céges adminisztrátor módosíthatja a vállalkozás adatait.');
  const name = details.name.trim();
  if (!name) throw new Error('A vállalkozás neve kötelező.');
  await setDoc(doc(db, 'companies', context.companyId), {
    name,
    taxNumber: details.taxNumber.trim(),
    address: details.address.trim(),
    email: details.email.trim(),
    phone: details.phone.trim(),
    website: details.website.trim(),
    representative: details.representative.trim(),
    bankAccount: details.bankAccount.trim(),
    defaultLanguage: details.defaultLanguage,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid ?? '',
  }, { merge: true });
  if (auth.currentUser) {
    await setDoc(doc(db, 'users', auth.currentUser.uid), {
      memberships: { [context.companyId]: { companyId: context.companyId, companyName: name, role: context.role, active: true } },
    }, { merge: true });
  }
}

export function subscribeToCompanyMemberships(callback: (value: { activeCompanyId: string; memberships: CompanyMembership[] }) => void) {
  const user = auth.currentUser;
  if (!user) return () => undefined;
  return onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
    const data = snapshot.data() ?? {};
    seedUserContext(user.uid, data);
    const raw = data.memberships && typeof data.memberships === 'object' ? data.memberships as Record<string, CompanyMembership> : {};
    const memberships = Object.values(raw).filter((item) => item?.active !== false);
    if (memberships.length === 0 && data.companyId) memberships.push({ companyId: String(data.companyId), companyName: 'Jelenlegi cég', role: String(data.role ?? ''), active: data.active !== false });
    callback({ activeCompanyId: String(data.companyId ?? ''), memberships });
  });
}

export async function switchCompany(companyId: string) {
  const callable = httpsCallable<{ companyId: string }, { success: boolean }>(functions, 'switchActiveCompany');
  await callable({ companyId });
  await auth.currentUser?.getIdToken(true);
}

export async function createAdditionalCompany(companyName: string) {
  const callable = httpsCallable<{ companyName: string }, { success: boolean; companyId: string }>(functions, 'createCompanyForCurrentUser');
  const result = await callable({ companyName });
  await auth.currentUser?.getIdToken(true);
  return result.data;
}
