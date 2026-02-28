# FarmPro - Farmer-to-Buyer Marketplace Platform

## Overview

FarmPro v2.0 is a comprehensive digital marketplace platform that connects local farmers in developing regions with international buyers. Farmers can sell agricultural products (coffee, cocoa, yams, plantain, corn, etc.) and purchase farming equipment and supplies (fertilizers, tools, seeds, pesticides, irrigation systems).

### Key Features:
- **Multi-role Marketplace**: Support for buyers, local farmers (sellers), and farm supply sellers
- **Product Catalog**: Browse farm products and farm items with search and filter capabilities
- **Listings Management**: Farmers create and manage product listings with pricing and inventory
- **Order System**: Buyers place orders with automatic inventory management
- **User Profiles**: Registration and profile management for different user types
- **Reviews & Ratings**: Community trust building through reviews
- **Messaging**: Direct communication between buyers and sellers
- **Dashboard & Analytics**: Marketplace statistics and user dashboards

This repository also demonstrates full-stack deployment using Docker, GitHub Actions CI/CD, Kubernetes, Terraform, and Ansible.

Files:
- `Dockerfile` - Nginx image serving React frontend
- `nginx/nginx.conf` - Nginx configuration
- `backend/` - Node.js Express API + SQLite
- `frontend/` - React marketplace UI
- `.github/workflows/ci.yml` - GitHub Actions workflow
- `k8s/`, `helm/`, `terraform/`, `ansible/` - Infrastructure files
- `docker-compose.yml` - Local development with Docker Compose

## Marketplace API Endpoints

### Users
- `POST /api/users/register` - Register new account (farmer, buyer, seller)
- `GET /api/users/:id` - Get user profile
- `GET /api/users` - List all users
- `GET /api/users/role/seller` - List all sellers
- `PUT /api/users/:id` - Update user profile

### Products & Catalog
- `GET /api/categories` - List all categories
- `POST /api/categories` - Create new category
- `GET /api/products` - List products (filterable by type/category)
- `POST /api/products` - Add new farm product to catalog
- `GET /api/products/:id` - Get product details

### Listings
- `POST /api/listings` - Create product listing (sellers)
- `GET /api/listings` - Browse active listings (searchable)
- `GET /api/listings/:id` - Get listing details
- `PUT /api/listings/:id` - Update listing

### Orders
- `POST /api/orders` - Create order (buyer)
- `GET /api/orders` - Get user's orders
- `PUT /api/orders/:id` - Update order status

### Reviews & Ratings
- `POST /api/reviews` - Add review to order
- `GET /api/reviews/user/:user_id` - Get user reviews

### Wishlist
- `POST /api/favorites` - Add to wishlist
- `GET /api/favorites/:user_id` - Get wishlist

### Messaging
- `POST /api/messages` - Send message
- `GET /api/messages/:user_id` - Get user messages

### Stats
- `GET /api/stats/marketplace` - Marketplace statistics

## Default Products & Categories

The system comes pre-seeded with common farm products and items:

**Farm Products (for farmers to sell):**
- Coffee (Arabica, Robusta)
- Cocoa (beans, powder)
- Yams, Plantain, Corn, Rice
- Vegetables, Fruits

**Farm Items (for buyers to purchase):**
- Fertilizers (NPK, Organic)
- Tools (Hoe, Spade, Machete, Watering Can)
- Seeds (Corn, Rice)
- Pesticides, Irrigation Equipment

New products and categories can be added dynamically via the API.

## Getting Started

### Local Development

1. **Start with Docker Compose:**
```bash
cd /path/to/FARMPRO
docker-compose up -d
```
This starts:
- Backend API on `localhost:3000`
- Frontend on `localhost:3001` 

2. **Or run manually:**
```bash
#Terminal 1: Backend
cd backend
npm install
npm start

# Terminal 2: Frontend
cd frontend
npm install
npm start
```

3. **Access the marketplace:**
   - Frontend: http://localhost:3001 (or http://localhost:3000 if through nginx)
   - Backend API: http://localhost:3000/api

## Frontend Features

The React UI provides a complete marketplace experience:

### For Buyers:
- **Browse Products**: Search and filter farm products and items
- **Shopping Cart**: Add items and checkout  
- **Order Management**: Track orders and status
- **User Profile**: Registration and account management

### For Farmers & Sellers:
- **Create Listings**: Post farm products with pricing and quantity
- **Inventory**: Manage available stock
- **Sales Dashboard**: View and manage orders from buyers
- **Profile**: Build trust with ratings and reviews

## Tech Stack

- **Backend**: Node.js + Express + SQLite
- **Frontend**: React 18
- **Database**: SQLite (see `backend/db.js`)
- **Containerization**: Docker
- **Orchestration**: Docker Compose, Kubernetes (Helm)
- **CI/CD**: GitHub Actions
- **IaC**: Terraform, Ansible

## Production Deployment

### Docker Build (Local):
```bash
docker build -t farmpro-frontend -f Dockerfile .
docker run --rm -p 80:80 farmpro-frontend
```

### CI/CD via GitHub Actions:
The `.github/workflows/ci.yml` automatically:
- Builds frontend & backend
- Creates Docker images
- Runs smoke tests
- Pushes to Docker registry (if configured)

Set secrets in GitHub:
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

### Kubernetes Deployment:
```bash
helm install farmpro ./helm/farmpro --namespace default
```

### Terraform (AWS ECR):
```bash
cd terraform
terraform init
terraform apply
```

### Ansible Deployment:
```bash
ansible-playbook -i inventory ansible/deploy.yml
```
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
