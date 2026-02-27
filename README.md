# FarmPro - demo nginx Docker + CI/CD + infra skeleton
# FarmPro - demo nginx Docker + CI/CD + infra skeleton

This repository contains a minimal set of artifacts to build, test and deploy a Dockerized Nginx image for FarmPro and to demonstrate GitHub Actions and Jenkins pipelines, Kubernetes manifests, Terraform skeleton and an Ansible playbook.

Files added:
- `Dockerfile` - image build for nginx (demonstrates common Dockerfile instructions)
- `nginx/nginx.conf` - nginx configuration
- `static/`, `docs/` - sample site content
- `.github/workflows/ci.yml` - GitHub Actions workflow (build/push/smoke-test)
- `Jenkinsfile` - Jenkins pipeline example (build/push/deploy)
- `k8s/` - Kubernetes `Deployment` and `Service`
- `terraform/` - providers + ECR example
- `ansible/deploy.yml` - Ansible playbook to pull/run container

Quick local test:

1. Build image:
```bash
docker build -t farmpro:local -f Dockerfile .
```
2. Run container:
```bash
docker run --rm -p 8080:80 farmpro:local
# then open http://localhost:8080
```

CI notes:
- Set `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets in GitHub for the workflow to push images.
- Jenkins expects credentials with id `dockerhub` (username/password) and a kubeconfig available for the deploy stage.

Terraform notes:
- `terraform init` then `terraform apply` in the `terraform` folder will create an ECR repo (requires AWS credentials configured).

Ansible notes:
- The playbook uses `community.docker` modules and requires Python/Docker on hosts.

Additional components added:
- `backend/` - Node.js Express API + Dockerfile
- `frontend/` - React app skeleton (build copied into `static/` by CI)
- `helm/farmpro` - Helm chart to deploy frontend and backend to Kubernetes
- `android-app/` - Android (Kotlin) skeleton that can call the backend (use emulator or build in Android Studio)

CI update:
- GitHub Actions workflow now builds frontend, backend and the nginx image and copies production frontend build into `static/` before building the nginx image.

Local quickstart (dev):

1. Run backend locally:
```bash
cd backend
npm install
npm start
```

2. Run frontend locally (dev server):
```bash
cd frontend
npm install
npm start
```

Subscription / Payment integration (dev):

- Environment variables (backend): `PRICE_BASIC`, `PRICE_INTERNATIONAL`, `MTN_ACCOUNT`, `ORANGE_ACCOUNT`.  For testing you can use `MTN_ACCOUNT=675142175` (Regobert Atanga Ngwa Tangie) and, as supplied, `ORANGE_ACCOUNT=regobert2004` (replace with a real Orange mobile‑money number).
- Docker Hub credentials may be required for CI or manual pushes: set `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` (e.g. `regobert2004` and the provided token).
- To integrate Flutterwave (example) set: `FLW_SECRET_KEY`, `FLW_WEBHOOK_SECRET`.
- Admin token: `ADMIN_TOKEN` (used for `GET /api/admin/subscriptions`).
- Start dev environment (installs deps and launches backend + frontend):

```powershell
.\run-dev.ps1
```

Or using bash:

```bash
./run-dev.sh
```

Notes:
- Frontend dev server runs on port 3001 (see `frontend/.env`) and proxies API calls to the backend on port 3000.
- The backend exposes subscription endpoints:
	- `GET /api/subscriptions/plans` — list plans
	- `POST /api/subscriptions/create` — create subscription (body: `{ plan, customer: { name }, payment: { method, provider } }`)
	- `GET /api/subscriptions/verify/:id` — check subscription status
	- `POST /api/subscriptions/webhook` — provider webhook to mark payment status (secured via `verif-hash` header)
	- `GET /api/admin/subscriptions` — admin list (requires header `x-admin-token: <ADMIN_TOKEN>`)

- Mobile money flow: choose `mobile_money` with provider `mtn` or `orange`. The backend will return `account` and `reference` to complete the payment manually (or integrate real provider APIs).
- Flutterwave/hosted flow: set `FLW_SECRET_KEY` and `FLW_WEBHOOK_SECRET`. The backend will create a Flutterwave payment link and store `tx_ref` as `farmpro_<subscriptionId>`; Flutterwave webhooks should be configured to call `/api/subscriptions/webhook` and include the webhook secret in the `verif-hash` header.

Docker Compose (dev):

Create a `.env` in repo root with `FLW_SECRET_KEY`, `FLW_WEBHOOK_SECRET`, `MTN_ACCOUNT`, `ORANGE_ACCOUNT`, and `ADMIN_TOKEN` then run:

```bash
docker compose up --build
```

This will start the backend on port `3000` and the frontend dev server on port `3001`. The backend uses SQLite and stores the DB at `backend/data/farmpro.db` (persisted to `./backend/data`).

Advertisement integrations
--------------------------

This project includes example wiring for advertising platforms. Current capabilities:

- Meta (Facebook / Instagram): basic example to create a campaign via the Graph Marketing API. Set the following env vars in the repo `.env` for full integration:
	- `META_ACCESS_TOKEN` — long-lived access token with `ads_management` permissions
	- `META_AD_ACCOUNT_ID` — your ad account numeric id (without `act_` prefix)

- Other platforms (Google Ads, Twitter/X, LinkedIn) are not fully implemented, but the backend stores ad records and can be extended to call those provider APIs.

API endpoints (ads):
- `POST /api/ads/create` — create an ad record and (if configured) attempt to create it on Meta. Body: `{ name, platform, objective, budget, payload }`.
- `GET /api/admin/ads` — list persisted ads (requires `x-admin-token: <ADMIN_TOKEN>` header).

Security & notes:
- Meta webhook/callbacks and billing should be configured within the provider console; this backend demonstrates campaign creation only. Creating full ad flows (adsets, creatives, billing) requires more provider-specific fields and approvals.
- For production integrations use server-side SDKs, store secrets securely (don't keep tokens in repo), and follow provider rate-limits.

3. Build everything and run locally with Docker:
```bash
# build backend
docker build -t farmpro-backend:local -f backend/Dockerfile backend
# build frontend (produce build outputs then copy into static/)
cd frontend && npm ci && npm run build && cd ..
rm -rf static/* || true
cp -r frontend/build/* static/
# build nginx image which serves frontend
docker build -t farmpro:local .
docker run -p 8080:80 farmpro:local
```
