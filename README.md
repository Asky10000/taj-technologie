# TAJ Technologie — ERP/CRM

Application de gestion (ERP/CRM) full-stack : CRM, catalogue produits, stock,
ventes (devis / commandes / factures), fournisseurs, tickets, projets et
rapports.

- **Backend** — [NestJS 10](https://nestjs.com/) · TypeORM 0.3 · PostgreSQL · Redis · JWT · Swagger
- **Frontend** — [Next.js 15](https://nextjs.org/) (App Router) · React 18 · TanStack Query · Zustand · React Hook Form + Zod · Tailwind · Radix UI · Recharts
- **Infra** — Docker Compose · Caddy (reverse proxy + HTTPS automatique) · Nginx

Pour la mise en production, voir [`DEPLOYMENT.md`](./DEPLOYMENT.md).

---

## Structure du dépôt

```
.
├── backend/              API NestJS
│   └── src/
│       ├── common/       Filtres, interceptors, pipes, pagination
│       ├── config/       Configuration (app, db, jwt, redis, throttler)
│       ├── database/     DataSource, migrations, seeders, subscribers
│       ├── health/       Endpoint de santé
│       └── modules/      auth, users, crm, products, inventory, sales,
│                         suppliers, tickets, projects, reports
├── frontend/             Application Next.js (App Router)
│   └── src/
│       ├── app/          Routes : (auth) et (dashboard)
│       ├── components/   UI, layout, modules métier
│       ├── hooks/        Hooks TanStack Query par domaine
│       ├── lib/          Client API (axios), utilitaires
│       ├── stores/       État global (Zustand)
│       └── types/        Types TypeScript partagés
├── nginx/                Config Nginx
├── Caddyfile             Reverse proxy + TLS (production)
├── docker-compose.yml        Pile de développement
└── docker-compose.prod.yml   Pile de production
```

---

## Prérequis

- **Node.js** ≥ 20 et **npm** ≥ 10
- **PostgreSQL** 14+ et **Redis** 6+ (ou via Docker, voir plus bas)

---

## Démarrage rapide (Docker)

La pile de développement lance PostgreSQL, Redis, le backend et le frontend :

```bash
cp .env.example .env        # ajustez les valeurs si besoin
docker compose up --build
```

- Frontend : http://localhost:3000
- API : http://localhost:3001/api/v1
- Swagger (hors production) : http://localhost:3001/api/docs

---

## Démarrage manuel (sans Docker)

### Backend

```bash
cd backend
cp .env.example .env         # renseignez la connexion DB/Redis et les secrets JWT
npm install
npm run start:dev            # API sur le port 3001
```

Scripts utiles :

| Commande                     | Rôle                                      |
| ---------------------------- | ----------------------------------------- |
| `npm run start:dev`          | API en watch                              |
| `npm run build`              | Build de production                       |
| `npm test`                   | Tests unitaires (Jest)                    |
| `npm run test:cov`           | Tests + couverture                        |
| `npm run migration:run`      | Applique les migrations                   |
| `npm run migration:generate` | Génère une migration depuis les entités   |
| `npm run seed`               | Exécute les seeders                       |

### Frontend

```bash
cd frontend
npm install
npm run dev                  # http://localhost:3000
```

| Commande            | Rôle                        |
| ------------------- | --------------------------- |
| `npm run dev`       | Serveur de dev (port 3000)  |
| `npm run build`     | Build de production         |
| `npm run lint`      | ESLint                      |
| `npm run type-check`| Vérification TypeScript     |

---

## Variables d'environnement

- `backend/.env.example` — variables du backend (DB, Redis, JWT, seed admin).
- `.env.example` — pile Docker de développement.
- `.env.production.example` — pile Docker de production (domaine, TLS, secrets).

> ⚠️ Ne committez jamais de `.env` réel. Générez les secrets JWT avec
> `openssl rand -hex 64`.

---

## Base de données : schéma & migrations

Le schéma est géré par des **migrations TypeORM**
(`backend/src/database/migrations/`) :

- `InitialSchema` — extensions PostgreSQL (`uuid-ossp`, `pgcrypto`, `citext`).
- `BaselineSchema` — l'ensemble des tables et types enum (les 24 tables).

Comportement selon `DB_SYNCHRONIZE` (voir `backend/src/database/database.module.ts`) :

- **Production** (`DB_SYNCHRONIZE=false`) : les migrations en attente sont
  appliquées **automatiquement au démarrage** du backend (`migrationsRun`).
  Un déploiement sur base vide crée donc tout le schéma, sans `synchronize`.
- **Développement** (`DB_SYNCHRONIZE=true`, défaut) : `synchronize` gère le
  schéma depuis les entités (pratique pour itérer) ; `migrationsRun` est alors
  désactivé pour éviter les conflits.

⚠️ Ne jamais mettre `DB_SYNCHRONIZE=true` sur une base de production contenant
des données (risque d'altération/perte).

**Faire évoluer le schéma** après avoir modifié une entité :

```bash
cd backend
# base de dev à jour, puis générer la migration depuis les entités :
npm run migration:generate -- src/database/migrations/NomDeLaMigration
# vérifier le SQL généré, puis committer le fichier
```

En production, la migration s'applique seule au redémarrage du backend
(`git pull` + rebuild). Voir `DEPLOYMENT.md` §7 (dont la procédure pour
**baseliner** une base déjà créée par `synchronize`).

---

## Sécurité

- Authentification JWT (access + refresh), rôles et guards côté backend.
- `helmet`, compression, CORS restreint, rate-limiting (`@nestjs/throttler`)
  derrière le reverse proxy (`trust proxy`).
- Les champs sensibles (ex. `passwordHash`) sont masqués via
  `ClassSerializerInterceptor`.
- **Next.js** est épinglé à une version corrigeant les failles RSC de 2025
  (CVE-2025-66478 / CVE-2025-55182) — gardez-le à jour.

---

## Tests

```bash
cd backend && npm test        # Jest
```

Les tests unitaires couvrent notamment le calcul des documents de vente
(`sales-calculator.service.spec.ts`). La couverture reste à étendre aux autres
services critiques (factures, mouvements de stock).
