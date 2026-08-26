#!/usr/bin/env bash
# Tagzheimer deploy script — interactive picker for deployment targets.
#
# Supports:
#   1) Local Docker stack (mongo + backend + frontend)
#   2) Fly.io
#   3) Railway
#   4) Render
#   5) Vercel (frontend only) + backend anywhere
#   6) Build only — exit with instructions
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "Tagzheimer Deployment"
echo "===================="
echo ""
echo "Choose a deployment target:"
echo ""
echo "  1) Local Docker stack      (mongo + backend + frontend via docker-compose)"
echo "  2) Fly.io                   (backend + frontend + separate Mongo)"
echo "  3) Railway                  (backend + frontend + separate Mongo)"
echo "  4) Render                   (backend + frontend + separate Mongo)"
echo "  5) Vercel (frontend) + any  (split deployment — frontend on Vercel, backend anywhere)"
echo "  6) Build only — produce dist/ + APK, exit"
echo "  7) Exit"
echo ""
read -rp "Pick 1-7: " choice
echo ""

case "$choice" in
  1)
    echo "→ Local Docker stack"
    if [ ! -f .env ]; then
      echo "  No .env file found. Copying from .env.example..."
      cp .env.example .env
      JWT=$(openssl rand -hex 32 2>/dev/null || echo "change-me-$(date +%s)")
      sed -i.bak "s/^JWT_SECRET=$/JWT_SECRET=$JWT/" .env && rm -f .env.bak
      echo "  ✓ .env created with a generated JWT_SECRET"
      echo "  ✓ Edit .env to set Firebase creds / Mongo password before going to prod"
    fi
    docker compose up -d --build
    echo ""
    echo "✓ Stack is up:"
    echo "  Frontend: http://localhost:8080"
    echo "  Backend:  http://localhost:5000/api/health"
    echo "  MongoDB:  mongodb://localhost:27017"
    echo ""
    echo "  To stop: docker compose down"
    echo "  To wipe:  docker compose down -v  (DESTROYS Mongo data)"
    ;;

  2)
    echo "→ Fly.io"
    echo "Prerequisites:"
    echo "  - fly CLI installed:   curl -L https://fly.io/fly-install.sh | sh"
    echo "  - fly auth login"
    echo ""
    echo "Steps:"
    echo "  1) Create the backend app:"
    echo "     fly launch --no-deploy --name tagzheimer-backend"
    echo "  2) Set secrets:"
    echo "     fly secrets set JWT_SECRET=\$(openssl rand -hex 32)"
    echo "     fly secrets set MONGO_URI=mongodb+srv://...   # use MongoDB Atlas or fly mongo"
    echo "     # Firebase vars as needed"
    echo "  3) Deploy:"
    echo "     fly deploy"
    echo ""
    echo "  4) For the frontend — deploy to Vercel or Netlify (option 5 below),"
    echo "     set VITE_API_URL=https://tagzheimer-backend.fly.dev"
    ;;

  3)
    echo "→ Railway"
    echo "Prerequisites:"
    echo "  - Railway CLI:   npm install -g @railway/cli"
    echo "  - railway login"
    echo ""
    echo "Steps:"
    echo "  1) railway init    (creates a new project)"
    echo "  2) Add MongoDB:    railway add --plugin mongodb"
    echo "  3) Set backend env vars (Variables tab in dashboard):"
    echo "     JWT_SECRET=<random>"
    echo "     MONGO_URI=<from Railway Mongo plugin>"
    echo "     CLIENT_URL=https://<your-frontend-url>"
    echo "  4) Deploy: railway up"
    ;;

  4)
    echo "→ Render"
    echo "Prerequisites:"
    echo "  - Render account (render.com)"
    echo "  - GitHub repo connected to Render"
    echo ""
    echo "Steps:"
    echo "  1) Create a new Web Service → backend/Dockerfile"
    echo "  2) Set env vars (Render → Environment):"
    echo "     JWT_SECRET=<random>"
    echo "     MONGO_URI=<Render MongoDB connection string>"
    echo "     CLIENT_URL=https://<your-frontend-url>"
    echo "  3) Create a Static Site → frontend/Dockerfile"
    echo "  4) Build arg: VITE_API_URL=https://<your-backend>.onrender.com"
    ;;

  5)
    echo "→ Vercel (frontend) + anywhere (backend)"
    echo ""
    echo "Frontend (Vercel):"
    echo "  1) Push repo to GitHub"
    echo "  2) vercel.com → New Project → import repo"
    echo "  3) Framework preset: Vite"
    echo "  4) Build command: npm run build"
    echo "  5) Output dir: dist"
    echo "  6) Root directory: frontend"
    echo "  7) Environment variables → VITE_API_URL=https://<your-backend-url>"
    echo ""
    echo "Backend (anywhere — Fly/Railway/Render/your own VPS):"
    echo "  See options 2/3/4 above."
    ;;

  6)
    echo "→ Build only"
    echo "  Frontend:  cd frontend && npm install && npm run build  → dist/"
    echo "  Mobile:    cd mobile && npm install && npx expo export --platform android  → dist/"
    echo "  Mobile APK: cd mobile && eas build --platform android --profile preview"
    echo "  Backend:   cd backend && npm ci --omit=dev && node server.js"
    ;;

  7)
    echo "Bye!"
    exit 0
    ;;

  *)
    echo "Unknown choice: $choice"
    exit 1
    ;;
esac
