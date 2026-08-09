import { doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { getUserContext } from './teamService';

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
};

const emptyCompany: CompanyDetails = {
  name: '', taxNumber: '', address: '', email: '', phone: '', website: '', representative: '', bankAccount: '',
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
  await updateDoc(doc(db, 'companies', context.companyId), {
    name,
    taxNumber: details.taxNumber.trim(),
    address: details.address.trim(),
    email: details.email.trim(),
    phone: details.phone.trim(),
    website: details.website.trim(),
    representative: details.representative.trim(),
    bankAccount: details.bankAccount.trim(),
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.uid ?? '',
  });
}
