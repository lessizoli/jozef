import { HttpsError } from 'firebase-functions/v2/https';
import { DocumentData, DocumentReference, getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export type Contract = {
  contractNumber: string;
  issueDate: string;
  contractorName: string;
  contractorAddress: string;
  contractorTaxNumber: string;
  contractorRepresentative: string;
  clientTaxNumber: string;
  clientRepresentative: string;
  workDescription: string;
  grossAmount: number;
  depositAmount: number;
  paymentTerms: string;
  startDate: string;
  completionDate: string;
  warrantyMonths: number;
  additionalTerms: string;
};

export type ContractContext = {
  projectRef: DocumentReference<DocumentData>;
  project: DocumentData;
  company: DocumentData;
  contract: Contract;
};

function text(data: Record<string, unknown>, key: string) {
  return typeof data[key] === 'string' ? data[key].trim() : '';
}

function number(data: Record<string, unknown>, key: string) {
  const value = data[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : Number.NaN;
}

function readContract(value: unknown): Contract {
  if (!value || typeof value !== 'object') {
    throw new HttpsError('failed-precondition', 'Ehhez a projekthez még nem készült szerződés.');
  }
  const data = value as Record<string, unknown>;
  const contract: Contract = {
    contractNumber: text(data, 'contractNumber'),
    issueDate: text(data, 'issueDate'),
    contractorName: text(data, 'contractorName'),
    contractorAddress: text(data, 'contractorAddress'),
    contractorTaxNumber: text(data, 'contractorTaxNumber'),
    contractorRepresentative: text(data, 'contractorRepresentative'),
    clientTaxNumber: text(data, 'clientTaxNumber'),
    clientRepresentative: text(data, 'clientRepresentative'),
    workDescription: text(data, 'workDescription'),
    grossAmount: number(data, 'grossAmount'),
    depositAmount: number(data, 'depositAmount'),
    paymentTerms: text(data, 'paymentTerms'),
    startDate: text(data, 'startDate'),
    completionDate: text(data, 'completionDate'),
    warrantyMonths: number(data, 'warrantyMonths'),
    additionalTerms: text(data, 'additionalTerms'),
  };

  if (!contract.contractNumber || !contract.issueDate || !contract.contractorName || !contract.contractorAddress) {
    throw new HttpsError('failed-precondition', 'A szerződés azonosító vagy vállalkozói adatai hiányosak.');
  }
  if (!contract.workDescription || !contract.paymentTerms || !contract.startDate || !contract.completionDate) {
    throw new HttpsError('failed-precondition', 'A szerződés teljesítési adatai hiányosak.');
  }
  if (contract.completionDate < contract.startDate) {
    throw new HttpsError('failed-precondition', 'A szerződés befejezési dátuma hibás.');
  }
  if (contract.grossAmount < 0 || contract.depositAmount < 0 || contract.depositAmount > contract.grossAmount) {
    throw new HttpsError('failed-precondition', 'A szerződés pénzügyi adatai hibásak.');
  }
  if (!Number.isInteger(contract.warrantyMonths) || contract.warrantyMonths < 0) {
    throw new HttpsError('failed-precondition', 'A jótállási idő hibás.');
  }
  return contract;
}

export async function getContractContext(callerUid: string | undefined, projectId: unknown): Promise<ContractContext> {
  if (!callerUid) throw new HttpsError('unauthenticated', 'Bejelentkezés szükséges.');
  if (typeof projectId !== 'string' || !projectId) throw new HttpsError('invalid-argument', 'Hiányzó projektazonosító.');

  const userSnap = await db.doc(`users/${callerUid}`).get();
  const user = userSnap.data();
  if (!userSnap.exists || !user?.companyId || user.active === false) {
    throw new HttpsError('permission-denied', 'Nincs jogosultságod ehhez a projekthez.');
  }

  const projectRef = db.doc(`companies/${user.companyId}/projects/${projectId}`);
  const [projectSnap, companySnap] = await Promise.all([
    projectRef.get(),
    db.doc(`companies/${user.companyId}`).get(),
  ]);
  if (!projectSnap.exists) throw new HttpsError('not-found', 'A projekt nem található.');
  const project = projectSnap.data() ?? {};
  if (project.closed === true) throw new HttpsError('failed-precondition', 'A projekt már le van zárva.');
  if (project.modules?.contract?.enabled === false) {
    throw new HttpsError('permission-denied', 'A Szerződés modul ennél a projektnél nem érhető el.');
  }

  return {
    projectRef,
    project,
    company: companySnap.data() ?? {},
    contract: readContract(project.contractData),
  };
}

export function contractFilename(contractNumber: string) {
  const safeNumber = contractNumber.replace(/[^a-zA-Z0-9_-]+/g, '-');
  return `szerzodes-${safeNumber || 'projekt'}.pdf`;
}
