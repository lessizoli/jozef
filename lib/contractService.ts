import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes } from 'firebase/storage';
import { auth, db, functions, storage } from './firebase';
import type { ContractData, Project } from './projectService';
import { getUserContext } from './teamService';

export type ContractDraft = Pick<ContractData,
  | 'contractNumber'
  | 'issueDate'
  | 'contractorName'
  | 'contractorAddress'
  | 'contractorTaxNumber'
  | 'contractorRepresentative'
  | 'clientTaxNumber'
  | 'clientRepresentative'
  | 'workDescription'
  | 'grossAmount'
  | 'depositAmount'
  | 'paymentTerms'
  | 'startDate'
  | 'completionDate'
  | 'warrantyMonths'
  | 'additionalTerms'
>;

function cleanText(value: string) {
  return value.trim();
}

function normalizeContractDraft(draft: ContractDraft): ContractDraft {
  const normalized = {
    ...draft,
    contractNumber: cleanText(draft.contractNumber),
    contractorName: cleanText(draft.contractorName),
    contractorAddress: cleanText(draft.contractorAddress),
    contractorTaxNumber: cleanText(draft.contractorTaxNumber),
    contractorRepresentative: cleanText(draft.contractorRepresentative),
    clientTaxNumber: cleanText(draft.clientTaxNumber),
    clientRepresentative: cleanText(draft.clientRepresentative),
    workDescription: cleanText(draft.workDescription),
    paymentTerms: cleanText(draft.paymentTerms),
    additionalTerms: cleanText(draft.additionalTerms),
    grossAmount: Number(draft.grossAmount),
    depositAmount: Number(draft.depositAmount),
    warrantyMonths: Number(draft.warrantyMonths),
  };

  if (!normalized.contractNumber || !normalized.issueDate) {
    throw new Error('A szerződésszám és a keltezés kötelező.');
  }
  if (!normalized.contractorName || !normalized.contractorAddress) {
    throw new Error('A vállalkozó neve és címe kötelező.');
  }
  if (!normalized.workDescription) throw new Error('A szerződés tárgyát meg kell adni.');
  if (!Number.isFinite(normalized.grossAmount) || normalized.grossAmount < 0) {
    throw new Error('A vállalkozói díj nem lehet negatív.');
  }
  if (!Number.isFinite(normalized.depositAmount) || normalized.depositAmount < 0) {
    throw new Error('Az előleg nem lehet negatív.');
  }
  if (normalized.depositAmount > normalized.grossAmount) {
    throw new Error('Az előleg nem lehet több a vállalkozói díjnál.');
  }
  if (!normalized.paymentTerms) throw new Error('A fizetési feltétel kötelező.');
  if (!normalized.startDate || !normalized.completionDate) {
    throw new Error('A munkakezdés és a befejezés dátuma kötelező.');
  }
  if (normalized.completionDate < normalized.startDate) {
    throw new Error('A befejezés nem lehet korábbi a munkakezdésnél.');
  }
  if (!Number.isInteger(normalized.warrantyMonths) || normalized.warrantyMonths < 0) {
    throw new Error('A jótállási idő csak nulla vagy pozitív egész hónap lehet.');
  }

  return normalized;
}

async function projectReference(projectId: string) {
  const context = await getUserContext();
  return {
    context,
    reference: doc(db, 'companies', context.companyId, 'projects', projectId),
  };
}

export async function saveProjectContract(projectId: string, draft: ContractDraft) {
  const { reference } = await projectReference(projectId);
  const snapshot = await getDoc(reference);
  if (!snapshot.exists()) throw new Error('A projekt nem található.');
  if (snapshot.data().closed === true) throw new Error('Lezárt projekt szerződése nem módosítható.');
  if (snapshot.data().contractData?.signedAt) throw new Error('Az aláírt szerződés adatai már nem módosíthatók.');

  await updateDoc(reference, {
    contractData: {
      ...(snapshot.data().contractData ?? {}),
      ...normalizeContractDraft(draft),
      updatedAt: serverTimestamp(),
    },
    lastAction: 'Szerződés elmentve',
    updatedAt: serverTimestamp(),
  });
}

