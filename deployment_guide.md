# DGen AI — Online Hosting & Deployment Guide

This guide provides clear, step-by-step instructions to deploy your **DGen AI** platform online completely for free using **Cloudflare Pages** (Frontend), **Render** (Backend API), and **MongoDB Atlas** (Cloud Database).

---

## 🏗️ Architecture Overview

```
┌───────────────────────────┐         ┌───────────────────────────┐         ┌───────────────────────────┐
│   Cloudflare Pages (UI)   │ ──────> │   Render (FastAPI API)    │ ──────> │  MongoDB Atlas (Database) │
│  https://dgen-ai.pages.dev │  HTTPS  │ https://dgen-api.onrender │  Mongo  │  Persistent User Data DB  │
└───────────────────────────┘         └───────────────────────────┘         └───────────────────────────┘
```

---

## Step 1: Deploy Database on MongoDB Atlas (Free Tier)

1. **Sign Up**: Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. **Create Database Cluster**:
   - Select **M0 Free Shared Cluster**.
   - Choose your preferred cloud region (e.g. AWS / Asia South / US East).
3. **Database User Credentials**:
   - Create a Database User (e.g. `dgen_user` with a strong password).
4. **IP Network Access**:
   - Under *Network Access*, add IP Address `0.0.0.0/0` (Allows backend connection from cloud hosting).
5. **Get Connection String**:
   - Click **Connect** $\rightarrow$ **Drivers** $\rightarrow$ Copy Python connection string:
   ```text
   mongodb+srv://dgen_user:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   ```

---

## Step 2: Deploy Backend API on Render (Free Tier)

1. **Push Code to GitHub**: Ensure your project repository is uploaded to GitHub.
2. **Sign Up on Render**: Go to [render.com](https://render.com) and log in with GitHub.
3. **Create New Web Service**:
   - Click **New +** $\rightarrow$ **Web Service**.
   - Connect your **AI Data Generation** GitHub repository.
   - Select `Root Directory`: `backend`
   - Select `Environment`: **Python 3**
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. **Configure Environment Variables**:
   In Render's *Environment* tab, add:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `ENV` | `production` | Production environment mode |
   | `USE_MONGO_MOCK` | `false` | Enable MongoDB Atlas database |
   | `MONGODB_URI` | `mongodb+srv://dgen_user:...` | Connection string from Step 1 |
   | `MONGODB_DB_NAME` | `dgen_ai_prod` | Production database name |
   | `JWT_SECRET` | `your-secret-key-32-chars-long` | Random secret key for auth tokens |
   | `CORS_ORIGINS` | `["https://dgen-ai.pages.dev","*"]` | Allowed frontend origins |
5. **Deploy**: Click **Create Web Service**. Once deployed, copy your backend URL (e.g. `https://dgen-api.onrender.com`).

---

## Step 3: Deploy Frontend UI on Cloudflare Pages (Free Tier)

1. **Log in to Cloudflare**: Go to [dash.cloudflare.com](https://dash.cloudflare.com) and navigate to **Workers & Pages**.
2. **Create New Pages Project**:
   - Click **Create application** $\rightarrow$ **Pages** $\rightarrow$ **Connect to Git**.
   - Select your GitHub repository.
3. **Build Settings**:
   - **Project Name**: `dgen-ai`
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `dist`
4. **Set Environment Variables**:
   - Add Environment Variable:
     - `VITE_API_BASE_URL`: `https://dgen-api.onrender.com` (Your Render backend URL from Step 2).
5. **Deploy**: Click **Save and Deploy**. Cloudflare will build and host your site at `https://dgen-ai.pages.dev` in under 30 seconds!

---

## Step 4: Verification & Live Checklist

- [x] **User Authentication**: Visit `https://dgen-ai.pages.dev`, click **Register**, create a new account, and test persistent sign-in.
- [x] **Synthetic Data Generation**: Test launching CTGAN or VAE synthetic data jobs on your live server.
- [x] **Quality Evaluation**: Inspect statistical fidelity, privacy DCR metrics, and download visual report packages.
- [x] **Downstream ML Utility**: Execute imbalanced Random Forest fraud benchmarks live in the cloud.
