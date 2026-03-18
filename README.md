# Screen Me

## Presentation du projet

Screen Me est une application web qui permet a des voyageurs de diffuser un souvenir sur un ecran geant installe dans une rue touristique.

Le produit couvre trois usages dans une seule application :

- un parcours client mobile-first ouvert via QR code
- un back-office admin pour la moderation et l'exploitation
- un player plein ecran qui lit la file de diffusion sur l'ecran public

Le voyageur peut envoyer une image, une video muette ou un message, choisir une duree de diffusion, demander une rediffusion periodique, selectionner une fenetre horaire, payer sa commande et suivre son statut jusqu'a la diffusion.

## Fonctionnalites actuellement implementees

### Cote client

- page d'accueil multilingue : `fr`, `en`, `ru`, `zh-Hans`, `es`
- formulaire de commande pour :
  - image
  - video muette
  - message texte
- upload de fichier avec controle de taille et lecture de metadonnees
- devis instantane base sur :
  - type de media
  - duree
  - rediffusion
  - coefficient du creneau
  - coefficient d'occupation
  - code promo optionnel
- creation de commande invite avec nom, email et telephone
- acceptation des droits de diffusion et de la charte
- suivi public d'une commande via un token public
- affichage des notifications, des slots reserves et du voucher si la moderation rejette le contenu

### Cote admin

- file de moderation des commandes payees en attente de decision
- approbation d'un contenu
- rejet d'un contenu avec motif
- emission automatique d'un code promo lors d'un rejet
- recalcul manuel du planning de diffusion
- modification des regles tarifaires depuis l'interface admin
- consultation des commandes recentes
- consultation des vouchers emis
- consultation des prochains slots de diffusion
- journal d'audit des actions systeme et admin

### Cote player / ecran geant

- recuperation d'un feed signe par ecran
- affichage plein ecran d'une image, d'une video ou d'un message
- prechargement de l'image suivante
- heartbeat du device player
- ecran de secours si aucun contenu n'est planifie

## Stack technique

## Frontend

- `Next.js 16` avec App Router
- `React 19`
- `TypeScript`
- `Tailwind CSS 4`
- `next/font` pour la typographie
- composants UI maison adaptes au scope du projet

## Backend applicatif

- Route Handlers `Next.js` pour exposer les endpoints HTTP
- validation des payloads avec `Zod`
- logique metier centralisee dans :
  - `src/lib/workflow.ts`
  - `src/lib/pricing.ts`
  - `src/lib/scheduler.ts`
- signatures HMAC pour les URLs d'upload et de lecture media
- integration `Stripe` optionnelle pour Checkout et webhook de paiement
- mode de paiement simule quand Stripe n'est pas configure

## Persistance et stockage

### Runtime actuel

Le runtime du projet utilise un mode local pour pouvoir lancer l'application sans infrastructure externe :

- stockage JSON local dans `.data/screen-me-store.json`
- fichiers uploades dans `.data/uploads`

### Cible d'architecture prevue

Le repo contient deja le schema cible pour une version branchee a une vraie infrastructure :

- `PostgreSQL` via `prisma/schema.prisma`
- stockage objet S3-compatible pour les medias
- `Stripe Checkout + webhooks`

Important : le schema Prisma est present, mais le runtime branche actuellement le store JSON local afin de garder une execution simple en developpement.

## Outils de qualite

- `ESLint` pour le lint
- `Vitest` pour les tests unitaires
- `npm` comme gestionnaire de paquets et de scripts

Scripts disponibles :

```bash
npm run dev
npm run lint
npm run test
npm run build
npm run start
```

## Structure du projet

```text
src/
  app/
    [locale]/              parcours client
    admin/                 interface moderation / exploitation
    player/                player plein ecran
    api/                   endpoints HTTP
  components/              composants UI et composants client
  lib/                     logique metier, store, pricing, scheduler, validation
prisma/
  schema.prisma            schema cible PostgreSQL
.data/                     donnees locales generees au runtime
```

## Endpoints exposes

Principaux endpoints de l'application :

- `POST /api/quotes`
- `POST /api/uploads/presign`
- `PUT /api/uploads/binary/[...key]`
- `GET /api/media/[...key]`
- `POST /api/orders`
- `GET /api/orders/[publicToken]`
- `POST /api/stripe/webhook`
- `GET /api/player/feed`
- `POST /api/player/heartbeat`
- `POST /api/admin/moderation/[id]/approve`
- `POST /api/admin/moderation/[id]/reject`
- `POST /api/admin/schedule/recompute`
- `POST /api/admin/pricing`

## Installation

## Prerequis

- `Node.js` installe
- `npm` installe

## Etapes d'installation

### 1. Installer les dependances

```bash
npm install
```

### 2. Configurer les variables d'environnement

Creer un fichier `.env.local` a partir de `.env.example`.

Exemple :

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
MEDIA_URL_SECRET=change-me
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Description des variables :

- `NEXT_PUBLIC_APP_URL` : URL publique de l'application, utilisee notamment pour les retours Stripe
- `MEDIA_URL_SECRET` : secret HMAC pour signer les URLs d'upload et de lecture des medias
- `STRIPE_SECRET_KEY` : cle secrete Stripe, optionnelle
- `STRIPE_WEBHOOK_SECRET` : secret de verification du webhook Stripe, optionnel

