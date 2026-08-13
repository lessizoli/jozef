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
  'A projekt összes jegyzete, képe, dokumentuma és automatikus modulanyaga egy helyen.': 'Alle Notizen, Bilder, Dokumente und automatisch erzeugten Moduldateien des Projekts an einem Ort.', 'Projekt': 'Projekt', 'Nincs projekt': 'Kein Projekt', 'Új elem helye': 'Ablageort des neuen Elements', 'Általános': 'Allgemein', 'Lista szűrése': 'Liste filtern', 'Minden modul': 'Alle Module', 'Kivitelezési munkafázis': 'Ausführungsphase', 'Teljes kivitelezés': 'Gesamte Ausführung', 'Szöveges jegyzet': 'Textnotiz', 'Jegyzet…': 'Notiz…', 'Hozzáadás': 'Hinzufügen', '+ Dokumentum feltöltése': '+ Dokument hochladen', 'Dokumentum megnevezése (opcionális)': 'Dokumentbezeichnung (optional)', 'PDF, Word, Excel és más fájlok · legfeljebb 25 MB': 'PDF, Word, Excel und andere Dateien · maximal 25 MB', 'JPG, PNG, WEBP · legfeljebb 15 MB': 'JPG, PNG, WEBP · maximal 15 MB', 'A projekt összes anyaga': 'Alle Projektmaterialien', 'Nincs elem ebben a nézetben.': 'In dieser Ansicht gibt es keine Elemente.', 'Képgaléria': 'Bildergalerie', 'Dokumentumok és jegyzetek': 'Dokumente und Notizen', 'Megnézés': 'Ansehen', 'Megnézés új ablakban': 'In neuem Fenster ansehen', 'Letöltés': 'Herunterladen', 'Biztosan törlöd ezt a projektanyagot?': 'Möchten Sie dieses Projektmaterial wirklich löschen?', 'Projektképek': 'Projektbilder', 'Képnézegető bezárása': 'Bildbetrachter schließen', 'Előző kép': 'Vorheriges Bild', 'Következő kép': 'Nächstes Bild', 'A kép nem tölthető be.': 'Das Bild kann nicht geladen werden.', 'Kép betöltése…': 'Bild wird geladen…', 'Az előnézet nem tölthető be': 'Die Vorschau kann nicht geladen werden', 'Nincs dátum': 'Kein Datum', 'Jegyzet': 'Notiz', 'Névtelen fájl': 'Unbenannte Datei', 'Ismeretlen feltöltő': 'Unbekannter Uploader', 'Kivitelezési kép': 'Ausführungsfoto', 'Kivitelezési napló': 'Ausführungsprotokoll', 'Helyszíni kép': 'Baustellenfoto', 'Naplóbejegyzés': 'Protokolleintrag', 'Automatikus PDF': 'Automatisches PDF', 'Rendszer': 'System', 'Aláírt szerződés': 'Unterzeichneter Vertrag', 'Számla': 'Rechnung', 'A művelet sikertelen.': 'Der Vorgang ist fehlgeschlagen.',
  'Céges adatok': 'Unternehmensdaten', 'A vállalkozás hivatalos és kapcsolattartási adatai.': 'Offizielle Unternehmens- und Kontaktdaten.', '+ Másik cég létrehozása': '+ Weiteres Unternehmen anlegen', 'Új vállalkozás neve': 'Name des neuen Unternehmens', 'Létrehozás és átváltás': 'Anlegen und wechseln', 'Vállalkozás neve': 'Unternehmensname', 'Adószám': 'Steuernummer', 'Képviselő / kapcsolattartó': 'Vertreter / Ansprechpartner', 'Bankszámlaszám': 'Bankverbindung', 'Székhely / levelezési cím': 'Sitz / Postanschrift', 'Központi e-mail': 'Zentrale E-Mail-Adresse', 'Weboldal': 'Webseite', 'Alapértelmezett kommunikációs nyelv': 'Standard-Kommunikationssprache', 'Céges adatok mentése': 'Unternehmensdaten speichern', 'Az adatokat csak céges adminisztrátor módosíthatja.': 'Nur ein Unternehmensadministrator kann diese Daten ändern.',
  'Csapattagok és szerepkörök': 'Teammitglieder und Rollen', 'Csapatok kezelése': 'Teams verwalten', 'Új munkatárs meghívása': 'Neuen Mitarbeiter einladen', 'Meghívás': 'Einladen', 'Név': 'Name', 'Szerepkör': 'Rolle', 'Aktív': 'Aktiv', 'Inaktív': 'Inaktiv', 'Jogosultságok': 'Berechtigungen', 'Jogosultságok mentése': 'Berechtigungen speichern', 'Új csapat': 'Neues Team', 'Csapat neve': 'Teamname', 'Létrehozás': 'Anlegen', 'Ma': 'Heute', 'Előző hónap': 'Vorheriger Monat', 'Következő hónap': 'Nächster Monat', 'Új naptárbejegyzés': 'Neuer Kalendereintrag', 'Nincs naptárbejegyzés.': 'Keine Kalendereinträge.', 'Időpont szerkesztése': 'Termin bearbeiten',
  'Alapadatok': 'Grunddaten', 'Az ügyfél és a projekt legfontosabb adatai.': 'Die wichtigsten Kunden- und Projektdaten.', 'Ügyfél': 'Kunde', 'Cím': 'Adresse', 'Alapfeladat': 'Grundaufgabe', 'Létrehozva': 'Erstellt', 'Utoljára frissítve': 'Zuletzt aktualisiert', 'Csomag a létrehozáskor': 'Paket bei Erstellung', 'Projektállapot': 'Projektstatus', 'Projektfolyamat': 'Projektablauf', 'Az összes munkaszakasz, időpont és felelős egyetlen áttekintésben.': 'Alle Arbeitsabschnitte, Termine und Verantwortlichen in einer Übersicht.', 'Nem elérhető': 'Nicht verfügbar', 'Időpont:': 'Termin:', 'Elkészült:': 'Abgeschlossen:', 'Ajánlat és szerződés': 'Angebot und Vertrag', 'Bruttó összeg': 'Bruttobetrag', 'Munkaleírás': 'Leistungsbeschreibung', 'Szerződésszám': 'Vertragsnummer', 'Érvényes': 'Gültig', 'Kivitelezés és átadás': 'Ausführung und Übergabe',
  'Projekt megnevezése': 'Projektbezeichnung', 'Ügyfél neve': 'Kundenname', 'Kommunikáció és dokumentumok nyelve': 'Sprache der Kommunikation und Dokumente', 'Projektadatok mentése': 'Projektdaten speichern', 'Biztosan lezárod ezt a projektet?': 'Möchten Sie dieses Projekt wirklich abschließen?', 'A projekt megmarad, de a folyamatai nem lesznek tovább módosíthatók.': 'Das Projekt bleibt erhalten, seine Abläufe können jedoch nicht mehr geändert werden.', 'Mégsem': 'Abbrechen', 'Igen, lezárom': 'Ja, abschließen',
  'Szerződés állapota': 'Vertragsstatus', 'Szerződés adatai': 'Vertragsdaten', 'Vállalkozó adatai': 'Daten des Auftragnehmers', 'Megrendelő adatai': 'Daten des Auftraggebers', 'Fizetési feltételek': 'Zahlungsbedingungen', 'Kezdés': 'Beginn', 'Befejezési határidő': 'Fertigstellungstermin', 'Jótállás (hónap)': 'Garantie (Monate)', 'További feltételek': 'Weitere Bedingungen', 'Szerződés mentése': 'Vertrag speichern', 'Szerződés PDF letöltése': 'Vertrags-PDF herunterladen', 'Mentés és szerződés küldése': 'Speichern und Vertrag senden', 'Munkafázisok': 'Arbeitsphasen', 'Új munkafázis': 'Neue Arbeitsphase', 'Munkanapló': 'Arbeitsprotokoll', 'Naplóbejegyzés hozzáadása': 'Protokolleintrag hinzufügen', 'Helyszíni kép feltöltése': 'Baustellenfoto hochladen', 'Kivitelezés indítása': 'Ausführung starten', 'Kivitelezés befejezése': 'Ausführung abschließen', 'Ellenőrzőlista': 'Checkliste', 'Ügyfél-visszaigazolás': 'Kundenbestätigung', 'Átadás rögzítése': 'Übergabe speichern', 'Számlaszám': 'Rechnungsnummer', 'Fizetési határidő': 'Zahlungsfrist', 'Számla feltöltése': 'Rechnung hochladen', 'Fizetés rögzítése': 'Zahlung erfassen',
  '+ Fázis': '+ Phase', '+ Számla feltöltése (PDF, XML, JPG, PNG)': '+ Rechnung hochladen (PDF, XML, JPG, PNG)', 'A meghívott e-mailben kap jelszóbeállító hivatkozást.': 'Die eingeladene Person erhält per E-Mail einen Link zum Festlegen des Passworts.', 'Aláírt dokumentum': 'Unterzeichnetes Dokument', 'Aláírt szerződés feltöltése': 'Unterzeichneten Vertrag hochladen', 'Anyagok kezelése': 'Materialien verwalten', 'Az Aláírva jelölés előtt mentsd el a szerződést.': 'Speichern Sie den Vertrag, bevor Sie ihn als unterzeichnet markieren.', 'Az adatok lezárultak, a Kivitelezés modul automatikusan elindult.': 'Die Daten wurden abgeschlossen; das Ausführungsmodul wurde automatisch gestartet.', 'Azonos időpontra több külön projektfolyamat is felvehető.': 'Für denselben Zeitpunkt können mehrere Projektvorgänge erfasst werden.', 'Bejegyzés hozzáadása': 'Eintrag hinzufügen', 'Bruttó összeg (Ft)': 'Bruttobetrag (Ft)', 'Csapat létrehozása': 'Team anlegen', 'Feljegyzések': 'Notizen', 'Fizetve jelölés': 'Als bezahlt markieren', 'Fizetés dátuma': 'Zahlungsdatum', 'Függő meghívások': 'Ausstehende Einladungen', 'Helyszíni képek': 'Baustellenfotos', 'Hibák és utómunkák': 'Mängel und Nacharbeiten', 'Indítás': 'Starten', 'Jogosultság': 'Berechtigung', 'Jogosultsági tábla': 'Berechtigungsmatrix', 'Kivitelezőcsapatok': 'Ausführungsteams', 'Kiállítás dátuma': 'Ausstellungsdatum', 'Képek': 'Bilder', 'Megnyitás': 'Öffnen', 'Megrendelő': 'Auftraggeber', 'Munkafázisok mentése': 'Arbeitsphasen speichern', 'Munkatárs meghívása': 'Mitarbeiter einladen', 'Még nincs betöltött munkatárs.': 'Noch keine Mitarbeiter geladen.', 'Még nincs létrehozott csapat.': 'Noch kein Team angelegt.', 'Nincs feljegyzés.': 'Keine Notizen.', 'Nincs feltöltött dokumentum.': 'Keine Dokumente hochgeladen.', 'Nincs feltöltött kép.': 'Keine Bilder hochgeladen.', 'Nincs munkafázis rögzítve.': 'Keine Arbeitsphase erfasst.', 'Projekt betöltése…': 'Projekt wird geladen…', 'Projektfolyamat hozzáadása': 'Projektvorgang hinzufügen', 'Pénzügyi adatok mentése': 'Finanzdaten speichern', 'Pénzügyi állapot': 'Finanzstatus', 'Számla dokumentum': 'Rechnungsdokument', 'Ütemezés és csapat': 'Terminplanung und Team', 'Válassz projektet': 'Projekt auswählen', 'Átadás befejezése': 'Übergabe abschließen', 'Átadás dátuma': 'Übergabedatum', 'Átadás felelőse': 'Verantwortlicher für die Übergabe', 'Átadási jegyzet': 'Übergabenotiz', 'Összes projektanyag kezelése': 'Alle Projektmaterialien verwalten', '← Vissza a projektekhez': '← Zurück zu den Projekten',
};

const huByDe = Object.fromEntries(Object.entries(de).map(([hu, german]) => [german, hu]));
export function translateText(text: string, language: Language) {
  const hu = huByDe[text] ?? text;
  if (language === 'hu') return hu;
  if (de[hu]) return de[hu];
  const count = hu.match(/^(\d+) (kép|elem)$/);
  return count ? `${count[1]} ${count[2] === 'kép' ? 'Bilder' : 'Elemente'}` : hu;
}

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
