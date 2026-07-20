# József / Envision CRM

Az Envision CRM új, tiszta alapokra helyezett verziója.

## Technológia

- Next.js App Router
- TypeScript
- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Firebase Functions
- Firebase App Hosting

## Helyi indítás

```bash
npm install
cp .env.example .env.local
npm run dev
```

A fejlesztői szerver alapértelmezetten a `http://localhost:3000` címen indul.

## Könyvtárak

- `src/app` – oldalak és layoutok
- `src/components` – újrahasznosítható felületi elemek
- `src/features` – üzleti modulok
- `src/lib` – Firebase és közös segédfüggvények
- `src/types` – közös TypeScript típusok
- `docs` – rendszerterv és funkcionális specifikáció
- `functions` – Firebase Cloud Functions
