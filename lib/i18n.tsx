'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';

export type Language = 'hu' | 'de';
type Values = Record<string, string | number>;

const de: Record<string, string> = {
  'Projektkezelő': 'Projektverwaltung', 'Projektek': 'Projekte', 'Naptár': 'Kalender', 'Munkatársak': 'Mitarbeiter', 'Dokumentumok': 'Dokumente',
  'Aktív cég': 'Aktives Unternehmen', 'Cég kiválasztása': 'Unternehmen auswählen', '+ Új projekt': '+ Neues Projekt', 'Kilépés': 'Abmelden',
  'Magyar': 'Ungarisch', 'Német': 'Deutsch', 'Felület nyelve': 'Sprache der Oberfläche',
  'Új érdeklődés': 'Neue Anfrage', 'Gyors projektindítás': 'Projekt schnell anlegen', 'Bezárás': 'Schließen',
  'Projekt megnevezése *': 'Projektbezeichnung *', 'Ügyfél neve *': 'Kundenname *', 'Helyszín / cím': 'Standort / Adresse',
  'Telefonszám': 'Telefonnummer', 'Alapfeladat / első teendő': 'Grundaufgabe / erster Schritt',
  'Például: helyszíni felmérés egyeztetése az ügyféllel': 'Zum Beispiel: Vor-Ort-Termin mit dem Kunden vereinbaren',
  'Mentés…': 'Speichern…', 'Érdeklődés rögzítése': 'Anfrage speichern', 'Az új projekt létrejött.': 'Das neue Projekt wurde angelegt.',
  'A művelet nem sikerült.': 'Der Vorgang ist fehlgeschlagen.', 'Hibaüzenet bezárása': 'Fehlermeldung schließen', 'Üzenet bezárása': 'Meldung schließen',
  'A projektek automatikusan az aktuális munkaszakasz szerint rendezve jelennek meg.': 'Die Projekte werden automatisch nach dem aktuellen Arbeitsabschnitt sortiert.',
  'Árajánlat': 'Angebot', 'Időpontok, helyszíni adatok és felmérési dokumentáció': 'Termine, Standortdaten und Aufmaßdokumentation', 'Ajánlatkészítés, kiküldés és elfogadás': 'Angebotserstellung, Versand und Annahme', 'Szerződéskészítés, kiküldés és aláírás': 'Vertragserstellung, Versand und Unterzeichnung', 'Munkafázisok, csapatok, napló és helyszíni anyagok': 'Arbeitsphasen, Teams, Protokoll und Baustellenmaterialien', 'Ellenőrzőlista, ügyfél-visszaigazolás és projektlezárás': 'Checkliste, Kundenbestätigung und Projektabschluss', 'Külön rendelhető pénzügyi folyamat': 'Optionaler Finanzprozess',
  'Még nincs projekt ebben a cégben.': 'In diesem Unternehmen gibt es noch kein Projekt.', 'Első érdeklődés rögzítése': 'Erste Anfrage erfassen', 'Nincs cím megadva': 'Keine Adresse angegeben', 'A számla fizetési határideje lejárt': 'Die Zahlungsfrist der Rechnung ist abgelaufen',
  'Projektadatok megtekintése': 'Projektdaten ansehen', 'Projektadatok módosítása': 'Projektdaten bearbeiten', 'Projektanyagok kezelése': 'Projektmaterialien verwalten',
  'Csúszásban': 'In Verzug', 'Minden késésben lévő projekt, munkaszakasztól függetlenül': 'Alle verspäteten Projekte, unabhängig vom Arbeitsabschnitt',
  'Jelenleg nincs projekt ebben a csoportban.': 'Derzeit gibt es kein Projekt in dieser Gruppe.', 'Lezárt projektek': 'Abgeschlossene Projekte', 'Korábbi, már lezárt munkák': 'Frühere, bereits abgeschlossene Arbeiten',
  'Felmérés': 'Aufmaß', 'Ajánlat': 'Angebot', 'Szerződés': 'Vertrag', 'Kivitelezés': 'Ausführung', 'Befejezés': 'Abschluss', 'Befejezés és átadás': 'Abschluss und Übergabe', 'Pénzügy': 'Finanzen',
  'Folyamatban': 'In Bearbeitung', 'Kész': 'Erledigt', 'Csúszás': 'Verzögerung', 'Intézendő': 'Offen', 'Kiküldve': 'Versendet', 'Elutasítva': 'Abgelehnt', 'Elfogadva': 'Angenommen', 'Aláírva': 'Unterzeichnet', 'Befejezve': 'Abgeschlossen', 'Átadásra vár': 'Übergabe ausstehend', 'Számlázva': 'Fakturiert', 'Fizetve': 'Bezahlt', 'Késedelem': 'Überfällig',
  'Aktuális szakasz': 'Aktueller Abschnitt', 'Felelős': 'Verantwortlich', 'Nincs hozzárendelve': 'Nicht zugewiesen', 'Teljes projekt': 'Gesamtprojekt', 'Gyorsmenü': 'Schnellmenü',
  '{module} megnyitása': '{module} öffnen', 'Projektadatok': 'Projektdaten', 'Projektanyagok': 'Projektmaterialien', 'Projekt lezárása': 'Projekt abschließen',
  'Ajánlat állapota': 'Angebotsstatus', 'Döntés: {date}': 'Entscheidung: {date}', 'A döntés rögzítéséhez projektmódosítási jogosultság szükséges.': 'Zum Speichern der Entscheidung ist die Berechtigung zur Projektbearbeitung erforderlich.',
  'Ajánlatszám': 'Angebotsnummer', 'Kiállítás': 'Ausstellungsdatum', 'Érvényes eddig': 'Gültig bis', 'Ajánlati tételek': 'Angebotspositionen',
  'A végösszeg és az ÁFA automatikusan számolódik.': 'Gesamtsumme und MwSt. werden automatisch berechnet.', 'Első tétel hozzáadása': 'Erste Position hinzufügen',
  '{index}. tétel': '{index}. Position', 'Törlés': 'Löschen', 'Típus': 'Typ', 'Megnevezés': 'Bezeichnung', 'Mennyiség': 'Menge', 'Egység': 'Einheit', 'Nettó egységár': 'Netto-Einzelpreis', 'ÁFA': 'MwSt.',
  'Anyag': 'Material', 'Munkadíj': 'Arbeitslohn', 'Egyéb': 'Sonstiges', 'Nettó:': 'Netto:', '+ Új tétel': '+ Neue Position',
  'Megjegyzés / fizetési feltétel': 'Bemerkung / Zahlungsbedingung', 'Például: 50% előleg, fennmaradó összeg átadáskor.': 'Zum Beispiel: 50 % Anzahlung, Restbetrag bei Übergabe.',
  'Nettó összesen': 'Nettosumme', 'ÁFA összesen': 'MwSt. gesamt', 'Bruttó végösszeg': 'Bruttogesamtsumme',
  'Kiküldéshez előbb add meg az ügyfél e-mail-címét a Projektadatok fülön.': 'Zum Versenden zuerst die E-Mail-Adresse des Kunden unter Projektdaten eintragen.',
  'Mentés': 'Speichern', 'PDF letöltése': 'PDF herunterladen', 'Mentés és kiküldés': 'Speichern und senden',
  'Kommunikáció nyelve': 'Kommunikationssprache', 'Magyar dokumentum': 'Ungarisches Dokument', 'Német dokumentum': 'Deutsches Dokument',
  'Felmérési űrlap': 'Aufmaßformular', 'Helyszíni felmérés rögzítése': 'Vor-Ort-Aufmaß erfassen', 'Az ügyféligények, adottságok és méretek egy helyen menthetők.': 'Kundenanforderungen, Gegebenheiten und Maße können zentral gespeichert werden.',
  'Lezárt': 'Abgeschlossen', 'Folyamat kezelése': 'Ablauf verwalten', 'Kiválasztott modul': 'Ausgewähltes Modul', 'Jelenlegi státusz:': 'Aktueller Status:', 'Felmérési űrlap indítása': 'Aufmaßformular starten', 'Dátum': 'Datum', 'Kezdési idő': 'Startzeit', 'Felelős munkatárs / csapat': 'Verantwortlicher Mitarbeiter / Team', 'Csapatok': 'Teams', 'Időpont mentése': 'Termin speichern',
  'Bejelentkezés': 'Anmeldung', 'A projektkezelő használatához jelentkezz be.': 'Melden Sie sich an, um die Projektverwaltung zu nutzen.', 'E-mail-cím': 'E-Mail-Adresse', 'Jelszó': 'Passwort', 'Bejelentkezés…': 'Anmeldung…', 'Belépés': 'Anmelden', 'Új cégként szeretnéd használni a rendszert?': 'Möchten Sie das System als neues Unternehmen nutzen?', 'Új cég és céges admin létrehozása': 'Neues Unternehmen und Administrator anlegen', 'Hibás e-mail-cím vagy jelszó.': 'E-Mail-Adresse oder Passwort ist falsch.', 'Túl sok sikertelen próbálkozás. Próbáld újra később.': 'Zu viele fehlgeschlagene Versuche. Bitte später erneut versuchen.', 'A bejelentkezés nem sikerült.': 'Die Anmeldung ist fehlgeschlagen.',
  'Új cég létrehozása': 'Neues Unternehmen anlegen', 'Az első felhasználó automatikusan a cég adminisztrátora lesz. SuperAdmin jóváhagyása nem szükséges.': 'Der erste Benutzer wird automatisch Unternehmensadministrator. Eine SuperAdmin-Freigabe ist nicht erforderlich.', 'Cég neve': 'Unternehmensname', 'Adminisztrátor neve': 'Name des Administrators', 'Jelszó ismét': 'Passwort wiederholen', 'Cég létrehozása…': 'Unternehmen wird angelegt…', 'Cég és admin létrehozása': 'Unternehmen und Administrator anlegen', 'Már van hozzáférésed?': 'Haben Sie bereits Zugang?',
  'Ügyféligény': 'Kundenanforderung', 'Helyszíni adottságok': 'Gegebenheiten vor Ort', 'Méretek és mennyiségek': 'Maße und Mengen', 'Felmérési megjegyzés': 'Bemerkung zum Aufmaß', 'Felmérési képek': 'Aufmaßfotos',
  'Telefonon közvetlenül a hátlapi kamerával is készíthetsz képet.': 'Auf dem Telefon kann direkt mit der Rückkamera fotografiert werden.', '+ Kép feltöltése': '+ Bild hochladen', '📷 Kamera megnyitása': '📷 Kamera öffnen', 'Felmérési űrlap mentése': 'Aufmaßformular speichern', 'Felmérési eredmény': 'Aufmaßergebnis', 'Megjegyzés': 'Bemerkung', 'Nincs megadva': 'Nicht angegeben', 'Betöltés…': 'Laden…', 'Felmérési kép': 'Aufmaßfoto', 'A felmérési kép feltöltve.': 'Das Aufmaßfoto wurde hochgeladen.',
};

