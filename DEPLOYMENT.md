# Deploying 100BID to AWS (EC2 + ECR + Aurora PostgreSQL)

This walks through the exact path you described: build the frontend and
backend Docker images on your local machine, push them to ECR, then pull and
run them on a single `t3.small` EC2 instance, backed by Aurora PostgreSQL.

Architecture:

```
                        ┌─────────────────────────┐
Internet ── DNS ──────▶ │  EC2 t3.small            │
                        │  ┌────────┐              │
  :443/:80 ──────────▶  │  │ Caddy  │ (TLS, auto)  │
                        │  └───┬────┘              │
                        │      ├─▶ frontend :3000   │
                        │      └─▶ backend  :4000 ──┼──▶ Aurora PostgreSQL
                        └─────────────────────────┘        (private subnet)
```

Caddy handles HTTPS termination and routes `/api/*` and `/uploads/*` to the
backend, everything else to the Next.js frontend — both containers stay on
the instance's internal Docker network and are never exposed directly.

Files this guide uses (already in the repo):

- `Dockerfile` (root) — frontend production image
- `backend/Dockerfile` — backend production image
- `deploy/docker-compose.prod.yml` — what runs on EC2
- `deploy/Caddyfile` — reverse proxy + automatic TLS config
- `deploy/backend.env.example`, `deploy/frontend.env.example` — env templates

---

## 0. Prerequisites

- AWS account with permissions to create RDS, EC2, ECR, IAM resources.
- AWS CLI v2 installed and configured locally (`aws configure`).
- Docker Desktop (or Docker Engine) running locally, with `buildx` (bundled
  with modern Docker Desktop).
- A domain you can point at the EC2 instance's IP (e.g. `100bid.lol`).
- An SSH key pair for EC2 (create one in the EC2 console if you don't have
  one, or `aws ec2 create-key-pair`).

Pick one AWS region for everything below and stick to it — this guide uses
`us-east-1` in examples; swap for your region throughout.

---

## Part 1 — Aurora PostgreSQL

