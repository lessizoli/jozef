import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export async function translateProjectText(text: string, sourceLanguage: 'hu' | 'de') {
  const callable = httpsCallable<{ text: string; sourceLanguage: 'hu' | 'de' }, { translatedText: string; sourceLanguage: 'hu' | 'de'; targetLanguage: 'hu' | 'de' }>(functions, 'translateProjectText');
  return (await callable({ text, sourceLanguage })).data;
}
