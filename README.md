# MindBridge AI — Firebase Deployment

Django REST API + React frontend deployed entirely on Firebase.

## Architecture
```
Firebase Hosting  (/*)           → React SPA (public/)
Firebase Functions (/api/v1/*)   → Django API (functions/)
Neon PostgreSQL                  → Database
```

## One-time Setup (run locally)

### 1. Fix Firebase service account permissions
```bash
# Install gcloud CLI first: https://cloud.google.com/sdk/docs/install
gcloud auth login
bash scripts/fix_permissions.sh
```

### 2. Add GitHub Secrets
Go to: github.com/kansiime/MindBridge → Settings → Secrets → Actions

| Secret | Value |
|---|---|
| `SECRET_KEY` | Django secret key |
| `DB_NAME` | `Mindbrigdeai` |
| `DB_USER` | `noelkansiime` |
| `DB_PASSWORD` | Neon password |
| `DB_HOST` | `ep-polished-hall-a53xyenl-pooler.us-east-2.aws.neon.tech` |
| `ANTHROPIC_API_KEY` | Your Anthropic key |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin SDK JSON |

### 3. Push to main
```bash
git push origin main
# GitHub Actions handles everything automatically
```

## Live URLs
- Frontend: https://mindbridge-noel.web.app
- API: https://us-central1-mindbridge-noel.cloudfunctions.net/mindbridge/api/v1/
- Docs: https://us-central1-mindbridge-noel.cloudfunctions.net/mindbridge/api/v1/docs/

## Local Development
```bash
# Backend
cd functions
pip install -r requirements.txt
python manage.py runserver

# Frontend (separate terminal)
cd frontend
npm install
npm start   # proxies API calls to localhost:8000
```
