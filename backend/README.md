# FarmPro Backend

Minimal Node.js Express backend used for demo and CI/CD testing.

Run locally:

```bash
cd backend
npm install
npm start
```

Docker build:

```bash
docker build -t farmpro-backend:local -f backend/Dockerfile .
docker run -p 3000:3000 farmpro-backend:local
```
