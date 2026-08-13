# Envision CRM – projektállapot és mérföldkövek

Utolsó frissítés: 2026. augusztus 11.

Ez a fájl az Envision CRM fejlesztésének központi állapotlapja. Új fejlesztés megkezdése előtt ezt kell elolvasni, befejezés után pedig frissíteni kell.

## A projekt célja

Egy egyszerűen kezelhető, többcéges ügyfél- és projektmenedzser létrehozása Next.js és Firebase alapokon. Az alaptermék az ügyfél kezelését és a munka teljes életútját követi a felméréstől a kivitelezés befejezéséig, az összes kapcsolódó szöveges, képi és dokumentumanyag rendezett tárolásával.

A rendszer nem általános ERP és nem alapvetően pénzügyi program. Az alaptermék fő területei:

1. Ügyfélkezelés
2. Felmérés
3. Kivitelezés
4. Befejezés és átadás
5. Szövegek, képek és dokumentumok kezelése

Az Ajánlat, Szerződés, Pénzügy, Raktár és más üzleti területek külön megrendelhető kiegészítő szolgáltatások. A már elkészült Ajánlat és Szerződés funkciók ennek megfelelően opcionális modulokként maradnak a rendszerben.

## Rögzített üzleti szabályok

- Az alapfolyamat az ügyfélkezelésből, Felmérésből, Kivitelezésből és Befejezésből áll.
- A megrendelt kiegészítő modulok a projektkártyán megjelenhetnek, de nem részei kötelezően az alapterméknek.
- A modul neve gombként működik, és megnyitja a hozzá tartozó kezelőfelületet.
- Zöld: a modul elkészült, és az elkészülés dátuma jelenik meg.
- Sárga: a modul folyamatban van vagy intézendő.
- Piros: csúszás vagy más, figyelmet igénylő probléma van.
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
| Befejezés | Átadásra vár, Befejezve |
| Pénzügy – kiegészítő | Számlázva, Fizetve, Késedelem |

### Előfizetés és projekt-snapshot

- Az alapcsomag tartalmazza az ügyfélkezelést, a Felmérést, a Kivitelezést, a Befejezést, valamint a kapcsolódó szövegek, képek és dokumentumok kezelését.
- Az opcionális modulok csak akkor aktívak, ha az ügyfél megrendelte őket.
- A nem megrendelt, de a felületen bemutatott kiegészítő modulok inaktívak és szürkék.
- A projekt létrehozásakor el kell menteni az akkor elérhető modulokat.
- Egy későbbi előfizetés-bővítés nem módosíthatja visszamenőleg a régi projekteket.
- A bővítés után létrehozott projektek már az új modul-hozzáférést kapják.

## Jelenlegi állapot

Alap: Next.js 16, React 19, TypeScript, Firebase Authentication, Firestore, Storage és Functions.

### Elkészült

- [x] Bővíthető HU/DE nyelvi rendszer felhasználói nyelvmentéssel és fejléc-/belépési nyelvválasztóval
- [x] Céges alapértelmezett és projektenkénti kommunikációs nyelv, a pénznemtől külön kezelve
- [x] Német ajánlati és szerződéses PDF-ek, valamint német ajánlat- és szerződésküldő e-mailek
- [x] A Dokumentumok, Naptár, Munkatársak, céges beállítások, teljes projektlap és valamennyi modul dinamikus HU/DE felületi fordítása

