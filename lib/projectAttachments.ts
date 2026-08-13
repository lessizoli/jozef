import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import {
  deleteObject,
  getBlob,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { auth, db, storage } from './firebase';
import type { ModuleKey } from './projectService';
import { getActiveUserContext } from './userContext';

export type ProjectAttachmentType = 'note' | 'image' | 'document' | 'video' | 'audio';

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
  createdByName?: string;
  createdAt?: unknown;
  moduleKey?: ModuleKey | 'general';
  phaseId?: string | null;
  title?: string;
};

async function getCompanyId() {
  const user = auth.currentUser;
  if (!user) throw new Error('Nincs bejelentkezett felhasználó.');
  const profile = await getActiveUserContext();

  return {
    companyId: profile.companyId,
    userId: user.uid,
    userName: profile.fullName ?? user.displayName ?? profile.email ?? user.email ?? 'Munkatárs',
  };
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

export async function addProjectNote(projectId: string, text: string, moduleKey: ModuleKey | 'general' = 'general', phaseId: string | null = null) {
  const cleanText = text.trim();
  if (!cleanText) throw new Error('A jegyzet nem lehet üres.');

  const { companyId, userId, userName } = await getCompanyId();
  await addDoc(attachmentsCollection(companyId, projectId), {
    type: 'note',
    text: cleanText,
    moduleKey,
    phaseId,
    createdBy: userId,
    createdByName: userName,
    createdAt: serverTimestamp(),
  });
}

export async function uploadProjectImage(projectId: string, file: File, moduleKey: ModuleKey | 'general' = 'general', phaseId: string | null = null) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Csak képfájl tölthető fel.');
  }

  const maxSize = 15 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('A kép legfeljebb 15 MB lehet.');
  }

  const { companyId, userId, userName } = await getCompanyId();
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

  await addDoc(attachmentsCollection(companyId, projectId), {
    type: 'image',
    fileName: file.name,
    storagePath,
    contentType: file.type,
    size: file.size,
    moduleKey,
    phaseId,
    createdBy: userId,
    createdByName: userName,
    createdAt: serverTimestamp(),
  });
}

export async function uploadProjectDocument(
  projectId: string,
  file: File,
  input: { title: string; moduleKey: ModuleKey | 'general'; phaseId: string | null },
) {
  const maxSize = 25 * 1024 * 1024;
  if (file.size > maxSize) throw new Error('A dokumentum legfeljebb 25 MB lehet.');
  const { companyId, userId, userName } = await getCompanyId();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `companies/${companyId}/projects/${projectId}/documents/${crypto.randomUUID()}-${safeName}`;
  await uploadBytes(ref(storage, storagePath), file, {
    contentType: file.type || 'application/octet-stream',
    customMetadata: { companyId, projectId, uploadedBy: userId, moduleKey: input.moduleKey },
  });
  await addDoc(attachmentsCollection(companyId, projectId), {
    type: 'document',
    title: input.title.trim() || file.name,
    fileName: file.name,
    storagePath,
    contentType: file.type || 'application/octet-stream',
    size: file.size,
    moduleKey: input.moduleKey,
    phaseId: input.phaseId,
    createdBy: userId,
    createdByName: userName,
    createdAt: serverTimestamp(),
  });
}

export async function openProtectedAttachment(attachment: ProjectAttachment) {
  if (!attachment.storagePath) {
    if (attachment.downloadURL) window.open(attachment.downloadURL, '_blank', 'noopener,noreferrer');
    return;
  }
  await openProtectedStorageFile(attachment.storagePath);
}

export async function openProtectedStorageFile(storagePath: string) {
  const previewWindow = window.open('', '_blank');
  try {
    const blob = await getBlob(ref(storage, storagePath));
    const url = URL.createObjectURL(blob);
    if (previewWindow) previewWindow.location.href = url;
    else window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    previewWindow?.close();
    throw error;
  }
}

export async function downloadProtectedStorageFile(storagePath: string, fileName: string) {
  const blob = await getBlob(ref(storage, storagePath));
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function downloadProtectedAttachment(attachment: ProjectAttachment) {
  if (!attachment.storagePath) {
    if (attachment.downloadURL) window.open(attachment.downloadURL, '_blank', 'noopener,noreferrer');
    return;
  }
  await downloadProtectedStorageFile(attachment.storagePath, attachment.fileName ?? 'projektanyag');
}

export async function getProtectedAttachmentPreview(attachment: ProjectAttachment) {
  if (!attachment.storagePath) return attachment.downloadURL ?? '';
  const blob = await getBlob(ref(storage, attachment.storagePath));
  return URL.createObjectURL(blob);
}

export async function getProtectedStoragePreview(storagePath: string) {
  const blob = await getBlob(ref(storage, storagePath));
  return URL.createObjectURL(blob);
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
