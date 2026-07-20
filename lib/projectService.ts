import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// 1. A teljes, kibővített adatmodell
export interface Project {
  id: string;
  companyId: string;
  title: string;
  status: string;
  client: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  surveyData?: {
    areaSize: number;
    damageType: string;
    notes: string;
    surveyedAt?: any;
  };
  quoteData?: {
    materialCost: number;
    laborCost: number;
    totalCost: number;
    generatedAt?: any;
  };
  createdAt: any;
  updatedAt: any;
}

// 2. Valós idejű figyelő
export function subscribeToCompanyProjects(companyId: string, callback: (projects: Project[]) => void) {
  const q = query(
    collection(db, 'projects'),
    where('companyId', '==', companyId)
  );

  return onSnapshot(q, (snapshot) => {
    const projects: Project[] = [];
    snapshot.forEach((doc) => {
      projects.push({ id: doc.id, ...doc.data() } as Project);
    });
    callback(projects);
  }, (error) => {
    console.error("Hiba a projektek valós idejű betöltésekor:", error);
  });
}

// 3. Új érdeklődés mentése
export async function createNewInquiry(companyId: string, title: string, clientName: string, clientAddress: string, clientPhone: string) {
  try {
    const docRef = await addDoc(collection(db, 'projects'), {
      companyId,
      title,
      status: 'Érdeklődés',
      client: {
        name: clientName,
        address: clientAddress,
        phone: clientPhone,
        email: ''
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Hiba az érdeklődés rögzítésekor:", error);
    throw error;
  }
}

// 4. Manuális vagy alapértelmezett fázisváltás
export async function updateProjectStatus(projectId: string, newStatus: string) {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      status: newStatus,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error("Hiba a státusz frissítésekor:", error);
    throw error;
  }
}

// 5. Felmérési adatok mentése
export async function saveSurveyData(projectId: string, areaSize: number, damageType: string, notes: string) {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      status: 'Árajánlat készítés',
      surveyData: {
        areaSize,
        damageType,
        notes,
        surveyedAt: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error("Hiba a felmérési adatok mentésekor:", error);
    throw error;
  }
}

// 6. Árajánlat kalkuláció mentése
export async function saveQuoteData(projectId: string, materialCost: number, laborCost: number) {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const totalCost = materialCost + laborCost;

    await updateDoc(projectRef, {
      status: 'Árajánlat kész',
      quoteData: {
        materialCost,
        laborCost,
        totalCost,
        generatedAt: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error("Hiba az árajánlat mentésekor:", error);
    throw error;
  }
}

import { getFunctions, httpsCallable } from 'firebase/functions';
// ... a meglévő importok és függvények maradnak ...

// Háttérben futó PDF generáló és e-mail küldő Cloud Function meghívása
export async function triggerQuoteEmail(projectId: string) {
  try {
    const functionsInstance = getFunctions(undefined, 'europe-west1'); // Európai régió kényszerítése
    const sendQuoteCallable = httpsCallable<{ projectId: string }, { success: boolean }>(
      functionsInstance, 
      'sendQuoteWithBuffer'
    );
    
    const result = await sendQuoteCallable({ projectId });
    return result.data;
  } catch (error) {
    console.error("Hiba a Cloud Function meghívásakor:", error);
    throw error;
  }
}