type ContractPdfResponse = { filename: string; contentBase64: string };

export async function downloadProjectContract(projectId: string) {
  const callable = httpsCallable<{ projectId: string }, ContractPdfResponse>(functions, 'generateContractPdf');
  const { data } = await callable({ projectId });
  const binary = window.atob(data.contentBase64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = data.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function sendProjectContract(projectId: string) {
  const callable = httpsCallable<{ projectId: string }, { success: boolean }>(functions, 'sendContractWithBuffer');
  return (await callable({ projectId })).data;
}

export async function uploadSignedContract(project: Project, file: File) {
  if (project.contractData?.signedDocument) {
    throw new Error('Ehhez a szerződéshez már tartozik aláírt dokumentum.');
  }
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (!allowedTypes.includes(file.type)) throw new Error('Az aláírt szerződés PDF, JPG vagy PNG lehet.');
  if (file.size > 15 * 1024 * 1024) throw new Error('Az aláírt szerződés legfeljebb 15 MB lehet.');

  const { context, reference } = await projectReference(project.id);
  const snapshot = await getDoc(reference);
  if (!snapshot.exists()) throw new Error('A projekt nem található.');
  if (snapshot.data().closed === true) throw new Error('Lezárt projekthez nem tölthető fel szerződés.');
  if (!snapshot.data().contractData?.contractNumber) {
    throw new Error('Az aláírt példány feltöltése előtt mentsd el a szerződést.');
  }
  if (snapshot.data().contractData?.signedDocument) {
    throw new Error('Ehhez a szerződéshez már tartozik aláírt dokumentum.');
  }

  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Nincs bejelentkezett felhasználó.');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `companies/${context.companyId}/projects/${project.id}/signed-contracts/${crypto.randomUUID()}-${safeName}`;
  const storageReference = ref(storage, storagePath);
  await uploadBytes(storageReference, file, {
    contentType: file.type,
    customMetadata: {
      companyId: context.companyId,
      projectId: project.id,
      uploadedBy: context.uid,
    },
  });
  const constructionEnabled = snapshot.data().modules?.construction?.enabled !== false;
  const updates: Record<string, unknown> = {
    'contractData.signedDocument': {
      fileName: file.name,
      storagePath,
      contentType: file.type,
      size: file.size,
      uploadedAt: serverTimestamp(),
      uploadedBy: context.uid,
    },
    'contractData.signedAt': serverTimestamp(),
    'contractData.signedByUid': context.uid,
    'contractData.signedByName': currentUser.displayName ?? currentUser.email ?? context.uid,
    'modules.contract.status': 'Aláírva',
    'modules.contract.delayed': false,
    'modules.contract.completedAt': serverTimestamp(),
    'modules.contract.statusChangedAt': serverTimestamp(),
    status: 'Folyamatban',
    lastAction: constructionEnabled
      ? 'Szerződés aláírva, Kivitelezés elindítva'
      : 'Szerződés aláírva',
    updatedAt: serverTimestamp(),
  };
  if (constructionEnabled) {
    updates['modules.construction.status'] = 'Folyamatban';
    updates['modules.construction.delayed'] = false;
    updates['modules.construction.completedAt'] = null;
    updates['modules.construction.statusChangedAt'] = serverTimestamp();
  }
  await updateDoc(reference, updates);
}

export async function downloadSignedContract(projectId: string) {
  const callable = httpsCallable<{ projectId: string }, ContractPdfResponse>(functions, 'downloadSignedContract');
  const { data } = await callable({ projectId });
  const binary = window.atob(data.contentBase64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes]));
  const link = window.document.createElement('a');
  link.href = url;
  link.download = data.filename || 'alairt-szerzodes';
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
