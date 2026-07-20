'use client';

import React, { useState, useEffect } from 'react';
import { subscribeToCompanyProjects, createNewInquiry, updateProjectStatus, saveSurveyData, saveQuoteData, triggerQuoteEmail,Project } from '../lib/projectService';export default function Dashboard() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isInquiryFormOpen, setIsInquiryFormOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // Új form állapotok
  const [newTitle, setNewTitle] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const currentCompanyId = 'comp_abc123XYZ';

  useEffect(() => {
    const unsubscribe = subscribeToCompanyProjects(currentCompanyId, (fetchedProjects) => {
      setProjects(fetchedProjects);
      // Ha a megnyitott projekt változik a felhőben, frissítjük a panelen is
      if (selectedProject) {
        const updated = fetchedProjects.find(p => p.id === selectedProject.id);
        if (updated) setSelectedProject(updated);
      }
    });
    return () => unsubscribe();
  }, [currentCompanyId, selectedProject]);

  const getCountByStatus = (status: string) => projects.filter(p => p.status === status).length;

  // Új Érdeklődés beküldése
  const handleCreateInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newClientName) return;
    
    await createNewInquiry(currentCompanyId, newTitle, newClientName, newAddress, newPhone);
    
    // Form ürítése és zárása
    setNewTitle(''); setNewClientName(''); setNewAddress(''); setNewPhone('');
    setIsInquiryFormOpen(false);
  };

  // Fázis léptetése a State Machine szerint
  const handleStepStatus = async () => {
    if (!selectedProject) return;
    
    let nextStatus = 'Érdeklődés';
    if (selectedProject.status === 'Érdeklődés') nextStatus = 'Felmérés';
    else if (selectedProject.status === 'Felmérés') nextStatus = 'Árajánlat készítés';
    else if (selectedProject.status === 'Árajánlat készítés') nextStatus = 'Árajánlat elküldve';

    await updateProjectStatus(selectedProject.id, nextStatus);
  };

  const openProjectDetails = (project: Project) => {
    setSelectedProject(project);
    setIsPanelOpen(true);
  };

  const stats = [
    { title: 'Aktív projektek', value: projects.length.toString(), color: 'border-sky-500' },
    { title: 'Mai felmérések', value: getCountByStatus('Felmérés').toString(), color: 'border-emerald-500' },
    { title: 'Ajánlatok értéke', value: '4.2 M Ft', color: 'border-amber-500' },
    { title: 'Készlethiány riasztás', value: '0', color: 'border-rose-500' },
  ];

  const pipelines = [
    { name: 'Érdeklődés', count: getCountByStatus('Érdeklődés'), bg: 'bg-sky-500/10', text: 'text-sky-400' },
    { name: 'Felmérés', count: getCountByStatus('Felmérés'), bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    { name: 'Árajánlat készítés', count: getCountByStatus('Árajánlat készítés'), bg: 'bg-amber-500/10', text: 'text-amber-400' },
  ];

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-8 relative overflow-x-hidden min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Envision PMS</h1>
          <p className="text-sm text-slate-400">Éles adatbázis kapcsolat: <span className="text-emerald-400 font-semibold">Kész</span></p>
        </div>
        <button 
          onClick={() => setIsInquiryFormOpen(true)}
          className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Új Érdeklődés +
        </button>
      </div>

      {/* KPI rács */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={`bg-slate-800 p-4 rounded-xl border-l-4 ${stat.color} shadow-sm`}>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.title}</p>
            <p className="text-2xl font-semibold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Pipeline / Kanban listák */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium">Aktív Folyamatok (Firestore)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.length === 0 ? (
            <div className="col-span-2 text-center p-8 bg-slate-800/40 rounded-xl text-slate-500 text-sm border border-dashed border-slate-700">
              Nincs aktív projekt a felhőben. Kattints az Új Érdeklődés gombra!
            </div>
          ) : (
            projects.map((project) => (
              <div 
                key={project.id} 
                onClick={() => openProjectDetails(project)}
                className="bg-slate-800 border border-slate-700/60 p-4 rounded-xl hover:border-sky-500/50 cursor-pointer transition-all shadow-sm group"
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-slate-200 group-hover:text-sky-400 transition-colors">{project.title}</h3>
                  <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-medium">{project.status}</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">Ügyfél: {project.client?.name}</p>
                <p className="text-xs text-slate-500 mt-1">{project.client?.address}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Naptár Mátrix Helye */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm overflow-x-auto">
        <h2 className="text-lg font-medium border-b border-slate-700 pb-2 mb-2">Erőforrás-alapú Naptár Mátrix</h2>
        <div className="text-xs text-slate-500">[ Valós naptár-események betöltése... ]</div>
      </div>

      {/* ── 1. PANEL: PROJEKT ADATLAP ÉS FÁZIS LÉPTETÉS ── */}
      {isPanelOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setIsPanelOpen(false)} />}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[450px] bg-slate-800 border-l border-slate-700 z-50 shadow-2xl transform transition-transform duration-300 p-6 space-y-6 flex flex-col ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-start border-b border-slate-700 pb-4">
          <div>
            <span className="text-xs bg-sky-500/10 text-sky-400 px-2.5 py-1 rounded-full font-medium">{selectedProject?.status}</span>
            <h2 className="text-xl font-bold mt-2 text-slate-100">{selectedProject?.title}</h2>
          </div>
          <button onClick={() => setIsPanelOpen(false)} className="text-slate-400 hover:text-white bg-slate-700/50 p-2 rounded-lg">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 text-sm">
          {/* Ügyfél adatai kártya (már megvan) */}
          <div className="bg-slate-900/50 p-4 rounded-xl space-y-2 border border-slate-700/30">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ügyfél adatai</h4>
            <p className="text-slate-200 font-medium">{selectedProject?.client?.name}</p>
            <p className="text-xs text-slate-400">{selectedProject?.client?.address}</p>
            <p className="text-xs text-slate-400">Tel: {selectedProject?.client?.phone}</p>
          </div>

          {/* 💰 DINAMIKUS ÁRAJÁNLAT GENERÁTOR: Csak 'Árajánlat készítés' státusznál látszik */}
          {selectedProject?.status === 'Árajánlat készítés' && (
            <div className="bg-slate-900/80 p-4 rounded-xl space-y-4 border border-amber-500/30">
              <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                💰 Árajánlat Kalkulátor ({selectedProject?.surveyData?.areaSize || 0} m² alapján)
              </h4>
              
              {/* Automatikusan kalkulált segédértékek, amit a felhasználó átírhat */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Anyagköltség összesen (Ft)</label>
                <input 
                  type="number" 
                  id="materialCostInput"
                  defaultValue={(selectedProject?.surveyData?.areaSize || 0) * 15000}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Munkadíj összesen (Ft)</label>
                <input 
                  type="number" 
                  id="laborCostInput"
                  defaultValue={(selectedProject?.surveyData?.areaSize || 0) * 12000}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button 
                onClick={async () => {
                  const matCost = Number((document.getElementById('materialCostInput') as HTMLInputElement)?.value || 0);
                  const labCost = Number((document.getElementById('laborCostInput') as HTMLInputElement)?.value || 0);
                  
                  if(selectedProject) {
                    await saveQuoteData(selectedProject.id, matCost, labCost);
                    setIsPanelOpen(false);
                  }
                }}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white py-2 rounded-lg font-medium text-xs transition-colors"
              >
                ✓ Árajánlat Véglegesítése
              </button>
            </div>
          )}

          {/* Ha már el van mentve az árajánlat, mutassuk meg az összegeket és a küldés gombot */}
          {selectedProject?.quoteData && (
            <div className="space-y-3">
              <div className="bg-slate-900/50 p-4 rounded-xl space-y-2 border border-amber-500/20 text-xs">
                <h4 className="font-semibold text-amber-400 uppercase">Kalkulált Költségek</h4>
                <div className="flex justify-between text-slate-300">
                  <span>Anyagköltség:</span>
                  <span className="font-medium text-slate-100">{selectedProject.quoteData.materialCost.toLocaleString()} Ft</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Munkadíj:</span>
                  <span className="font-medium text-slate-100">{selectedProject.quoteData.laborCost.toLocaleString()} Ft</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-slate-700 pt-1 text-slate-200">
                  <span>Végösszeg:</span>
                  <span className="text-amber-400">{selectedProject.quoteData.totalCost.toLocaleString()} Ft</span>
                </div>
              </div>

              {/* PDF KÜLDÉS GOMB – Csak akkor aktív, ha a státusz még nem 'Árajánlat elküldve' */}
              {selectedProject.status !== 'Árajánlat elküldve' ? (
                <button
                  disabled={isSendingEmail}
                  onClick={async () => {
                    setIsSendingEmail(true);
                    try {
                      await triggerQuoteEmail(selectedProject.id);
                      alert('Árajánlat sikeresen legenerálva és elküldve az ügyfélnek! ✉');
                      setIsPanelOpen(false);
                    } catch (err) {
                      alert('Hiba történt a küldés során. Ellenőrizd a szerver naplóit!');
                    } finally {
                      setIsSendingEmail(false);
                    }
                  }}
                  className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 text-white py-2.5 rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-2 shadow-md"
                >
                  {isSendingEmail ? (
                    <>
                      <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
                      PDF generálása és küldése...
                    </>
                  ) : (
                    '✉ Árajánlat PDF Küldése Ügyfélnek'
                  )}
                </button>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-3 rounded-lg text-center font-medium">
                  ✓ Ez az árajánlat már sikeresen el lett küldve az ügyfélnek.
                </div>
              )}
            </div>
          )}

          {/* 🛠️ DINAMIKUS FELMÉRŐ FORM: Csak akkor látszik, ha a projekt 'Felmérés' státuszban van */}
          {selectedProject?.status === 'Felmérés' && (
            <div className="bg-slate-900/80 p-4 rounded-xl space-y-4 border border-emerald-500/30">
              <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                👷 Helyszíni Felmérési Jegyzőkönyv
              </h4>
              
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Felmért méret (m²) *</label>
                <input 
                  type="number" 
                  id="areaSizeInput"
                  placeholder="pl. 45" 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Probléma / Hiba típusa</label>
                <select 
                  id="damageTypeInput"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Súlyos beázás">Súlyos beázás</option>
                  <option value="Hajszálrepedések">Hajszálrepedések a betonban</option>
                  <option value="Szigetelés elöregedés">Szigetelés elöregedése</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Helyszíni szakmai megjegyzések</label>
                <textarea 
                  id="notesInput"
                  rows={3} 
                  placeholder="pl. A diletáció mentén szivárog a víz, injektálásra lesz szükség..." 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button 
                onClick={async () => {
                  const size = Number((document.getElementById('areaSizeInput') as HTMLInputElement)?.value || 0);
                  const type = (document.getElementById('damageTypeInput') as HTMLSelectElement)?.value || '';
                  const notes = (document.getElementById('notesInput') as HTMLTextAreaElement)?.value || '';
                  
                  if(size > 0 && selectedProject) {
                    await saveSurveyData(selectedProject.id, size, type, notes);
                    setIsPanelOpen(false); // Panel zárása a sikeres mentés után
                  } else {
                    alert('Kérlek add meg a felmért méretet!');
                  }
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg font-medium text-xs transition-colors"
              >
                ✓ Felmérés Lezárása és Küldése az Irodának
              </button>
            </div>
          )}

          {/* Ha már le lett mérve, mutassuk meg az eredményt */}
          {selectedProject?.surveyData && (
            <div className="bg-slate-900/30 p-4 rounded-xl space-y-1 border border-slate-700/50 text-xs">
              <h4 className="font-semibold text-slate-400 uppercase">Rögzített műszaki adatok</h4>
              <p className="text-slate-200">Alapterület: <span className="font-medium text-slate-100">{selectedProject.surveyData.areaSize} m²</span></p>
              <p className="text-slate-200">Hiba: <span className="font-medium text-slate-100">{selectedProject.surveyData.damageType}</span></p>
              <p className="text-slate-400 italic mt-1">"{selectedProject.surveyData.notes}"</p>
            </div>
          )}
        </div>
        <div className="border-t border-slate-700 pt-4 flex gap-3">
          <button onClick={handleStepStatus} className="flex-1 bg-sky-600 hover:bg-sky-500 text-white py-2.5 rounded-lg font-medium text-sm transition-colors">
            Fázis léptetése ➔
          </button>
        </div>
      </div>

      {/* ── 2. PANEL: ÚJ ÉRDEKLŐDÉS RÖGZÍTÉSE ── */}
      {isInquiryFormOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setIsInquiryFormOpen(false)} />}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[450px] bg-slate-800 border-l border-slate-700 z-50 shadow-2xl transform transition-transform duration-300 p-6 space-y-6 flex flex-col ${isInquiryFormOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-start border-b border-slate-700 pb-4">
          <h2 className="text-xl font-bold text-slate-100">Új Érdeklődés Rögzítése</h2>
          <button onClick={() => setIsInquiryFormOpen(false)} className="text-slate-400 hover:text-white bg-slate-700/50 p-2 rounded-lg">✕</button>
        </div>
        <form onSubmit={handleCreateInquiry} className="flex-1 space-y-4 text-sm">
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium">Projekt / Igény megnevezése *</label>
            <input type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="pl. Pinceszint utólagos vízszigetelés" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-sky-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium">Ügyfél / Cég neve *</label>
            <input type="text" required value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="pl. Kovács Péter" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-sky-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium">Pontos helyszín / cím</label>
            <input type="text" value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="pl. 1112 Budapest, Balatoni út 12." className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-sky-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium">Telefonszám</label>
            <input type="text" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="pl. +36 30 123 4567" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-sky-500" />
          </div>
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-medium text-sm transition-colors mt-6">
            Érdeklődés Mentése a Firestore-ba
          </button>
        </form>
      </div>
    </main>
  );
}