# Espace de révision vidéo

Site de relecture et de validation des vidéos (Next.js 15, React 19, Tailwind, Supabase).

## Variables à renseigner (dans Vercel)

| Nom | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Adresse de votre projet Supabase (Project Settings > API) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clé « publishable » (Project Settings > API Keys) |

Le guide d'installation (document fourni avec ce dossier) explique chaque clic.

## Accès

Le site est en accès libre : pas de compte. Chaque visiteur reçoit une session anonyme et donne son prénom pour signer ses commentaires. Toute personne qui connaît l'adresse du site peut voir les vidéos : ne la diffusez qu'à votre équipe et à vos clients.

## En local (facultatif)

```bash
npm install
cp .env.example .env.local   # puis remplir les deux valeurs
npm run dev
```
