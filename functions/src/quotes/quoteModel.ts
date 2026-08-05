import { HttpsError } from 'firebase-functions/v2/https';
import { DocumentData, DocumentReference, getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export type QuoteLine = {
  category: 'material' | 'labor' | 'other';
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
};

export type Quote = {
  quoteNumber: string;
  issueDate: string;
  validUntil: string;
  items: QuoteLine[];
  note: string;
  netTotal: number;
  vatTotal: number;
  grossTotal: number;
};

export type QuoteContext = {
  projectRef: DocumentReference<DocumentData>;
  project: DocumentData;
  company: DocumentData;
  quote: Quote;
};

function finiteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number.NaN;
}

function readQuote(value: unknown): Quote {
  if (!value || typeof value !== 'object') {
    throw new HttpsError('failed-precondition', 'Ehhez a projekthez még nem készült ajánlat.');
  }
  const data = value as Record<string, unknown>;
  const items = Array.isArray(data.items) ? data.items.map((rawItem) => {
    const item = rawItem && typeof rawItem === 'object' ? rawItem as Record<string, unknown> : {};
    const category = ['material', 'labor', 'other'].includes(String(item.category))
      ? item.category as QuoteLine['category']
      : 'other';
    return {
      category,
      description: typeof item.description === 'string' ? item.description.trim() : '',
      quantity: finiteNumber(item.quantity),
      unit: typeof item.unit === 'string' ? item.unit.trim() : '',
      unitPrice: finiteNumber(item.unitPrice),
      vatRate: finiteNumber(item.vatRate),
    };
  }) : [];

  if (!data.quoteNumber || !data.issueDate || !data.validUntil || items.length === 0) {
    throw new HttpsError('failed-precondition', 'Az ajánlat adatai hiányosak.');
  }
  if (items.some((item) => !item.description || item.quantity <= 0 || item.unitPrice < 0 || ![0, 5, 18, 27].includes(item.vatRate))) {
    throw new HttpsError('failed-precondition', 'Az ajánlat egyik tétele hibás.');
  }

  const totals = items.reduce((sum, item) => {
    const net = Math.round(item.quantity * item.unitPrice);
    const vat = Math.round(net * item.vatRate / 100);
    return { net: sum.net + net, vat: sum.vat + vat };
  }, { net: 0, vat: 0 });

  return {
    quoteNumber: String(data.quoteNumber),
    issueDate: String(data.issueDate),
    validUntil: String(data.validUntil),
    items,
    note: typeof data.note === 'string' ? data.note : '',
    netTotal: totals.net,
    vatTotal: totals.vat,
    grossTotal: totals.net + totals.vat,
  };
}

export async function getQuoteContext(callerUid: string | undefined, projectId: unknown): Promise<QuoteContext> {
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
  const company = companySnap.data() ?? {};

  return { projectRef, project, company, quote: readQuote(project.quoteData) };
}

export function quoteFilename(quoteNumber: string) {
  const safeNumber = quoteNumber.replace(/[^a-zA-Z0-9_-]+/g, '-');
  return `arajanlat-${safeNumber || 'projekt'}.pdf`;
}
