# Mise en ligne — TAJ Technologie (VPS + Docker + HTTPS)

Guide pas à pas pour déployer l'application en production sur un serveur Linux.
Tout est conteneurisé ; le proxy **Caddy** gère le HTTPS automatiquement (Let's Encrypt).

---

## 1. Ce qu'il faut acquérir

### a) Un VPS (serveur Linux)
- **Système** : Ubuntu 22.04 LTS (ou 24.04).
- **Taille recommandée** : 2 vCPU / 4 Go RAM / 40–80 Go SSD (suffisant pour démarrer).
- **Fournisseurs** : Hetzner (~5–8 €/mois), DigitalOcean, OVH, Contabo, Scaleway.
- Notez l'**adresse IP publique** du serveur.

### b) Un nom de domaine
- Chez OVH, Namecheap, Gandi, Cloudflare… (~10 €/an).
- Créez un enregistrement **DNS de type A** :
  - `erp.votre-domaine.com` → **IP publique du VPS**
  - (ou le domaine racine `votre-domaine.com` → IP)
- Attendez la propagation DNS (quelques minutes à 1 h). Vérifiez : `ping erp.votre-domaine.com`.

### c) Ouvrir les ports
Sur le pare-feu du VPS, autorisez **22 (SSH)**, **80 (HTTP)**, **443 (HTTPS)** :
```bash
sudo ufw allow 22 && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
```

---

## 2. Préparer le serveur

Connexion : `ssh root@IP_DU_VPS`

Installer Docker + Compose :
```bash
curl -fsSL https://get.docker.com | sh
sudo systemctl enable --now docker
```

Récupérer le code (via Git, ou `scp` depuis votre machine) dans `/opt/taj` :
```bash
mkdir -p /opt/taj && cd /opt/taj
# git clone <votre-repo> .    (ou copiez le dossier du projet ici)
```

---

## 3. Configurer les secrets

```bash
cp .env.production.example .env
nano .env
```
Remplissez **toutes** les valeurs. Générez les secrets JWT :
```bash
openssl rand -hex 64   # à coller dans JWT_SECRET
openssl rand -hex 64   # à coller dans JWT_REFRESH_SECRET
```
Points importants :
- `DOMAIN` = votre domaine **sans** `https://` (ex. `erp.votre-domaine.com`).
- `ACME_EMAIL` = votre email (avis d'expiration Let's Encrypt).
- Mots de passe DB / Redis / admin : longs et uniques.

---

## 4. Premier démarrage (création du schéma)

Le schéma est géré par des **migrations TypeORM**. Avec `DB_SYNCHRONIZE=false`
(valeur par défaut du `.env`), le backend applique automatiquement les
migrations en attente **à chaque démarrage** (`migrationsRun`). Sur une base
vide, la migration `InitialSchema` (extensions) puis `BaselineSchema` (tables)
créent donc tout le schéma, sans intervention.

```bash
# Build + démarrage (le schéma est créé par les migrations)
docker compose -f docker-compose.prod.yml up -d --build

# Vérifier que tout est "healthy" (attendre ~1 min)
docker compose -f docker-compose.prod.yml ps
```

> ⚠️ Laissez `DB_SYNCHRONIZE=false` en production. Ne le mettez **jamais** à
> `true` sur une base contenant des données (risque de perte). Toute évolution
> de schéma passe désormais par une migration (voir §7).

Caddy obtient automatiquement le certificat HTTPS au premier accès au domaine.

---

## 5. Vérifier

- Ouvrez **https://votre-domaine.com** → page de connexion (cadenas HTTPS valide).
- Connectez-vous avec `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` du `.env`.
- Santé API : `curl https://votre-domaine.com/api/v1/health` → `{"status":"ok"}`.

---

## 6. Exploitation courante

```bash
# Voir les logs
docker compose -f docker-compose.prod.yml logs -f backend

# Mettre à jour après un changement de code
git pull
docker compose -f docker-compose.prod.yml up -d --build

# Arrêter / redémarrer
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

### Sauvegarde de la base (à automatiser via cron)
```bash
docker exec taj_postgres pg_dump -U "$DB_USERNAME" "$DB_NAME" \
  | gzip > /opt/taj/backups/taj_$(date +%F).sql.gz
```
Restauration :
```bash
gunzip -c backup.sql.gz | docker exec -i taj_postgres psql -U "$DB_USERNAME" "$DB_NAME"
```

---

## 7. Faire évoluer le schéma (migrations TypeORM)

Le schéma est versionné dans `backend/src/database/migrations/`. Les migrations
en attente sont appliquées automatiquement au démarrage du backend
(`migrationsRun`, actif quand `DB_SYNCHRONIZE=false`).

**Créer une migration après avoir modifié une entité** (sur une machine de dev
avec une base à jour) :
```bash
cd backend
npm run migration:generate -- src/database/migrations/NomDeLaMigration
# vérifier le SQL généré, committer le fichier
```

**Déployer l'évolution** : `git pull` + `up -d --build` sur le VPS — la nouvelle
migration s'applique seule au redémarrage du backend. Pour l'exécuter à la main :
```bash
docker exec taj_backend node -e "require('./dist/database/data-source').default.initialize().then(d=>d.runMigrations())"
```

> **Baseliner une base déjà créée par `synchronize`** (cas d'une base existante
> avant la mise en place des migrations) : créer la table de suivi et y marquer
> les migrations déjà « appliquées » pour ne pas rejouer les `CREATE TABLE` :
> ```bash
> docker exec -i taj_postgres psql -U "$DB_USERNAME" "$DB_NAME" <<'SQL'
> CREATE TABLE IF NOT EXISTS migrations_history (
>   id SERIAL PRIMARY KEY, "timestamp" bigint NOT NULL, name varchar NOT NULL);
> INSERT INTO migrations_history ("timestamp", name) VALUES
>   (1700000000000, 'InitialSchema1700000000000'),
>   (1791639294742, 'BaselineSchema1791639294742');
> SQL
> ```

## 7 bis. À prévoir ensuite (recommandé)

- **Sauvegardes automatiques** (cron quotidien + copie hors-serveur).
- **Monitoring / alertes** (Uptime Kuma, healthchecks).
- **Swagger** : désactivé en production (NODE_ENV=production) — normal.

---

## Récapitulatif sécurité déjà en place
- HTTPS automatique (Caddy / Let's Encrypt) + en-têtes de sécurité (HSTS…).
- Postgres et Redis **non exposés** publiquement (réseau Docker interne only).
- Redis protégé par mot de passe ; JWT avec secrets dédiés.
- `passwordHash` exclu des réponses API (ClassSerializerInterceptor).
- CORS restreint au domaine de production.
- SSL DB piloté par `DB_SSL` (false pour le Postgres interne).
