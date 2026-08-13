import { GoogleAuth } from 'google-auth-library';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-translation'] });

export const translateProjectText = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Bejelentkezés szükséges.');
  const text = typeof request.data?.text === 'string' ? request.data.text.trim() : '';
  const sourceLanguage = request.data?.sourceLanguage === 'de' ? 'de' : 'hu';
  const targetLanguage = sourceLanguage === 'hu' ? 'de' : 'hu';
  if (!text) return { translatedText: '', sourceLanguage, targetLanguage };
  if (text.length > 20_000) throw new HttpsError('invalid-argument', 'A fordítandó szöveg túl hosszú.');
  const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) throw new HttpsError('failed-precondition', 'A Google Cloud projektazonosító hiányzik.');
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const response = await fetch(`https://translation.googleapis.com/v3/projects/${projectId}/locations/global:translateText`, {
    method: 'POST', headers: { authorization: `Bearer ${token.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [text], mimeType: 'text/plain', sourceLanguageCode: sourceLanguage, targetLanguageCode: targetLanguage }),
  });
  if (!response.ok) throw new HttpsError('unavailable', `A gépi fordítás nem sikerült (${response.status}).`);
  const data = await response.json() as { translations?: Array<{ translatedText?: string }> };
  return { translatedText: data.translations?.[0]?.translatedText ?? '', sourceLanguage, targetLanguage };
});
