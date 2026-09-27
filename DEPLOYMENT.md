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

La base est vide : on crée le schéma **une seule fois** avec la synchro TypeORM.

```bash
# 1) Premier lancement AVEC création du schéma
DB_SYNCHRONIZE=true docker compose -f docker-compose.prod.yml up -d --build

# 2) Vérifier que tout est "healthy" (attendre ~1 min)
docker compose -f docker-compose.prod.yml ps

# 3) IMPORTANT : re-lancer SANS la synchro (sécurité des données)
#    (DB_SYNCHRONIZE=false est déjà la valeur par défaut du .env)
docker compose -f docker-compose.prod.yml up -d
```

> ⚠️ Laissez ensuite `DB_SYNCHRONIZE=false`. Ne le remettez jamais à `true`
> sur une base contenant des données réelles (risque de perte). Pour les
> évolutions futures du schéma, on mettra en place des **migrations TypeORM**
> (voir §7).

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

## 7. À prévoir ensuite (recommandé)

- **Migrations TypeORM** : générer une migration initiale puis gérer le schéma
  par migrations (`npm run migration:generate` / `migration:run`) au lieu de la
  synchro — indispensable dès qu'il y a des données réelles.
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
