# MindBridge AI

AI-powered mental health companion — Django backend + React frontend.

## Deployment: Render (free, no credit card)

```
GitHub push → Render auto-deploys
  ├── mindbridge-api      (Django REST API)
  └── mindbridge-frontend (React SPA)
Both use Neon PostgreSQL as database.
```

## Live URLs (after deploy)
- **Frontend**: https://mindbridge-frontend.onrender.com
- **API**:      https://mindbridge-api.onrender.com/api/v1/
- **API Docs**: https://mindbridge-api.onrender.com/api/v1/docs/

## Deploy in 3 steps

### Step 1 — Sign up at Render
Go to **[render.com](https://render.com)** → Sign up with GitHub (free)

### Step 2 — Create Blueprint
- Click **New** → **Blueprint**
- Connect repo: `kansiime/MindBridge`
- Render reads `render.yaml` automatically and creates both services

### Step 3 — Add environment variables
In Render dashboard → `mindbridge-api` service → **Environment**:

| Variable | Value |
|---|---|
| `SECRET_KEY` | your Django secret key |
| `DB_NAME` | `Mindbrigdeai` |
| `DB_USER` | `noelkansiime` |
| `DB_PASSWORD` | your Neon password |
| `DB_HOST` | `ep-polished-hall-a53xyenl-pooler.us-east-2.aws.neon.tech` |
| `ANTHROPIC_API_KEY` | your Anthropic key |

Click **Save** — Render deploys automatically. Done!

## Project Structure
```
MindBridge/
├── functions/          ← Django REST API
│   ├── config/         ← settings, urls, wsgi
│   ├── users/          ← auth, roles (user/therapist/admin)
│   ├── chat/           ← sessions, messages, mood tracking
│   ├── modules/        ← 10 mental health modules config
│   ├── scanner/        ← face mood scan (Claude Vision)
│   └── requirements.txt
├── frontend/           ← React SPA
│   ├── src/
│   │   ├── App.jsx     ← full MindBridge UI
│   │   └── api.js      ← typed API client
│   └── package.json
├── render.yaml         ← Render deployment blueprint
└── .github/workflows/  ← CI (lint + test on every push)
```

## Why Render instead of Firebase Functions?
Firebase Functions requires the **Blaze (paid) plan**.
Render is **completely free** with no credit card required.

## Local Development
```bash
# Backend (terminal 1)
cd functions
pip install -r requirements.txt
python manage.py runserver

# Frontend (terminal 2)
cd frontend
npm install
npm start    # proxies /api/v1/* to localhost:8000
```

## Roles: `user` · `therapist` · `admin`

> Not a replacement for professional care. Crisis: call or text **988**.