function interpolate(text: string, values?: Values) {
  return Object.entries(values ?? {}).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, String(value)), text);
}

type I18nContextValue = { language: Language; setLanguage: (language: Language) => void; t: (key: string, values?: Values) => string; locale: string };
const I18nContext = createContext<I18nContextValue>({ language: 'hu', setLanguage: () => undefined, t: (key) => key, locale: 'hu-HU' });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'hu';
    return window.localStorage.getItem('envision-language') === 'de' ? 'de' : 'hu';
  });
  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeProfile?.();
      if (!user) return;
      unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
        const saved = snapshot.data()?.language;
        if (saved === 'de' || saved === 'hu') setLanguageState(saved);
      });
    });
    return () => { unsubscribeAuth(); unsubscribeProfile?.(); };
  }, []);
  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    window.localStorage.setItem('envision-language', next);
    document.documentElement.lang = next;
    if (auth.currentUser) void setDoc(doc(db, 'users', auth.currentUser.uid), { language: next, languageUpdatedAt: serverTimestamp() }, { merge: true });
  }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const value = useMemo<I18nContextValue>(() => ({ language, setLanguage, locale: language === 'de' ? 'de-DE' : 'hu-HU', t: (key, values) => interpolate(language === 'de' ? de[key] ?? key : key, values) }), [language, setLanguage]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() { return useContext(I18nContext); }
export function translateStatus(status: string, language: Language) { return language === 'de' ? de[status] ?? status : status; }
export function translateModule(label: string, language: Language) { return language === 'de' ? de[label] ?? label : label; }
