import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getBlob, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from './firebase';
import type { FinanceData, Project } from './projectService';
import { getActiveUserContext } from './userContext';

export type FinanceDraft = Pick<FinanceData, 'invoiceNumber' | 'grossAmount' | 'invoiceDate' | 'dueDate' | 'paidAt' | 'note'>;

async function context(projectId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Nincs bejelentkezett felhasználó.');
  const profile = await getActiveUserContext();
  const companyId = profile.companyId;
  return {
    user,
    companyId,
    reference: doc(db, 'companies', companyId, 'projects', projectId),
  };
}

function normalizedDraft(draft: FinanceDraft): FinanceDraft {
  const result = {
    invoiceNumber: draft.invoiceNumber.trim(),
    grossAmount: Number(draft.grossAmount),
    invoiceDate: draft.invoiceDate,
    dueDate: draft.dueDate,
    paidAt: draft.paidAt,
    note: draft.note.trim(),
  };
  if (!result.invoiceNumber) throw new Error('A számlaszám megadása kötelező.');
  if (!Number.isFinite(result.grossAmount) || result.grossAmount < 0) throw new Error('A számlázott összeg nem lehet negatív.');
  if (!result.invoiceDate || !result.dueDate) throw new Error('A kiállítás és a fizetési határidő kötelező.');
  if (result.dueDate < result.invoiceDate) throw new Error('A fizetési határidő nem lehet korábbi a kiállításnál.');
  if (result.paidAt && result.paidAt < result.invoiceDate) throw new Error('A fizetés dátuma nem lehet korábbi a kiállításnál.');
  return result;
}

function todayIso() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export async function saveProjectFinance(projectId: string, draft: FinanceDraft) {
  const { reference } = await context(projectId);
  const snapshot = await getDoc(reference);
  if (!snapshot.exists()) throw new Error('A projekt nem található.');
  if (snapshot.data().closed === true) throw new Error('Lezárt projekt pénzügyi adatai nem módosíthatók.');
  if (snapshot.data().modules?.finance?.enabled === false) throw new Error('A Pénzügy modul ennél a projektnél nem elérhető.');
  const finance = normalizedDraft(draft);
  const paid = Boolean(finance.paidAt);
  const overdue = !paid && finance.dueDate < todayIso();
  await updateDoc(reference, {
    financeData: {
      ...(snapshot.data().financeData ?? {}),
      ...finance,
      updatedAt: serverTimestamp(),
    },
    'modules.finance.status': paid ? 'Fizetve' : overdue ? 'Késedelem' : 'Számlázva',
    'modules.finance.delayed': overdue,
    'modules.finance.completedAt': paid ? serverTimestamp() : null,
    status: paid ? 'Lezárható' : overdue ? 'Csúszás' : 'Folyamatban',
    lastAction: paid ? 'Számla fizetve, a projekt lezárható' : overdue ? 'A számla fizetési határideje lejárt' : 'Pénzügyi adatok mentve',
    updatedAt: serverTimestamp(),
  });
}

export async function markProjectInvoicePaid(projectId: string, paidAt: string) {
  if (!paidAt) throw new Error('Add meg a fizetés dátumát.');
  const { reference } = await context(projectId);
  const snapshot = await getDoc(reference);
  if (!snapshot.exists()) throw new Error('A projekt nem található.');
  if (snapshot.data().closed === true) throw new Error('Lezárt projekt pénzügyi adatai nem módosíthatók.');
  if (snapshot.data().modules?.finance?.enabled === false) throw new Error('A Pénzügy modul ennél a projektnél nem elérhető.');
  if (!snapshot.data().financeData?.invoiceNumber) throw new Error('Előbb mentsd el a számla adatait.');
  if (snapshot.data().financeData?.invoiceDate && paidAt < snapshot.data().financeData.invoiceDate) {
    throw new Error('A fizetés dátuma nem lehet korábbi a számla kiállításánál.');
  }
  await updateDoc(reference, {
    'financeData.paidAt': paidAt,
    'financeData.updatedAt': serverTimestamp(),
    'modules.finance.status': 'Fizetve',
    'modules.finance.delayed': false,
    'modules.finance.completedAt': serverTimestamp(),
    status: 'Lezárható',
    lastAction: 'Számla fizetve, a projekt lezárható',
    updatedAt: serverTimestamp(),
  });
}

export async function reconcileFinanceStatus(project: Project) {
  if (project.closed || !project.modules.finance.enabled || !project.financeData?.dueDate || project.financeData.paidAt || project.modules.finance.status === 'Fizetve') return;
  const overdue = project.financeData.dueDate < todayIso();
  if (overdue === (project.modules.finance.status === 'Késedelem')) return;
  const { reference } = await context(project.id);
  await updateDoc(reference, {
    'modules.finance.status': overdue ? 'Késedelem' : 'Számlázva',
    'modules.finance.delayed': overdue,
    status: overdue ? 'Csúszás' : 'Folyamatban',
    lastAction: overdue ? 'A számla fizetési határideje lejárt' : 'A számla ismét határidőn belül van',
    updatedAt: serverTimestamp(),
  });
}

export async function uploadProjectInvoice(project: Project, file: File) {
  if (project.financeData?.invoiceDocument) throw new Error('Ehhez a projekthez már tartozik feltöltött számla.');
  const inferredType = file.type || (file.name.toLowerCase().endsWith('.xml') ? 'application/xml' : '');
  const allowedTypes = ['application/pdf', 'application/xml', 'text/xml', 'image/jpeg', 'image/png'];
  if (!allowedTypes.includes(inferredType)) throw new Error('A számla PDF, XML, JPG vagy PNG lehet.');
  if (file.size > 15 * 1024 * 1024) throw new Error('A számla legfeljebb 15 MB lehet.');
  const { user, companyId, reference } = await context(project.id);
  const snapshot = await getDoc(reference);
  if (!snapshot.exists()) throw new Error('A projekt nem található.');
  if (snapshot.data().closed === true) throw new Error('Lezárt projekthez nem tölthető fel számla.');
  if (snapshot.data().modules?.finance?.enabled === false) throw new Error('A Pénzügy modul ennél a projektnél nem elérhető.');
  if (!snapshot.data().financeData?.invoiceNumber) throw new Error('A fájl feltöltése előtt mentsd el a számla adatait.');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `companies/${companyId}/projects/${project.id}/finance/${crypto.randomUUID()}-${safeName}`;
  await uploadBytes(ref(storage, storagePath), file, {
    contentType: inferredType,
    customMetadata: { companyId, projectId: project.id, uploadedBy: user.uid },
  });
  await updateDoc(reference, {
    'financeData.invoiceDocument': {
      fileName: file.name,
      storagePath,
      contentType: inferredType,
      size: file.size,
      uploadedAt: serverTimestamp(),
      uploadedBy: user.uid,
    },
    lastAction: 'Számla dokumentum feltöltve',
    updatedAt: serverTimestamp(),
  });
}

export async function downloadProjectInvoice(storagePath: string, fileName: string) {
  const blob = await getBlob(ref(storage, storagePath));
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || 'szamla';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
