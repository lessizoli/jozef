import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import type { QuoteData, QuoteItem } from './projectService';
import { getUserContext } from './teamService';

export type QuoteDraft = Pick<QuoteData, 'quoteNumber' | 'issueDate' | 'validUntil' | 'items' | 'note'>;

export type QuoteTotals = {
  netTotal: number;
  vatTotal: number;
  grossTotal: number;
};

export function calculateQuoteTotals(items: QuoteItem[]): QuoteTotals {
  return items.reduce<QuoteTotals>((totals, item) => {
    const net = Math.round(item.quantity * item.unitPrice);
    const vat = Math.round(net * item.vatRate / 100);
    totals.netTotal += net;
    totals.vatTotal += vat;
    totals.grossTotal += net + vat;
    return totals;
  }, { netTotal: 0, vatTotal: 0, grossTotal: 0 });
}

function normalizeDraft(draft: QuoteDraft): QuoteDraft {
  const items = draft.items.map((item) => ({
    ...item,
    description: item.description.trim(),
    unit: item.unit.trim() || 'db',
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    vatRate: Number(item.vatRate),
  }));

  if (!draft.quoteNumber.trim()) throw new Error('Az ajánlat száma kötelező.');
  if (!draft.issueDate || !draft.validUntil) throw new Error('A kiállítás és az érvényesség dátuma kötelező.');
  if (draft.validUntil < draft.issueDate) throw new Error('Az érvényesség nem lehet korábbi a kiállítás dátumánál.');
  if (items.length === 0 || items.some((item) => !item.description)) throw new Error('Legalább egy kitöltött ajánlati tétel szükséges.');
  if (items.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0)) throw new Error('A mennyiségnek nullánál nagyobbnak kell lennie.');
  if (items.some((item) => !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) throw new Error('Az egységár nem lehet negatív.');
  if (items.some((item) => ![0, 5, 18, 27].includes(item.vatRate))) throw new Error('Érvénytelen ÁFA-kulcs.');

  return {
    quoteNumber: draft.quoteNumber.trim(),
    issueDate: draft.issueDate,
    validUntil: draft.validUntil,
    items,
    note: draft.note.trim(),
  };
}

export async function saveProjectQuote(projectId: string, draft: QuoteDraft) {
  const context = await getUserContext();
  const normalized = normalizeDraft(draft);
  const totals = calculateQuoteTotals(normalized.items);
  await updateDoc(doc(db, 'companies', context.companyId, 'projects', projectId), {
    quoteData: {
      ...normalized,
      ...totals,
      updatedAt: serverTimestamp(),
    },
    lastAction: 'Ajánlat elmentve',
    updatedAt: serverTimestamp(),
  });
}

type QuotePdfResponse = { filename: string; contentBase64: string };

function quotePdfBlob(contentBase64: string) {
  const binary = window.atob(contentBase64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: 'application/pdf' });
}

export async function openProjectQuote(projectId: string) {
  const previewWindow = window.open('', '_blank');
  try {
    const callable = httpsCallable<{ projectId: string }, QuotePdfResponse>(functions, 'generateQuotePdf');
    const { data } = await callable({ projectId });
    const url = URL.createObjectURL(quotePdfBlob(data.contentBase64));
    if (previewWindow) previewWindow.location.href = url;
    else window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    previewWindow?.close();
    throw error;
  }
}

export async function downloadProjectQuote(projectId: string) {
  const callable = httpsCallable<{ projectId: string }, QuotePdfResponse>(functions, 'generateQuotePdf');
  const { data } = await callable({ projectId });
  const url = URL.createObjectURL(quotePdfBlob(data.contentBase64));
  const link = document.createElement('a');
  link.href = url;
  link.download = data.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function sendProjectQuote(projectId: string) {
  const callable = httpsCallable<{ projectId: string }, { success: boolean }>(functions, 'sendQuoteWithBuffer');
  return (await callable({ projectId })).data;
}
