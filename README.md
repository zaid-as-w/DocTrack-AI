# DocTrack AI

DocTrack AI is an offline-first, local-only document intelligence and expiry tracking platform. It allows users to manage critical personal, family, and product documents, extract metadata using on-device OCR, track upcoming expirations, and interact with a local AI assistant without relying on external cloud APIs.

---

## 🏛️ Architecture Overview (Iteration 0)

DocTrack AI is built as a modular monorepo consisting of:
- **`client/`**: Modern React single-page application built with Vite and React Router.
- **`server/`**: Node.js & Express REST API using Mongoose for local MongoDB persistence.
- **Service Abstraction Layer**: Pluggable architecture (`server/src/services/`) for OCR, Classification, Notification, and Chatbot modules. All modules currently run mock implementations that can be swapped for on-device engines (such as Tesseract.js WASM) in future iterations without altering business controllers.
- **Local File Storage**: Direct disk storage in `server/uploads/` handled by Multer.

---

## 🚀 Prerequisites

1. **Node.js**: v18 or higher (v20+ recommended)
2. **npm**: v9 or higher
3. **MongoDB**: A running local MongoDB instance at `mongodb://localhost:27017`

### Starting MongoDB Locally

#### Option A: Native MongoDB Community Server
If installed on your system, start the daemon:
```bash
mongod --dbpath <path-to-data-directory>
```

#### Option B: Docker Container
If Docker is installed:
```bash
docker run -d -p 27017:27017 --name doctrack-mongo mongo:latest
```

> **Note**: The backend server connects to MongoDB gracefully. If MongoDB is offline, the server logs a helpful advisory notice and remains operational so health check endpoints and mock services can be tested.

---

## 🛠️ Quick Start

### 1. Server Setup
```bash
cd server
npm install
cp .env.example .env
npm run dev
```
The server will start on [http://localhost:5000](http://localhost:5000).
Health check endpoint: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### 2. Client Setup
In a separate terminal:
```bash
cd client
npm install
cp .env.example .env
npm run dev
```
The client will launch on [http://localhost:5173](http://localhost:5173).

---

## 📁 Repository Structure

```text
doctrack-ai/
├── client/                     # React frontend (Vite)
│   ├── src/
│   │   ├── components/         # Reusable UI & Layout components
│   │   ├── pages/              # Views (HomePage, etc.)
│   │   ├── services/           # Axios API client
│   │   ├── App.jsx             # Router definition
│   │   └── main.jsx            # React root
│   ├── .env.example
│   └── package.json
├── server/                     # Express REST API
│   ├── src/
│   │   ├── config/             # DB & environment loader
│   │   ├── middleware/         # Multer upload & global error handler
│   │   ├── models/             # Mongoose schemas (User)
│   │   ├── routes/             # REST endpoints (/api/health)
│   │   ├── services/           # OCR, Classification, Notification, Chatbot
│   │   └── app.js              # Express app definition
│   ├── uploads/                # Local file storage (.gitkeep)
│   ├── .env.example
│   ├── server.js               # Entry point
│   └── package.json
├── .gitignore
└── README.md
```

---

## 🧪 Verification
To verify the stack is functioning end-to-end:
1. Start the server: `npm run dev` in `server/`
2. Start the client: `npm run dev` in `client/`
3. Open `http://localhost:5173` in your browser. The dashboard displays a live green badge confirming `Backend Connected: status: ok`.
