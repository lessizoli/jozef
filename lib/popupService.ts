import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getUserContext } from './teamService';

export const popupFontSizes = [14, 16, 18, 20, 24, 28, 32] as const;
export type PopupFontSize = (typeof popupFontSizes)[number];

export type PopupSettings = {
  enabled: boolean;
  content: string;
  fontSize: PopupFontSize;
  version: number;
};

export const defaultPopupSettings: PopupSettings = {
  enabled: false,
  content: '',
  fontSize: 18,
  version: 0,
};

function validFontSize(value: unknown): PopupFontSize {
  return popupFontSizes.includes(value as PopupFontSize) ? value as PopupFontSize : 18;
}

export function normalizePopupSettings(value: Partial<PopupSettings> | undefined): PopupSettings {
  return {
    enabled: value?.enabled === true,
    content: typeof value?.content === 'string' ? value.content.slice(0, 5000) : '',
    fontSize: validFontSize(value?.fontSize),
    version: typeof value?.version === 'number' ? value.version : 0,
  };
}

export function subscribeToPopupSettings(
  companyId: string,
  callback: (settings: PopupSettings) => void,
) {
  return onSnapshot(doc(db, 'companies', companyId, 'settings', 'popup'), (snapshot) => {
    callback(normalizePopupSettings(snapshot.exists() ? snapshot.data() : undefined));
  });
}

export async function savePopupSettings(settings: PopupSettings) {
  const context = await getUserContext();
  if (!context.canManage) throw new Error('Csak céges adminisztrátor módosíthatja a popup beállításait.');

  const normalized = normalizePopupSettings(settings);
  await setDoc(doc(db, 'companies', context.companyId, 'settings', 'popup'), {
    ...normalized,
    version: Date.now(),
    updatedAt: serverTimestamp(),
    updatedBy: context.uid,
  }, { merge: true });
}
