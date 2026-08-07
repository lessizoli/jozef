# Envision CRM – projektállapot és mérföldkövek

Utolsó frissítés: 2026. augusztus 7.

Ez a fájl az Envision CRM fejlesztésének központi állapotlapja. Új fejlesztés megkezdése előtt ezt kell elolvasni, befejezés után pedig frissíteni kell.

## A projekt célja

Egy egyszerűen kezelhető, többcéges projektmenedzser CRM létrehozása Next.js és Firebase alapokon. A rendszer egy projekt teljes életútját követi az első felméréstől a pénzügyi lezárásig.

A rendszer nem általános ERP. A fő folyamat öt modulból áll:

1. Felmérés
2. Ajánlat
3. Szerződés
4. Kivitelezés
5. Pénzügy

## Rögzített üzleti szabályok

- A projektkártyán mind az öt modul megjelenik.
- A modul neve gombként működik, és megnyitja a hozzá tartozó kezelőfelületet.
- Zöld: a modul elkészült, és az elkészülés dátuma jelenik meg.
- Sárga: a modul folyamatban van vagy intézendő.
- Piros: csúszás vagy fizetési késedelem van.
- Szürke: a projekt még nem ért el ehhez a modulhoz, vagy a modul az adott projektnél nem elérhető.
- Nincs általános „Kész” projektstátusz. A modul elkészülési dátuma jelzi a teljesítést.
- A projektkód mellett a legutóbbi művelet jelenik meg a hozzá tartozó színnel.
- A projektkártya gyorsmenüjéből módosíthatók a státuszok, időpontok, csapatok és projektadatok, valamint lezárható a projekt.

### Modulstátuszok

| Modul | Státuszok |
| --- | --- |
| Felmérés | Folyamatban, Kész |
| Ajánlat | Kiküldve, Elutasítva, Elfogadva |
| Szerződés | Kiküldve, Aláírva |
| Kivitelezés | Folyamatban, Befejezve |
| Pénzügy | Számlázva, Fizetve, Késedelem |

### Előfizetés és projekt-snapshot

- Az alapcsomagban csak a Felmérés és a Kivitelezés érhető el.
- A többi modul látható, de inaktív és szürke.
- A projekt létrehozásakor el kell menteni az akkor elérhető modulokat.
- Egy későbbi előfizetés-bővítés nem módosíthatja visszamenőleg a régi projekteket.
- A bővítés után létrehozott projektek már az új modul-hozzáférést kapják.

## Jelenlegi állapot

Alap: Next.js 16, React 19, TypeScript, Firebase Authentication, Firestore, Storage és Functions.

### Elkészült

- [x] Firebase bejelentkezés és céges felhasználói profilok
- [x] Többcéges, companyId alapján leválasztott adatszerkezet
- [x] Projektlista és projektkártyák
- [x] Ötmodulos projektfolyamat és állapotszínezés
- [x] Projekt legutóbbi műveletének megjelenítése
- [x] Projektkártya gyorsműveletek
- [x] Projektadatok módosítása és projekt lezárása
- [x] Naptár és több párhuzamos projektfolyamat időzítése
- [x] Munkatársak és kivitelezőcsapatok kezelése
- [x] Projektjegyzetek és képfeltöltés
- [x] Ajánlat modul tételes kalkulációval
- [x] Ajánlat PDF-generálás és e-mailes kiküldés
- [x] Szerződés modul ajánlatadatok átvételével
- [x] Szerződés PDF-generálás és e-mailes kiküldés
- [x] Aláírt szerződés védett feltöltése és naplózása
- [x] Kivitelezés automatikus indítása aláírt szerződés után
- [x] Kivitelezési munkafázisok
- [x] Kivitelezési napló
- [x] Védett helyszíni képek
- [x] Kivitelezés indítása és befejezése
- [x] Automatikus továbblépés a Pénzügy modulra
- [x] Firestore- és Storage-jogosultságok a fenti funkciókhoz

