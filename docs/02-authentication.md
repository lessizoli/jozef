# Hitelesítés és első felhasználó

## Firebase Authentication

A Firebase Console Authentication részében engedélyezni kell az Email/Password belépési módot.

## Első tesztfelhasználó

1. Hozz létre egy felhasználót a Firebase Authentication felületén.
2. Másold ki a felhasználó UID-jét.
3. A Firestore `users` kollekciójában hozz létre egy dokumentumot ezzel az UID-vel.

Példa:

```json
{
  "email": "admin@example.com",
  "displayName": "Rendszergazda",
  "role": "superadmin",
  "companyId": null,
  "active": true
}
```

## Szerepkörök

- `superadmin`
- `company_admin`
- `office`
- `surveyor`
- `installer`

A kliens jelenleg csak a saját `users/{uid}` dokumentumát olvashatja. Felhasználót létrehozni és módosítani később kizárólag biztonságos szerveroldali adminfolyamatból lehet.
