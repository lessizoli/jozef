# Envision CRM – rendszeráttekintés

## Cél

Az Envision CRM többcéges projektmenedzsment rendszer felméréstől a pénzügyi lezárásig.

## Végleges főmodulok

1. Felmérés
2. Ajánlat
3. Szerződés
4. Kivitelezés
5. Pénzügy

## Projektfolyamat megjelenése

- zöld: az adott szakasz elkészült, az elkészülés dátuma látható;
- sárga: az adott szakasz folyamatban van;
- piros: az adott szakasz csúszásban vagy késedelemben van;
- szürke: a projekt még nem jutott el ide, vagy az előfizetés/projekt jogosultsága miatt nem elérhető.

A modulnevek kattintható gombok, amelyek az adott projektrész részleteit nyitják meg.

## Modulstátuszok

### Felmérés
- Folyamatban
- Kész

### Ajánlat
- Kiküldve
- Elutasítva
- Elfogadva

### Szerződés
- Kiküldve
- Aláírva

### Kivitelezés
- Folyamatban
- Befejezve

### Pénzügy
- Számlázva
- Fizetve
- Késedelem

## Előfizetési alapelv

Az alap előfizetésben a Felmérés és a Kivitelezés modul érhető el. A többi modul látható, de inaktív és szürke.

A projekt létrehozásakor rögzíteni kell az elérhető modulokat. Egy későbbi előfizetés-bővítés nem kapcsolja be automatikusan az új modulokat a korábban létrehozott projektekben. Az új csomag jogosultságai csak az ezután létrehozott projektekre vonatkoznak, kivéve külön migráció esetén.

## Első fejlesztési szakasz

1. Bejelentkezés és munkamenet
2. Többcéges felhasználói profil
3. Szerepkör- és jogosultságkezelés
4. SuperAdmin felület alapja
5. Cégadmin felület alapja
6. Projektlista és projektkártya
7. Felmérés és Kivitelezés modul első verziója

## Tervezett alap kollekciók

- `companies`
- `users`
- `projects`
- `teams`
- `subscriptions`
- `projectEvents`

A részletes menü-, jogosultság- és adatmodell-specifikáció külön dokumentumokban készül el.