1. RDS console → **Create database**.
2. Engine type: **Aurora (PostgreSQL Compatible)**.
3. Templates: **Dev/Test** (cheapest — switch to Production later if needed).
4. Engine version: latest Aurora PostgreSQL 16.x.
5. DB cluster identifier: `100bid-db`.
6. Master username: `100biduser`; auto-generate and save the password (or
   set your own — you'll need it for `DATABASE_URL` shortly).
7. Instance configuration: **Serverless v2** is the easiest choice for a
   single small app — set min ACU 0.5, max ACU 2 (adjust later based on
   load). A `db.t4g.medium` provisioned instance also works if you'd rather
   have a fixed cost.
8. Connectivity:
   - VPC: choose (or create) one VPC — you'll launch the EC2 instance into
     this same VPC.
   - **Public access: No.** The database should never be reachable from the
     internet directly.
   - VPC security group: create new, name it `100bid-db-sg` — leave it empty
     for now, you'll add a rule after the EC2 security group exists (Part 4).
9. Additional configuration: initial database name `100bid`.
10. Create database. This takes several minutes. Note the **cluster
    endpoint** (writer endpoint) once it's available — it looks like
    `100bid-db.cluster-xxxxxxxxxxxx.us-east-1.rds.amazonaws.com`.

You'll build the full `DATABASE_URL` in Part 6:

```
postgresql://100biduser:<PASSWORD>@<CLUSTER_ENDPOINT>:5432/100bid?schema=public&sslmode=require
```

---

## Part 2 — ECR repositories

Create two private repositories, one per image:

```bash
aws ecr create-repository --repository-name 100bid-backend  --region us-east-1
aws ecr create-repository --repository-name 100bid-frontend --region us-east-1
```

Note your account ID for the image URIs:

```bash
aws sts get-caller-identity --query Account --output text
```

Your image URIs will be:

```
<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/100bid-backend
<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/100bid-frontend
```

---

## Part 3 — Build & push images (local machine)

Authenticate Docker to ECR:

```bash
aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
```

**t3.small is x86_64**, not ARM — if you're building on an Apple Silicon Mac,
you must target `linux/amd64` explicitly or the container will fail to start
on EC2.

Backend:

```bash
cd backend
docker buildx build --platform linux/amd64 \
  -t <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/100bid-backend:latest \
  --push .
cd ..
```

Frontend — note the `--build-arg`s, this is the step people miss.
`NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_DATAFAST_WEBSITE_ID` are compiled into
the JS bundle at build time, so they must be their real values here, not
`localhost` or left unset. If you change either one later, you must rebuild
and re-push the image — editing `frontend.env` on the EC2 host alone has no
effect on these:

```bash
docker buildx build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL=https://yourdomain.com/api \
  --build-arg NEXT_PUBLIC_DATAFAST_WEBSITE_ID=your-datafast-website-id \
  -t <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/100bid-frontend:latest \
  --push .
```

(`--push` uploads straight to ECR after the build. Drop it and run a
separate `docker push ...` if you want to inspect the image locally first.)

---

## Part 4 — Launch the EC2 instance

1. EC2 console → **Launch instance**.
2. Name: `100bid-app`.
3. AMI: **Amazon Linux 2023**.
4. Instance type: **t3.small**.
5. Key pair: select the one from Part 0.
6. Network settings:
   - VPC: **the same VPC as Aurora**.
   - Subnet: a **public** subnet (needs a route to an internet gateway so
     Caddy can reach Let's Encrypt and you can SSH in).
   - Auto-assign public IP: **Enable** (you'll replace it with an Elastic IP
     next).
   - Security group — create new, `100bid-ec2-sg`, with:
     - SSH (22) — source: **your IP only**, not `0.0.0.0/0`.
     - HTTP (80) — source: `0.0.0.0/0` (needed for Let's Encrypt's HTTP
       challenge and to redirect to HTTPS).
     - HTTPS (443) — source: `0.0.0.0/0`.
7. Storage: 20–30 GiB gp3 (default 8 GiB is tight once you have two images
   plus Docker's layer cache).
8. **Advanced details → IAM instance profile**: create/attach a role with
   the `AmazonEC2ContainerRegistryReadOnly` managed policy. This lets the
   instance pull from ECR without you ever putting AWS access keys on the
   box.
9. Launch.

Then:

- **Allocate an Elastic IP** (EC2 console → Elastic IPs) and associate it
  with this instance, so the IP survives stop/start and reboots.
- **Point DNS at it**: create an A record for `yourdomain.com` (and `www`)
  → the Elastic IP.
- **Open up the database**: go back to the `100bid-db-sg` security group
  from Part 1 and add an inbound rule — Type: PostgreSQL (5432), Source:
  the `100bid-ec2-sg` security group (not an IP/CIDR — referencing the SG
  means only this instance can reach Aurora, regardless of its IP).

---

## Part 5 — Install Docker on EC2

SSH in:

```bash
ssh -i /path/to/your-key.pem ec2-user@<ELASTIC_IP>
```

Install Docker + Compose plugin:

```bash
sudo dnf update -y
sudo dnf install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
# Log out and back in for the group change to take effect:
exit
```

```bash
ssh -i /path/to/your-key.pem ec2-user@<ELASTIC_IP>

# Compose v2 plugin (Amazon Linux 2023's dnf package doesn't include it)
mkdir -p ~/.docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o ~/.docker/cli-plugins/docker-compose
chmod +x ~/.docker/cli-plugins/docker-compose
docker compose version
```

Authenticate Docker to ECR using the instance's IAM role (no keys needed):

```bash
aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
```

---

## Part 6 — Deploy

From your **local machine**, copy the deploy folder to the instance:

```bash
scp -i /path/to/your-key.pem -r deploy ec2-user@<ELASTIC_IP>:~/100bid-deploy
```

Back on the **EC2 instance**:

```bash
cd ~/100bid-deploy
cp backend.env.example backend.env
cp frontend.env.example frontend.env
nano Caddyfile          # replace yourdomain.com with your real domain
nano backend.env        # fill in DATABASE_URL, DODO_*, EMAIL_*, etc.
```

Fill in `backend.env`'s `DATABASE_URL` with the Aurora endpoint + password
from Part 1:

```
DATABASE_URL=postgresql://100biduser:<PASSWORD>@100bid-db.cluster-xxxxxxxxxxxx.us-east-1.rds.amazonaws.com:5432/100bid?schema=public&sslmode=require
```

Set the image references and start everything:

```bash
export BACKEND_IMAGE=<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/100bid-backend:latest
export FRONTEND_IMAGE=<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/100bid-frontend:latest

docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Run the database migrations (once, and again after any schema change) —
against the **already-running** backend container, which can reach Aurora
because it's in the same VPC:

```bash
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

Check everything's healthy:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f caddy
```

The first request to your domain will take a few extra seconds while Caddy
requests its Let's Encrypt certificate.

---

## Part 7 — Verify

- `https://yourdomain.com` — the wall should load.
- `https://yourdomain.com/api/health` won't exist (health is unprefixed) —
  check `https://yourdomain.com` via the frontend, and from the EC2 host:
  `curl http://localhost:4000/health` should return `{"status":"ok"}`.
- Claim a spot end to end with a real (or Dodo test-mode) payment.
- `docker compose -f docker-compose.prod.yml exec backend ls uploads` — any
  uploaded images should persist there across `docker compose restart`.

---

## Part 8 — Update the Dodo webhook

Your webhook URL changes from a tunnel/LAN address to your real domain now:

```
https://yourdomain.com/api/payments/webhook
```

Update this in the Dodo dashboard (Developer → Webhooks) and switch
`DODO_MODE=live` + a live `DODO_API_KEY`/`DODO_WEBHOOK_SECRET`/
`DODO_PRODUCT_ID` in `backend.env` once you're out of test mode, then:

```bash
docker compose -f docker-compose.prod.yml up -d backend
```

---

## Redeploying after code changes

Locally, rebuild and push the image(s) that changed (same commands as Part
3, same tags), then on EC2:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

If the change included a Prisma schema migration, run
`docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy`
again after the new backend container is up.

Consider tagging images with a version or git SHA instead of always
`:latest` once this is past the initial setup — makes rollback a one-line
`docker compose up -d` after just changing the tag.

---

## Troubleshooting

- **Caddy won't get a certificate**: confirm the DNS A record already
  resolves to the Elastic IP (`dig yourdomain.com`) and that port 80 is open
  in the security group — the HTTP-01 challenge needs it even though you're
  serving HTTPS.
- **Backend can't reach the database**: double check the `100bid-db-sg`
  inbound rule references the EC2 security group (not a CIDR), and that
  both are in the same VPC.
- **`docker: no matching manifest for linux/amd64`**: you built without
  `--platform linux/amd64` on an ARM machine — rebuild with it.
- **Frontend calls the wrong API URL**: `NEXT_PUBLIC_API_URL` is baked in at
  `docker build` time — editing `frontend.env` on the host does nothing;
  rebuild and re-push the frontend image with the correct `--build-arg`.
- **Disk filling up**: `docker image prune -f` on the EC2 host after a few
  redeploys — old layers accumulate.

## Cost note

Rough monthly order of magnitude (us-east-1, on-demand, will vary): t3.small
~$15, Aurora Serverless v2 at 0.5–2 ACU ~$45–90 depending on usage, Elastic
IP is free while attached to a running instance, 20 GiB gp3 storage ~$2. Not
a quote — check the AWS Pricing Calculator for current numbers in your
region before committing.
