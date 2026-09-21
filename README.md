# DocTrack AI
> **Smart Multi-Profile Document Expiry & Renewal Management System**

DocTrack AI is an intelligent, multi-profile document compliance and expiry lifecycle management system. It enables individuals, families, and organizations to securely store, categorize, and track critical identity records, vehicular documents, property deeds, financial records, and appliance warranties with automated multi-channel renewal alerts.

### 🌐 Live Production Deployments
- **Frontend (Client)**: [https://doc-track-ai.vercel.app](https://doc-track-ai.vercel.app)
- **Backend (Server)**: [https://doctrack-ai.onrender.com](https://doctrack-ai.onrender.com)
- **API Health Check**: [https://doctrack-ai.onrender.com/api/health](https://doctrack-ai.onrender.com/api/health)

---

## 1. Project Overview
DocTrack AI solves the common problem of missed document renewals, expired statutory permits, and lapsed consumer warranties.
- **Smart Profiles**: Multi-profile vault separating personal identity, family members, vehicles, and contract staff.
- **Expiry Horizon Engine**: Standardized 180-day, 90-day, 30-day, 7-day, and 1-day threshold monitoring with grace period calculations.
- **Document Intelligence**: Intelligent OCR text extraction, 9-category taxonomy classification, sensitivity tagging (PII/High/Medium), and Gemini LLM analysis.
- **Warranty Tracker**: Dedicated warranty lifecycle manager tracking purchase invoices, coverage types, AMC contracts, and manufacturer claim procedures.
- **AI Renewal Assistant & Chatbot**: Conversational assistant grounded in statutory compliance checklists (Passport Seva, Parivahan RTO, UIDAI, Income Tax) and personal vault dates.
- **Multi-Channel Dispatcher**: Automated email notifications (Nodemailer), SMS alerts (Twilio), and in-app updates.
- **Local-First Resilience**: Seamless fallback to in-memory persistence and heuristic NLP when running offline or without cloud credentials.

---

## 2. System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                 DocTrack AI Client (Vite/React)             │
│            SPA with React Router & Dynamic Dark Theme       │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / REST (JWT Auth)
┌──────────────────────────────▼──────────────────────────────┐
│                DocTrack AI Server (Express/Node.js)          │
│   Rate Limiting | Helmet Headers | IDOR Guard | Multer      │
└──────┬──────────────┬──────────────┬─────────────┬──────────┘
       │              │              │             │
┌──────▼──────┐┌──────▼──────┐┌──────▼─────┐┌──────▼──────────┐
│  MongoDB    ││ Cloudinary  ││ Google     ││  Nodemailer     │
│  Mongoose   ││ File Storage││ Gemini LLM ││  SMTP / Twilio  │
│  (Atlas)    ││ (Cloud/Disk)││ (AI Chat)  ││  (Email / SMS)  │
└─────────────┘└─────────────┘└────────────┘└─────────────────┘
```

---

## 3. Folder Structure
```text
DockTrack-AI/
├── client/                     # Frontend Single-Page Application (Vite + React)
│   ├── src/
│   │   ├── components/         # Common, layout, and document components
│   │   ├── context/            # AuthContext & ProfileContext
│   │   ├── pages/              # 12+ application views (Dashboard, Radar, etc.)
│   │   ├── services/           # Centralized Axios API client
│   │   ├── App.jsx             # React router
│   │   └── main.jsx            # React root
│   ├── .env.example            # Client env template (VITE_API_URL, VITE_APP_NAME)
│   ├── vercel.json             # Vercel deployment routing config
│   └── package.json
│
├── server/                     # Backend REST API (Node.js + Express)
│   ├── src/
│   │   ├── config/             # env.js, db.js, validation.js
│   │   ├── controllers/        # REST API controllers
│   │   ├── middleware/         # auth, authorizeOwner, errorHandler, upload
│   │   ├── models/             # Mongoose schemas (Document, Warranty, User, etc.)
│   │   ├── routes/             # API routes (/api/documents, /api/health, etc.)
│   │   └── services/           # Cloudinary, Gemini, Email, SMS, Expiry Engine
│   ├── uploads/                # Local file fallback storage
│   ├── .env.example            # Complete backend env template
│   ├── server.js               # Entry point (0.0.0.0 host binding)
│   └── package.json
│
├── ai-service/                 # Optional Python / FastAPI Microservice
│   ├── app/
│   │   └── main.py             # FastAPI OCR & Classification service
│   ├── requirements.txt
│   └── .env.example
│
├── docs/                       # Comprehensive technical & deployment documentation
│   └── deployment.md           # Step-by-step Render, Vercel & Atlas deployment guide
│
├── README.md                   # Full system documentation
└── .gitignore                  # Git tracking exclusion rules
```

---

## 4. Technologies
- **Frontend**: React 18, Vite 5, React Router v6, Axios, Lucide React, Vanilla CSS design tokens.
- **Backend**: Node.js v20+, Express 4, Mongoose 8, Multer, Bcrypt.js, JsonWebToken.
- **Database**: MongoDB (Local Community or MongoDB Atlas Cloud Cluster).
- **File Storage**: Cloudinary SDK (with local disk fallback).
- **Artificial Intelligence**: Google Gemini 2.5 Flash LLM (via `@google/genai`) + heuristic rule-based fallback.
- **Email & SMS**: Nodemailer (SMTP/Gmail) + Twilio REST API (with mock outbox fallback).
- **Security**: Strict CORS origin isolation, OWASP-compliant security headers, magic-byte binary validation, NoSQL injection sanitization, IDOR ownership middleware, rate limiting.

---

## 5. Local Installation

### Prerequisites
- Node.js 18+ (Node 20+ recommended)
- npm 9+
- MongoDB instance (local or MongoDB Atlas)

### Clone & Install
```bash
git clone <repository-url>
cd DockTrack-AI

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

---

## 6. Environment Variables

### Backend Configuration (`server/.env`)
Create `server/.env` based on `server/.env.example`:
```ini
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

MONGODB_URI=mongodb://localhost:27017/doctrack
DB_NAME=doctrack

JWT_SECRET=dev_jwt_secret_doctrack_local_key_change_in_production
JWT_EXPIRES_IN=7d

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

GEMINI_API_KEY=

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM="DocTrack AI <noreply@doctrack.ai>"

AI_SERVICE_URL=

TWILIO_ACCOUNT_SID=
TWILIO_API_KEY=
TWILIO_API_SECRET=
TWILIO_PHONE_NUMBER=
```

### Frontend Configuration (`client/.env`)
Create `client/.env` based on `client/.env.example`:
```ini
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=DocTrack AI
```

---

## 7. Database Setup
DocTrack AI uses standard **Mongoose** schemas.
- **Local MongoDB**: Ensure `mongod` is running on `mongodb://localhost:27017`.
- **MongoDB Atlas Cloud**:
  1. Open [MongoDB Atlas](https://cloud.mongodb.com).
  2. Create a database user and whitelist your IP (or `0.0.0.0/0`).
  3. Select **Connect > Drivers > Node.js**.
  4. Paste the standard `mongodb+srv://` connection string into `MONGODB_URI`.
  5. Set `DB_NAME=doctrack`.

> **Note**: Do not use Atlas SQL endpoints. Standard MongoDB drivers/URIs are required.

---

## 8. Cloudinary Setup
1. Create a free account at [Cloudinary](https://cloudinary.com).
2. Copy your **Cloud Name**, **API Key**, and **API Secret** from the dashboard.
3. Paste into `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `server/.env`.
4. If omitted, the server automatically uses local disk storage in `server/uploads/`.

---

## 9. Gemini Setup
1. Obtain an API key from [Google AI Studio](https://aistudio.google.com/).
2. Add `GEMINI_API_KEY=your_key` to `server/.env`.
3. If omitted, the server falls back to internal heuristic NLP for document classification, OCR parsing, and chat queries.

---

## 10. SMTP Setup (Email Reminders)
1. Using Gmail:
   - Enable 2-Factor Authentication on your Google account.
   - Generate an **App Password** (16 characters) under Security settings.
2. In `server/.env`:
   ```ini
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your_email@gmail.com
   SMTP_PASSWORD=your_16_char_app_password
   EMAIL_FROM="DocTrack AI <your_email@gmail.com>"
   ```
3. If omitted, outgoing emails are recorded in an in-memory mock outbox.

---

## 11. Twilio Setup (SMS Notifications)
1. Create a Twilio account and obtain an SMS-enabled number.
2. Fill `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_API_SECRET`, and `TWILIO_PHONE_NUMBER` in `server/.env`.
3. If omitted, SMS alerts log to a mock outbox with `SMS-TW-...` delivery receipts.

---

## 12. Running Frontend
```bash
cd client
npm run dev
```
Client runs on [http://localhost:5173](http://localhost:5173).

---

## 13. Running Backend
```bash
cd server
npm run dev     # Development mode with node --watch
# or
npm start       # Production startup
```
Backend runs on [http://localhost:5000](http://localhost:5000).

---

## 14. Running AI Service (Optional FastAPI Microservice)
```bash
cd ai-service
pip install -r requirements.txt
python -m app.main
```
Microservice runs on `http://localhost:8000`.

---

## 15. API Health Check
Test backend availability and service status:
```bash
curl http://localhost:5000/api/health
```
Example response:
```json
{
  "status": "ok",
  "service": "DocTrack AI",
  "environment": "development",
  "version": "1.0.0",
  "timestamp": "2026-09-20T22:45:00.000Z",
  "database": {
    "status": "connected",
    "type": "MongoDB / Mongoose"
  },
  "integrations": {
    "cloudinary": true,
    "gemini": true,
    "smtp": true,
    "twilio": false
  }
}
```

---

## 16. Build Commands
```bash
# Build frontend for production
cd client
npm run build

# Preview built frontend
npm run preview
```

---

## 17. Step-by-Step Production Deployment Guide

### Step 1: Push Entire Project to GitHub
1. Initialize git (if not already done) and stage all files:
   ```bash
   git add .
   git commit -m "feat: complete production-ready DocTrack AI platform"
   ```
2. Create a new repository on [GitHub](https://github.com/new) named `DockTrack-AI`.
3. Link and push your code:
   ```bash
   git remote add origin https://github.com/<your-username>/DockTrack-AI.git
   git branch -M main
   git push -u origin main
   ```

---

### Step 2: Deploy Backend to Render (Web Service)
1. Sign up or log in at [Render.com](https://render.com/).
2. Click **New + > Web Service** and connect your GitHub repository `DockTrack-AI`.
3. Configure the service settings:
   - **Name**: `doctrack-api`
   - **Region**: Select closest to your users (e.g. Frankfurt, Oregon, Singapore)
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add **Environment Variables** in the Render dashboard:
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (or leave default, Render sets this automatically)
   - `CLIENT_URL` = `https://doc-track-ai.vercel.app`
   - `JWT_SECRET` = `<generate-a-strong-random-64-character-secret>`
   - `JWT_EXPIRES_IN` = `7d`
   - `MONGODB_URI` = `mongodb+srv://<username>:<password>@cluster0.mongodb.net/doctrack?retryWrites=true&w=majority`
   - `DB_NAME` = `doctrack`
   - *(Optional Cloudinary)* `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - *(Optional Gemini AI)* `GEMINI_API_KEY`
   - *(Optional SMTP)* `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`
5. Click **Create Web Service**.
6. Once deployed, test the health check in your browser:
   `https://doctrack-ai.onrender.com/api/health` (should return HTTP 200 OK).

---

### Step 3: Deploy Frontend to Vercel
1. Sign up or log in at [Vercel.com](https://vercel.com/).
2. Click **Add New... > Project** and import your GitHub repository `DockTrack-AI`.
3. Configure the project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click "Edit" and choose `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand **Environment Variables** and add:
   - `VITE_API_URL` = `https://doctrack-ai.onrender.com/api`
   - `VITE_APP_NAME` = `DocTrack AI`
5. Click **Deploy**.
6. Once deployed, your app is live at: `https://doc-track-ai.vercel.app`.

---

### Step 4: Link Render and Vercel Together
1. In your **Render Dashboard**, navigate to your `doctrack-ai` Web Service.
2. Go to **Environment** tab.
3. Update `CLIENT_URL` to match your exact Vercel frontend URL:
   `CLIENT_URL` = `https://doc-track-ai.vercel.app`
4. Click **Save Changes** (Render will automatically redeploy with the updated CORS policy).

---

### Step 5: Verify Live Deployment
1. Open your live Vercel frontend URL: `https://doc-track-ai.vercel.app`.
2. Register a new user account:
   - Enter your name, email, and password.
   - You will be automatically redirected to your newly allocated primary vault!
3. Upload a document (PDF, PNG, JPG) or add a warranty.
4. Verify document classification, countdown radar, and expiry assistant.


---

## 18. Security Instructions
- **Never expose secrets**: Secrets must remain strictly in backend environment variables. Never prefix backend secrets with `VITE_`.
- **JWT Protection**: Tokens are signed server-side and verified via Bearer header or authorized download query.
- **IDOR Protection**: Every document, profile, warranty, and notification access route strictly verifies that `resource.userId === req.user.id`.
- **Binary Magic-Byte Inspection**: Uploaded files are validated against raw byte signatures (`%PDF`, `\x89PNG`, `\xFF\xD8\xFF`) to stop spoofed executables.
- **CORS Hardening**: In production, CORS strictly enforces `CLIENT_URL` domain matching and denies wildcard access.

---

## 19. Demo Mode
DocTrack AI is designed for seamless presentation:
- **Default Demo Account**:
  - Email: `zaid@doctrack.ai`
  - Password: `password123`
  - Pre-seeded with realistic sample records (Passport, Driving License, RC, Appliances, AMC Warranties).
- **Clean User Onboarding**:
  - Any new registration starts with a clean slate: 0 documents, 0 warranties, 0 notifications, 0 reminders.

---

## 20. Troubleshooting
| Issue | Cause | Solution |
|---|---|---|
| `[MongoDB Error] Unable to connect` | MongoDB daemon offline or bad URI | Ensure MongoDB is running locally (`mongod`) or verify Atlas connection string in `MONGODB_URI`. |
| `CORS request rejected: Origin not allowed` | Mismatched `CLIENT_URL` | Set `CLIENT_URL` in `server/.env` to match your frontend port or domain. |
| `Upload rejected: INVALID_FILE_TYPE` | Unsupported file format | Upload only PDF, PNG, JPG, or JPEG files up to 15MB. |
| `Vite build chunk size warning` | Large bundle size | Normal for bundled Lucide icon sets; deployment functions normally. |
| `SMTP verification failed` | Gmail blocking standard password | Use a 16-character Google App Password with 2FA enabled. |