### Részben kész, ellenőrizendő

- [ ] Az előfizetés szerinti modul-hozzáférés projekt-létrehozáskori snapshotjának teljes végponttól végpontig ellenőrzése
- [ ] Régi, hiányos adatszerkezetű projektek visszafelé kompatibilis kezelése minden modulban
- [ ] A teljes projektfolyamat kézi tesztje új projekttől a Kivitelezés befejezéséig
- [ ] Mobilnézet és keskeny képernyős projektpanel teljes vizuális ellenőrzése

## Következő mérföldkő

### M5 – Pénzügy modul

Ez a következő aktív fejlesztési feladat.

Tervezett tartalom:

- számla adatainak rögzítése;
- számlaszám, kiállítási dátum és fizetési határidő;
- nettó, ÁFA és bruttó összeg;
- részfizetések kezelése;
- státuszok: Számlázva, Fizetve, Késedelem;
- késedelem automatikus felismerése a fizetési határidő alapján;
- befizetés dátumának és rögzítőjének naplózása;
- ajánlat és szerződés összegének automatikus átvétele;
- pénzügyi összesítő a projektkártyán;
- projekt lezárhatósága a pénzügyi folyamat befejezése után;
- szükséges Firestore-szabályok és tesztek.

### A következő konkrét lépés

1. A Pénzügy modul adatmodelljének rögzítése.
2. A pénzügyi szerkesztő felület elkészítése.
3. Státuszátmenetek és késedelemszámítás bekötése.
4. Projektkártya és legutóbbi művelet frissítése.
5. Jogosultságok, lint, build és kézi folyamatpróba.

## Későbbi mérföldkövek

### M6 – Stabilizálás és tesztelés

- teljes folyamat integrációs tesztje;
- jogosultsági tesztek cégek és szerepkörök között;
- hibakezelés és visszajelzések egységesítése;
- adatvalidáció;
- reszponzív felület ellenőrzése;
- Firebase indexek és lekérdezések felülvizsgálata.

### M7 – Éles használatra felkészítés

- előfizetési csomagok tényleges kezelése;
- adminisztráció és céges beállítások véglegesítése;
- biztonsági felülvizsgálat;
- mentési és visszaállítási terv;
- éles deploy ellenőrzőlista;
- felhasználói útmutató.

## Fontos technikai helyek

| Terület | Hely |
| --- | --- |
| Fő dashboard | `app/page.tsx` |
| Projektadatok és modulfolyamat | `lib/projectService.ts` |
| Projektpanel | `components/dashboard/ProjectDrawer.tsx` |
| Modulok és státuszok | `components/dashboard/dashboardConfig.ts` |
| Ajánlat | `lib/quoteService.ts`, `components/dashboard/QuoteEditor.tsx` |
| Szerződés | `lib/contractService.ts`, `components/dashboard/ContractEditor.tsx` |
| Kivitelezés | `lib/constructionService.ts`, `components/dashboard/ConstructionEditor.tsx` |
| Firestore-jogosultságok | `firestore.rules` |
| Storage-jogosultságok | `storage.rules` |
| Firebase-konfiguráció | `firebase.json`, `.firebaserc` |

## Legutóbbi kiadási állapot

- GitHub `main`: `d50ab8e` – Add construction workflow (#4)
- Firestore rules: telepítve az `envision-cmr` projektbe
- Storage rules: telepítve az `envision-cmr` projektbe
- Lint: sikeres
- Next.js production build: sikeres
- Firebase Functions TypeScript build: sikeres

## Frissítési szabály

Minden lezárt fejlesztési kör végén:

1. frissíteni kell az „Utolsó frissítés” dátumát;
2. át kell mozgatni az elkészült feladatokat az „Elkészült” listába;
3. pontosítani kell a „Következő konkrét lépés” részt;
4. rögzíteni kell a legutóbbi main commitot és a deploy állapotát;
5. az itt leírt üzleti szabályokat csak kifejezett termékdöntés alapján szabad módosítani.