Si `STRIPE_SECRET_KEY` et `NEXT_PUBLIC_APP_URL` ne sont pas renseignes, le projet reste utilisable en mode paiement simule.

### 3. Lancer le serveur de developpement

```bash
npm run dev
```

L'application sera disponible par defaut sur `http://localhost:3000`.

## Verification locale recommande

```bash
npm run lint
npm run test
npm run build
```

## Utilisation du produit

## Parcours client

### Point d'entree

Le client accede a l'application via une URL de type :

- `http://localhost:3000/fr`
- ou directement `http://localhost:3000/fr/submit`

### Etapes du parcours client

1. Ouvrir le formulaire de commande.
2. Choisir le type de contenu : image, video ou message.
3. Si image ou video : uploader le fichier.
4. Renseigner le titre public.
5. Si message : saisir le texte a diffuser.
6. Choisir la duree de diffusion.
7. Choisir une rediffusion ou une diffusion unique.
8. Choisir la fenetre horaire souhaitee.
9. Renseigner les informations client : nom, email, telephone.
10. Ajouter un code promo si necessaire.
11. Accepter les droits de diffusion et la charte.
12. Verifier le devis instantane dans le panneau de droite.
13. Valider la commande.

### Ce que fait l'application a ce moment-la

- preparation d'un upload signe si un fichier est necessaire
- upload du fichier dans le stockage local
- calcul du prix
- creation de la commande
- si Stripe est configure : redirection vers Checkout Stripe
- sinon : validation immediate en mode simule

### Suivi de commande cote client

Une fois la commande creee, le client est redirige vers une page publique de suivi :

- `/{locale}/orders/{publicToken}`

Cette page permet de consulter :

- le statut de la commande
- l'ETA estimee
- la premiere diffusion planifiee
- la fenetre demandee
- les notifications emails generees par le systeme
- les slots de diffusion reserves
- le code promo emis en cas de rejet de moderation

## Utilisation admin

### Point d'entree admin

- `http://localhost:3000/admin`

### Ce que l'admin peut faire

#### Moderateur

- voir la file de moderation
- approuver un contenu
- rejeter un contenu avec motif

Effet de l'approbation :

- le statut passe a `approved_scheduled`
- le planning est recalcule
- des slots sont reserves
- une notification est ajoutee a la commande

Effet du rejet :

- le statut passe a `rejected_credit_issued`
- un voucher est cree automatiquement
- une notification de rejet et une notification voucher sont ajoutees

#### Ops admin

- recalculer manuellement le planning
- modifier les prix de base et les surcharges
- consulter les commandes recentes
- consulter les vouchers emis
- consulter le planning courant
- consulter le journal d'audit

### Regles de moderation implementees

- une commande payee arrive dans la file de moderation
- la moderation est humaine
- le moderateur peut seulement approuver ou rejeter
- en cas de rejet, un code promo est emis

## Utilisation du player / ecran geant

### Point d'entree player

- `http://localhost:3000/player`

### Fonctionnement

Le player :

- interroge regulierement le feed via `/api/player/feed`
- envoie des heartbeats via `/api/player/heartbeat`
- affiche le media actif si un slot est en cours
- affiche le prochain contenu en attente si disponible
- passe sur un ecran de fallback si aucun contenu n'est pret

## Mode de paiement

## Avec Stripe

Si Stripe est configure :

- la commande cree une session Checkout
- le client est redirige vers Stripe
- le webhook `/api/stripe/webhook` confirme le paiement
- la commande passe ensuite en attente de moderation

## Sans Stripe

Si Stripe n'est pas configure :

- la commande est marquee comme payee en simulation
- cela permet de tester tout le tunnel localement
- la moderation et le scheduling restent pleinement fonctionnels

## Regles metier importantes

- les videos sont diffusees sans audio
- le prix depend du type de media, de la duree, de la repetition, du creneau et de l'occupation
- le scheduling respecte la fenetre demandee et evite les conflits de slots
- l'ordre de planification privilegie les commandes approuvees puis payees les plus anciennes
- les vouchers peuvent etre appliques au moment du devis et de la commande

## Tests actuellement presents

Tests unitaires inclus :

- moteur de pricing
- scheduler sans chevauchement de slots
- emission de voucher lors d'un rejet de moderation

Execution :

```bash
npm run test
```

## Limites actuelles de l'implementation

- pas d'authentification forte sur la route `/admin`
- persistance locale JSON en runtime au lieu de PostgreSQL branche
- stockage local des fichiers au lieu d'un vrai bucket S3-compatible
- pas de worker de jobs dedie en runtime pour le moment
- mode paiement simule par defaut tant que Stripe n'est pas configure

## URLs utiles en developpement

- accueil client : `http://localhost:3000/fr`
- commande client : `http://localhost:3000/fr/submit`
- admin moderation : `http://localhost:3000/admin`
- player : `http://localhost:3000/player`

## Fichiers cles

- `src/components/submission-flow.tsx` : parcours client
- `src/app/admin/page.tsx` : interface admin
- `src/components/player-surface.tsx` : rendu player
- `src/lib/workflow.ts` : orchestration des etats de commande
- `src/lib/pricing.ts` : calcul du devis
- `src/lib/scheduler.ts` : reservation des slots
- `src/lib/store.ts` : persistance locale JSON
- `prisma/schema.prisma` : schema cible PostgreSQL