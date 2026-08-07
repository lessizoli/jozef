import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export type CompletionChecklistItem = { id: string; label: string; completed: boolean };
export type CompletionData = {
  checklist: CompletionChecklistItem[];
  handoverDate: string;
  responsibleName: string;
  handoverNotes: string;
  customerConfirmed: boolean;
  defectNotes: string;
  updatedAt?: unknown;
  completedAt?: unknown;
  completedBy?: string;
};

async function context() {
  const user = auth.currentUser;
  if (!user) throw new Error('Nincs bejelentkezett felhasználó.');
  const profile = await getDoc(doc(db, 'users', user.uid));
  if (!profile.exists() || profile.data().active === false || !profile.data().companyId) throw new Error('Nincs aktív céges hozzáférés.');
  return { companyId: String(profile.data().companyId), uid: user.uid, name: user.displayName || user.email || 'Munkatárs' };
}

export async function saveProjectCompletion(projectId: string, data: CompletionData) {
  const { companyId } = await context();
  await updateDoc(doc(db, 'companies', companyId, 'projects', projectId), {
    completionData: { ...data, updatedAt: serverTimestamp() },
    lastAction: 'Átadási adatok frissítve',
    updatedAt: serverTimestamp(),
  });
}

export async function completeProjectHandover(projectId: string, data: CompletionData, financeEnabled: boolean) {
  if (!data.handoverDate) throw new Error('Az átadás dátuma kötelező.');
  if (!data.responsibleName.trim()) throw new Error('Az átadás felelőse kötelező.');
  if (data.checklist.some((item) => !item.completed)) throw new Error('Az átadás előtt minden ellenőrzőpontot teljesíteni kell.');
  if (!data.customerConfirmed) throw new Error('Az ügyfél-visszaigazolást jelölni kell.');
  const { companyId, uid, name } = await context();
  const updates: Record<string, unknown> = {
    completionData: { ...data, completedAt: serverTimestamp(), completedBy: uid, completedByName: name, updatedAt: serverTimestamp() },
    'modules.completion.status': 'Befejezve',
    'modules.completion.delayed': false,
    'modules.completion.completedAt': serverTimestamp(),
    status: financeEnabled ? 'Folyamatban' : 'Lezárható',
    lastAction: financeEnabled ? 'Átadás befejezve, Pénzügy elindítva' : 'Átadás befejezve, a projekt lezárható',
    updatedAt: serverTimestamp(),
  };
  if (financeEnabled) {
    updates['modules.finance.status'] = 'Számlázva';
    updates['modules.finance.delayed'] = false;
    updates['modules.finance.completedAt'] = null;
  }
  await updateDoc(doc(db, 'companies', companyId, 'projects', projectId), updates);
}
