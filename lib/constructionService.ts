import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getBlob, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from './firebase';

export type ConstructionPhase = { id: string; title: string; completed: boolean };
export type ConstructionEntry = { id: string; type: 'log' | 'photo'; text?: string; fileName?: string; storagePath?: string; createdByName?: string; createdAt?: unknown };

async function context() {
  const user = auth.currentUser;
  if (!user) throw new Error('Nincs bejelentkezett felhasználó.');
  const profile = await getDoc(doc(db, 'users', user.uid));
  if (!profile.exists() || profile.data().active === false || !profile.data().companyId) throw new Error('Nincs aktív céges hozzáférés.');
  return { companyId: String(profile.data().companyId), uid: user.uid, name: user.displayName || user.email || 'Munkatárs' };
}
function entries(companyId: string, projectId: string) { return collection(db, 'companies', companyId, 'projects', projectId, 'constructionEntries'); }

export function subscribeToConstructionEntries(projectId: string, callback: (items: ConstructionEntry[]) => void) {
  let unsubscribe: (() => void) | undefined; let cancelled = false;
  void context().then(({ companyId }) => { if (!cancelled) unsubscribe = onSnapshot(query(entries(companyId, projectId), orderBy('createdAt', 'desc')), (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<ConstructionEntry, 'id'>) })))); });
  return () => { cancelled = true; unsubscribe?.(); };
}
export async function saveConstructionPhases(projectId: string, phases: ConstructionPhase[]) {
  const { companyId } = await context();
  await updateDoc(doc(db, 'companies', companyId, 'projects', projectId), { 'constructionData.phases': phases, lastAction: 'Kivitelezési munkafázisok frissítve', updatedAt: serverTimestamp() });
}
export async function addConstructionLog(projectId: string, text: string) {
  const clean = text.trim(); if (!clean) throw new Error('A naplóbejegyzés nem lehet üres.');
  const { companyId, uid, name } = await context();
  await addDoc(entries(companyId, projectId), { type: 'log', text: clean, createdBy: uid, createdByName: name, createdAt: serverTimestamp() });
  await updateDoc(doc(db, 'companies', companyId, 'projects', projectId), { lastAction: 'Kivitelezési napló frissítve', updatedAt: serverTimestamp() });
}
export async function uploadConstructionPhoto(projectId: string, file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Csak képfájl tölthető fel.');
  if (file.size > 15 * 1024 * 1024) throw new Error('A kép legfeljebb 15 MB lehet.');
  const { companyId, uid, name } = await context(); const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `companies/${companyId}/projects/${projectId}/construction/${crypto.randomUUID()}-${safeName}`;
  await uploadBytes(ref(storage, storagePath), file, { contentType: file.type, customMetadata: { companyId, projectId, uploadedBy: uid } });
  await addDoc(entries(companyId, projectId), { type: 'photo', fileName: file.name, storagePath, createdBy: uid, createdByName: name, createdAt: serverTimestamp() });
  await updateDoc(doc(db, 'companies', companyId, 'projects', projectId), { lastAction: 'Helyszíni kép feltöltve', updatedAt: serverTimestamp() });
}
export async function openConstructionPhoto(storagePath: string) {
  const blob = await getBlob(ref(storage, storagePath)); const url = URL.createObjectURL(blob); window.open(url, '_blank', 'noopener,noreferrer'); window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
export async function setConstructionRunning(projectId: string) {
  const { companyId } = await context();
  await updateDoc(doc(db, 'companies', companyId, 'projects', projectId), { 'modules.construction.status': 'Folyamatban', 'modules.construction.delayed': false, 'modules.construction.completedAt': null, 'constructionData.startedAt': serverTimestamp(), status: 'Folyamatban', closed: false, lastAction: 'Kivitelezés elindítva', updatedAt: serverTimestamp() });
}
export async function finishConstruction(projectId: string, completionEnabled: boolean) {
  const { companyId } = await context();
  const updates: Record<string, unknown> = { 'modules.construction.status': 'Befejezve', 'modules.construction.delayed': false, 'modules.construction.completedAt': serverTimestamp(), 'constructionData.finishedAt': serverTimestamp(), status: completionEnabled ? 'Folyamatban' : 'Lezárható', lastAction: completionEnabled ? 'Kivitelezés befejezve, átadás elindítva' : 'Kivitelezés befejezve, a projekt lezárható', updatedAt: serverTimestamp() };
  if (completionEnabled) { updates['modules.completion.status'] = 'Átadásra vár'; updates['modules.completion.delayed'] = false; updates['modules.completion.completedAt'] = null; }
  await updateDoc(doc(db, 'companies', companyId, 'projects', projectId), updates);
}
