import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export type Currency = 'HUF' | 'EUR';
export type ExchangeRateSnapshot = {
  source: 'MNB' | 'ECB'; requestedDate: string; rateDate: string; hufPerEur: number;
  baseCurrency: Currency; targetCurrency: Currency; originalAmount: number; convertedAmount: number;
};

export async function getCurrencyPreview(date: string, baseCurrency: Currency, amount: number, source: 'MNB' | 'ECB') {
  const callable = httpsCallable<{ date: string; baseCurrency: Currency; amount: number; source: 'MNB' | 'ECB' }, ExchangeRateSnapshot>(functions, 'getCurrencyPreview');
  return (await callable({ date, baseCurrency, amount, source })).data;
}

export function formatCurrency(value: number, currency: Currency, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: currency === 'HUF' ? 0 : 2 }).format(value || 0);
}
