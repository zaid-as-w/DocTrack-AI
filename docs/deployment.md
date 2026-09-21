# DocTrack AI — Production Deployment Guide

This guide outlines step-by-step procedures for deploying **DocTrack AI** to production across **Vercel** (Frontend) and **Render** (Backend), backed by **MongoDB Atlas** and cloud integrations.

### Live Production Deployments
- **Frontend (Client)**: [https://doc-track-ai.vercel.app](https://doc-track-ai.vercel.app)
- **Backend (Server)**: [https://doctrack-ai.onrender.com](https://doctrack-ai.onrender.com)
- **API Health Check**: [https://doctrack-ai.onrender.com/api/health](https://doctrack-ai.onrender.com/api/health)

---

## 1. Prerequisites & Services

1. **MongoDB Atlas Account**: A free or dedicated cluster.
2. **Cloudinary Account**: Cloud Name, API Key, and API Secret for media asset hosting.
3. **Google AI Studio Account**: API Key for Google Gemini LLM.
4. **SMTP Service**: Gmail App Password or SendGrid / Mailgun credentials.
5. **Render Account**: For backend Web Service hosting.
6. **Vercel Account**: For frontend Single-Page Application (SPA) hosting.

---

## 2. Database: MongoDB Atlas Configuration

> [!IMPORTANT]
> **Standard MongoDB Connection URI Required**:
> DocTrack AI uses **Mongoose** for schema enforcement. Use standard `mongodb+srv://` connection strings from Atlas **"Connect > Drivers > Node.js"**.
> Do **NOT** use MongoDB Atlas SQL / Virtual Database URLs.

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/).
2. Create or select a Cluster.
3. Under **Database Access**, create a user with read/write permissions.
4. Under **Network Access**, add `0.0.0.0/0` (allow connections from anywhere) to permit Render backend dynamic IP connections.
5. Click **Connect > Drivers > Driver: Node.js > Version: 5.5 or later**.
6. Copy the connection string:
   ```text
   mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   ```
7. Set database name: `DB_NAME=doctrack`.

---

## 3. Backend Deployment: Render (Web Service)

1. Log in to [Render](https://render.com/) and click **New + > Web Service**.
2. Connect your Git repository containing DocTrack AI.
3. Configure settings:
   - **Name**: `doctrack-server`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add the following **Environment Variables** in Render:
   | Key | Example / Description |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` (or leave default for Render auto-injection) |
   | `CLIENT_URL` | `https://doc-track-ai.vercel.app` |
   | `MONGODB_URI` | `mongodb+srv://user:password@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority` |
   | `DB_NAME` | `doctrack` |
   | `JWT_SECRET` | Strong 64-character hex string (`openssl rand -hex 32`) |
   | `JWT_EXPIRES_IN` | `7d` |
   | `CLOUDINARY_CLOUD_NAME` | Your Cloudinary Cloud Name |
   | `CLOUDINARY_API_KEY` | Your Cloudinary API Key |
   | `CLOUDINARY_API_SECRET` | Your Cloudinary API Secret |
   | `GEMINI_API_KEY` | Your Gemini API Key from Google AI Studio |
   | `SMTP_HOST` | `smtp.gmail.com` |
   | `SMTP_PORT` | `587` |
   | `SMTP_SECURE` | `false` |
   | `SMTP_USER` | `your.notifications@gmail.com` |
   | `SMTP_PASSWORD` | Google 16-character App Password |
   | `EMAIL_FROM` | `"DocTrack AI" <notifications@doctrack.ai>` |
   | `TWILIO_ACCOUNT_SID` | Optional Twilio SID |
   | `TWILIO_API_KEY` | Optional Twilio API Key |
   | `TWILIO_API_SECRET` | Optional Twilio Secret |
   | `TWILIO_PHONE_NUMBER` | Optional Twilio Phone (`+1234567890`) |

5. Click **Create Web Service**.
6. Once deployed, verify:
   ```bash
   curl https://doctrack-ai.onrender.com/api/health
   ```
   Expected response:
   ```json
   {
     "status": "ok",
     "service": "DocTrack AI",
     "environment": "production",
     "database": { "status": "connected" }
   }
   ```

---

## 4. Frontend Deployment: Vercel

1. Log in to [Vercel](https://vercel.com/) and click **Add New... > Project**.
2. Select your repository.
3. In Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Configure Environment Variables:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://doctrack-ai.onrender.com/api` |
   | `VITE_APP_NAME` | `DocTrack AI` |
5. Click **Deploy**.
6. After Vercel deployment completes:
   - Live URL: `https://doc-track-ai.vercel.app`
   - Render backend `CLIENT_URL` is configured to allow `https://doc-track-ai.vercel.app`.

---

## 5. Cloudinary Storage Setup

1. Create a free account on [Cloudinary](https://cloudinary.com/).
2. On your Dashboard, find:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
3. Under **Settings > Upload**, ensure unsigned uploads are disabled for security.
4. DocTrack AI will automatically create the `doctrack/<userId>/documents` folder structure on first document upload.

---

## 6. Optional Python/FastAPI Service (ai-service) on Render

If running the optional high-throughput FastAPI microservice:
1. In Render, create **New + > Web Service**.
2. **Root Directory**: `ai-service`
3. **Runtime**: `Python 3`
4. **Build Command**: `pip install -r requirements.txt`
5. **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Set `AI_SERVICE_URL` in the Node.js backend to point to this microservice URL.