- [x] Firebase bejelentkezés és céges felhasználói profilok
- [x] Önálló cégregisztráció SuperAdmin közreműködése nélkül
- [x] Az első felhasználó automatikus `company_admin` jogosultsága
- [x] Új cég alapcsomagjának és engedélyezett moduljainak rögzítése
- [x] Projekt-létrehozáskori csomag- és modul-hozzáférési snapshot
- [x] Kiegészítő modulok alapértelmezett inaktiválása az alapcsomagos új projekteknél
- [x] Többcéges, companyId alapján leválasztott adatszerkezet
- [x] Projektlista és projektkártyák
- [x] A dashboard felesleges összesítőkártyáinak eltávolítása
- [x] Világos, modern alkalmazásmegjelenés
- [x] Projektek összecsukható munkaszakasz-csoportokban
- [x] Alapból zárt projektcsoportok; a Csúszásban csoport csak tartalom esetén nyílik ki automatikusan
- [x] Kiemelt, munkaszakasztól független „Csúszásban” projektcsoport
- [x] Lejárt vagy késésre jelölt modulok egységes „Csúszás” / „Késedelem” megjelenítése minden projektnézetben
- [x] Moduláris projektfolyamat és állapotszínezés
- [x] Projekt legutóbbi műveletének megjelenítése
- [x] Projektkártya gyorsműveletek
- [x] Stabil, soron belül kinyíló gyorsműveleti panel mobil- és rövid listás nézethez
- [x] Teljes projektlap alapadatokkal, modulfolyamattal, képekkel, feljegyzésekkel és dokumentumokkal
- [x] Teljes képernyős árajánlat-szerkesztő
- [x] Egységes alkalmazásfejléc és főmenü a teljes képernyős Ajánlat nézetben
- [x] Kontrasztos ajánlati tételkártyák, összesítők, figyelmeztetések és inaktív műveletek
- [x] Védetten betöltött, kattintható képbélyegképek a teljes projektlapon
- [x] Egységes vízszintes alkalmazásfejléc a dashboardon, dokumentumtárban és projektlapon
- [x] Világos naptárnézet olvasható, kontrasztos eseményfeliratokkal
- [x] Céges adatlap megtekintése és adminisztrátori szerkesztése a Munkatársak részben
- [x] Egy felhasználói e-mailhez több céges tagság és aktívcég-váltás
- [x] További vállalkozás biztonságos létrehozása meglévő bejelentkezésből
- [x] Meglévő Envision-felhasználó meghívása további céghez
- [x] Projektadatok módosítása és projekt lezárása
- [x] Menthető helyszíni felmérési űrlap közvetlenül a Felmérés gyorsmenüből
- [x] Felmérési képek feltöltése galériából vagy közvetlenül mobilkamerával
- [x] Mentett felmérési eredmény megjelenítése a modulban és a teljes projektlapon
- [x] Felmérés mentésekor automatikus továbblépés a következő elérhető projektszakaszra
- [x] A felmérési eredmény és a státuszváltás atomi, régi projektekkel kompatibilis mentése
- [x] A Felmérés oldalsó panel automatikus bezárása sikeres mentés után
- [x] Gyorsítótárazott felhasználói és cégkontextus a gyakori megnyitási és mentési műveletekhez
- [x] Kényszerített long-polling Safari-kompatibilis Firestore-kapcsolat és előtöltött projektlétrehozási konfiguráció a hosszú mentési várakozás ellen
- [x] Projektlapról közvetlenül nyitható, aktuális modulhoz igazodó szerkesztőfelületek
- [x] Új projekt alapfeladatának rögzítése és megjelenítése
- [x] Ajánlati tétel hozzáadása az utolsó tétel alatt, valamint látható szerkesztési hibaüzenetek
- [x] Naptár és több párhuzamos projektfolyamat időzítése
- [x] Munkatársak és kivitelezőcsapatok kezelése
- [x] Projektjegyzetek és képfeltöltés
- [x] Egységes projekt-dokumentumtár jegyzetekhez, képekhez és általános dokumentumokhoz
- [x] Dokumentumok modul- és kivitelezési munkafázis szerinti rendezése és szűrése
- [x] Védett dokumentum-megnyitás és letöltés
- [x] Borcar-mintájú, oldalon belüli képnézegető bélyegképekkel, lapozással és külön dokumentum-előnézettel
- [x] Opcionális Ajánlat modul tételes kalkulációval
- [x] Opcionális Ajánlat PDF-generálás és e-mailes kiküldés
- [x] Opcionális Szerződés modul ajánlatadatok átvételével
- [x] Opcionális Szerződés PDF-generálás és e-mailes kiküldés
- [x] Opcionális aláírt szerződés védett feltöltése és naplózása
- [x] Kivitelezés indítása az opcionális szerződésfolyamatból
- [x] Kivitelezési munkafázisok
- [x] Kivitelezési napló
- [x] Védett helyszíni képek
- [x] Kivitelezés indítása és befejezése
- [x] Kivitelezés befejezési állapotának és dátumának rögzítése
- [x] Önálló Befejezés és átadás alapmodul
- [x] Átadási ellenőrzőlista, dátum, felelős és ügyfél-visszaigazolás
- [x] Hibák, utómunkák és átadási jegyzetek rögzítése
- [x] Projekt lezárhatósága a Befejezés modul után
- [x] Firestore- és Storage-jogosultságok a fenti funkciókhoz
- [x] Cégenként szerkeszthető szerepkör-jogosultsági tábla
- [x] Projekt-, dokumentum-, csapat- és munkatárs-műveletek szerveroldali jogosultság-ellenőrzése

