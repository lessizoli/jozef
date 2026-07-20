import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { auth, db, storage } from './firebase';

export type ProjectAttachmentType = 'note' | 'image' | 'video' | 'audio';

export type ProjectAttachment = {
  id: string;
  type: ProjectAttachmentType;
  text?: string;
  fileName?: string;
  downloadURL?: string;
  storagePath?: string;
  contentType?: string;
  size?: number;
  createdBy?: string;
  createdAt?: unknown;
};

type UserProfile = {
  companyId?: string | null;
  active?: boolean;
};

async function getCompanyId() {
  const user = auth.currentUser;
  if (!user) throw new Error('Nincs bejelentkezett felhasználó.');

  const profileSnapshot = await getDoc(doc(db, 'users', user.uid));
  if (!profileSnapshot.exists()) throw new Error('A felhasználói profil nem található.');

  const profile = profileSnapshot.data() as UserProfile;
  if (profile.active === false) throw new Error('A felhasználói fiók inaktív.');
  if (!profile.companyId) throw new Error('A felhasználóhoz nincs cég rendelve.');

  return { companyId: profile.companyId, userId: user.uid };
}

function attachmentsCollection(companyId: string, projectId: string) {
  return collection(db, 'companies', companyId, 'projects', projectId, 'attachments');
}

export function subscribeToProjectAttachments(
  projectId: string,
  callback: (attachments: ProjectAttachment[]) => void,
) {
  let unsubscribe: (() => void) | undefined;
  let cancelled = false;

  void getCompanyId().then(({ companyId }) => {
    if (cancelled) return;

    unsubscribe = onSnapshot(
      query(attachmentsCollection(companyId, projectId), orderBy('createdAt', 'desc')),
      (snapshot) => {
        callback(snapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<ProjectAttachment, 'id'>),
        })));
      },
      (error) => console.error('A projekt mellékletei nem tölthetők be:', error),
    );
  });

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

export async function addProjectNote(projectId: string, text: string) {
  const cleanText = text.trim();
  if (!cleanText) throw new Error('A jegyzet nem lehet üres.');

  const { companyId, userId } = await getCompanyId();
  await addDoc(attachmentsCollection(companyId, projectId), {
    type: 'note',
    text: cleanText,
    createdBy: userId,
    createdAt: serverTimestamp(),
  });
}

export async function uploadProjectImage(projectId: string, file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Csak képfájl tölthető fel.');
  }

  const maxSize = 15 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('A kép legfeljebb 15 MB lehet.');
  }

  const { companyId, userId } = await getCompanyId();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `companies/${companyId}/projects/${projectId}/images/${crypto.randomUUID()}-${safeName}`;
  const storageReference = ref(storage, storagePath);

  await uploadBytes(storageReference, file, {
    contentType: file.type,
    customMetadata: {
      companyId,
      projectId,
      uploadedBy: userId,
    },
  });

  const downloadURL = await getDownloadURL(storageReference);

  await addDoc(attachmentsCollection(companyId, projectId), {
    type: 'image',
    fileName: file.name,
    downloadURL,
    storagePath,
    contentType: file.type,
    size: file.size,
    createdBy: userId,
    createdAt: serverTimestamp(),
  });
}

export async function deleteProjectAttachment(
  projectId: string,
  attachment: ProjectAttachment,
) {
  const { companyId } = await getCompanyId();

  if (attachment.storagePath) {
    await deleteObject(ref(storage, attachment.storagePath)).catch((error) => {
      if ((error as { code?: string }).code !== 'storage/object-not-found') throw error;
    });
  }

  await deleteDoc(doc(
    db,
    'companies',
    companyId,
    'projects',
    projectId,
    'attachments',
    attachment.id,
  ));
}
