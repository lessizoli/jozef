import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

type Currency = 'HUF' | 'EUR';
type Source = 'MNB' | 'ECB';
type FxRate = { source: Source; requestedDate: string; rateDate: string; hufPerEur: number };

const db = getFirestore();

function validDate(value: unknown) {
  const text = typeof value === 'string' ? value : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new HttpsError('invalid-argument', 'Érvénytelen árfolyamdátum.');
  return text;
}

function previousDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

async function fetchMnb(date: string): Promise<FxRate | null> {
  const body = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><GetExchangeRates xmlns="http://www.mnb.hu/webservices/"><startDate>${date}</startDate><endDate>${date}</endDate><currencyNames>EUR</currencyNames></GetExchangeRates></soap:Body></soap:Envelope>`;
  const response = await fetch('http://www.mnb.hu/arfolyamok.asmx', { method: 'POST', headers: { 'content-type': 'text/xml; charset=utf-8', SOAPAction: '/webservices/MNBArfolyamServiceSoap/GetExchangeRates' }, body });
  if (!response.ok) throw new Error(`MNB HTTP ${response.status}`);
  const xml = (await response.text()).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const day = xml.match(/<Day date="([^"]+)"/i)?.[1];
  const value = xml.match(/<Rate[^>]*curr="EUR"[^>]*>([^<]+)<\/Rate>/i)?.[1];
  if (!day || !value) return null;
  const rate = Number(value.replace(',', '.'));
  return Number.isFinite(rate) ? { source: 'MNB', requestedDate: date, rateDate: day, hufPerEur: rate } : null;
}

async function fetchEcb(date: string): Promise<FxRate | null> {
  const url = `https://data-api.ecb.europa.eu/service/data/EXR/D.HUF.EUR.SP00.A?startPeriod=${date}&endPeriod=${date}&format=csvdata&detail=dataonly`;
  const response = await fetch(url, { headers: { accept: 'text/csv' } });
  if (!response.ok) throw new Error(`ECB HTTP ${response.status}`);
  const csv = await response.text();
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return null;
  const parseCsv = (line: string) => Array.from(line.matchAll(/(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g), (match) => (match[1] ?? match[2] ?? '').replace(/""/g, '"'));
  const headers = parseCsv(lines[0]);
  const values = parseCsv(lines[lines.length - 1]);
  const rateDate = values[headers.indexOf('TIME_PERIOD')];
  const rate = Number(values[headers.indexOf('OBS_VALUE')]);
  return rateDate && Number.isFinite(rate) ? { source: 'ECB', requestedDate: date, rateDate, hufPerEur: rate } : null;
}

export async function getOfficialRate(requestedDate: string, source: Source): Promise<FxRate> {
  const cached = await db.doc(`exchangeRates/${source}-${requestedDate}`).get();
  if (cached.exists) return cached.data() as FxRate;
  for (let offset = 0; offset <= 10; offset += 1) {
    const candidate = previousDate(requestedDate, offset);
    const rate = source === 'MNB' ? await fetchMnb(candidate) : await fetchEcb(candidate);
    if (!rate) continue;
    const result = { ...rate, requestedDate };
    await db.doc(`exchangeRates/${source}-${requestedDate}`).set({ ...result, fetchedAt: new Date() });
    return result;
  }
  throw new HttpsError('unavailable', 'Nem található hivatalos árfolyam a megadott dátumhoz.');
}

export const getCurrencyPreview = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Bejelentkezés szükséges.');
  const date = validDate(request.data?.date);
  const baseCurrency: Currency = request.data?.baseCurrency === 'EUR' ? 'EUR' : 'HUF';
  const source: Source = request.data?.source === 'ECB' ? 'ECB' : 'MNB';
  const amount = Number(request.data?.amount);
  if (!Number.isFinite(amount)) throw new HttpsError('invalid-argument', 'Érvénytelen összeg.');
  const rate = await getOfficialRate(date, source);
  const convertedAmount = baseCurrency === 'HUF' ? amount / rate.hufPerEur : amount * rate.hufPerEur;
  return { ...rate, baseCurrency, targetCurrency: baseCurrency === 'HUF' ? 'EUR' : 'HUF', originalAmount: amount, convertedAmount };
});

export const cacheDailyExchangeRates = onSchedule({ schedule: '0 18 * * *', timeZone: 'Europe/Budapest' }, async () => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Budapest', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  await Promise.all([getOfficialRate(today, 'MNB'), getOfficialRate(today, 'ECB')]);
});