### Részben kész, ellenőrizendő

- [ ] Az előfizetés szerinti modul-hozzáférés projekt-létrehozáskori snapshotjának teljes végponttól végpontig ellenőrzése
- [ ] Régi, hiányos adatszerkezetű projektek visszafelé kompatibilis kezelése minden modulban
- [ ] A teljes projektfolyamat kézi tesztje új projekttől a Kivitelezés befejezéséig
- [ ] Mobilnézet és keskeny képernyős projektpanel teljes vizuális ellenőrzése
- [ ] A Befejezés és átadás modul teljes kézi végponttól végpontig tesztje
- [ ] Dokumentumtár teljes kézi tesztje több szerepkörrel és fájltípussal

## Következő mérföldkő

### M5 – Az alaptermék befejezési és dokumentumkezelési folyamata

Ez a következő aktív fejlesztési feladat.

Tervezett tartalom:

- önálló Befejezés és átadás modul;
- kivitelezés lezárási ellenőrzőlista;
- átadás dátuma és felelőse;
- átadási jegyzetek és ügyfél-visszaigazolás;
- hibajegyek és utómunkák rögzítése;
- szövegek, képek és dokumentumok modul és munkafázis szerinti rendezése;
- dokumentumfeltöltés, előnézet, letöltés és jogosultságkezelés;
- a projekt lezárhatóságának meghatározása az alapfolyamat befejezése alapján;
- szükséges Firestore-szabályok és tesztek.

### A következő konkrét lépés

1. Az alapfolyamat és a modul-snapshot teljes kézi tesztje új céggel.
2. Dokumentumtár és jogosultsági mátrix kézi tesztje minden szerepkörrel.
3. Régi projektek visszafelé kompatibilitásának ellenőrzése.
4. Mobilnézet és hibavisszajelzések egységesítése.
5. Éles használati ellenőrzőlista elkészítése.

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

### Opcionális, külön megrendelhető modulok

Ezek nem blokkolják az alaptermék elkészültét:

- Ajánlat – jelenleg már rendelkezik működő alapverzióval;
- Szerződés – jelenleg már rendelkezik működő alapverzióval;
- Pénzügy – későbbi külön kiegészítő szolgáltatás;
- Raktár és készletkezelés – későbbi külön kiegészítő szolgáltatás;
- további integrációk és vállalatspecifikus modulok.

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
| Befejezés és átadás | `lib/completionService.ts`, `components/dashboard/CompletionEditor.tsx` |
| Dokumentumtár | `lib/projectAttachments.ts`, `app/dokumentumok/page.tsx` |
| Jogosultsági tábla | `lib/permissionService.ts`, `components/dashboard/PermissionMatrixEditor.tsx` |
| Firestore-jogosultságok | `firestore.rules` |
| Storage-jogosultságok | `storage.rules` |
| Firebase-konfiguráció | `firebase.json`, `.firebaserc` |

## Legutóbbi kiadási állapot

- GitHub `main`: naprakész a legutóbbi egyesített funkció-PR-rel
- Firestore rules: telepítve az `envision-cmr` projektbe
- Storage rules: telepítve az `envision-cmr` projektbe
- Lint: sikeres
- Next.js production build: sikeres
- Firebase Functions TypeScript build: sikeres
- Jogosultsági Cloud Functionök: telepítve az `envision-cmr` projektbe

## Frissítési szabály

Minden lezárt fejlesztési kör végén:

1. frissíteni kell az „Utolsó frissítés” dátumát;
2. át kell mozgatni az elkészült feladatokat az „Elkészült” listába;
3. pontosítani kell a „Következő konkrét lépés” részt;
4. rögzíteni kell a legutóbbi main commitot és a deploy állapotát;
5. az itt leírt üzleti szabályokat csak kifejezett termékdöntés alapján szabad módosítani.
