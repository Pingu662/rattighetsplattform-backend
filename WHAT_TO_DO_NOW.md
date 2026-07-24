# 🚀 What To Do Now (Registration Fix - DONE & PUSHED)

## What Was Fixed

The `.env` file was gitignored, so Railway had **0 environment variables** — no `DATABASE_URL` — so Prisma couldn't connect to MySQL and registration failed.

I fixed it by:
1. Creating `backend/.env.production` (committed to git) with the correct `DATABASE_URL`
2. **Fixing the Dockerfile** to copy `.env.production` into the Docker image (this was the missing piece!)
3. Adding better error handling, a database health check, and a seed script
4. **Fixing CORS** — the backend now allows `localhost:3000` (for local frontend dev) and the Railway domain

**✅ Code is already pushed to GitHub** at `https://github.com/Pingu662/rattighetsplattform-backend`

---

## Step 1: Wait for Railway to Rebuild

1. Go to https://railway.app
2. Click on your project
3. Click "Deployments" tab
4. Wait for the latest deployment to show **"Success"** (2-3 minutes)
5. Check the logs — you should see:
   ```
   ✅ Database: Connected
   ```
   If you see `❌ Database: Connection failed`, your MySQL host (`sql112.hstn.me`) might block Railway's IP. You need to add Railway's IP to your webhost's "Remote MySQL" whitelist in cPanel.

---

## Step 2: Run Seed Script

After deployment succeeds:

### Option A: Run via Railway UI (New UI)

1. In Railway, go to your project
2. Click on your service (the backend service)
3. Click the **"Deployments"** tab
4. Find the latest successful deployment (green checkmark)
5. Click the **three dots (⋯)** menu on that deployment
6. Select **"Run Command"** (or "Shell")
7. Run this command:
   ```bash
   npm run seed:prod
   ```
8. You should see: `✅ Seed complete: 6 roles seeded successfully`

### Option B: Run via Railway Settings (Alternative)

1. In Railway, go to your project
2. Click on your service
3. Click **"Settings"** tab
4. Scroll down to **"Variables"** section
5. Click **"..."** (three dots) → **"Run"**
6. Run this command:
   ```bash
   npm run seed:prod
   ```

### Option C: Run Locally Against Production Database

If you can't find the Run command in Railway:

1. Make sure you have Node.js installed
2. Install dependencies:
   ```bash
   cd backend && npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```
4. Run the seed with production env:
   ```bash
   NODE_ENV=production npm run seed:prod
   ```
   This uses the `DATABASE_URL` from `backend/.env.production` to connect directly to your MySQL database.

---

## Step 3: Test Registration

Go to: http://mseet_42481750.thatserver.com/register

Try registering. It should work now! 🎉

> **Note:** If you're testing locally (frontend running on `http://localhost:3000`), the CORS fix allows this. The backend will accept requests from `localhost:3000`.

---

## Step 4: Verify (Optional)

Check the health endpoint:
```
https://rattighetsplattform-backend-production.up.railway.app/api/health
```

You should see:
```json
{
  "status": "ok",
  "database": {
    "status": "connected",
    "error": null
  }
}
```

---

## If It Still Doesn't Work

1. **Check the health endpoint** above — if `database.status` is `disconnected`, the MySQL host (`sql112.hstn.me`) might block Railway's IP. Add Railway's IP to your webhost's "Remote MySQL" whitelist in cPanel.

2. **Check Railway logs** — the new error handling will show descriptive messages like:
   - "Kunde inte ansluta till databasen" (DB connection error)
   - "Registrering misslyckades - kontrollera att databasens tabeller är korrekt inställda" (missing roles/seed)

3. **Make sure you imported the database schema** — go to phpMyAdmin and import `database/mysql_schema.sql` if you haven't already.

4. **CORS errors?** — The latest code allows `localhost:3000` in development mode and the production domain in production. Make sure you're running the latest deployed version.

---

## What Was Changed (Summary)

| File | What Changed |
|------|-------------|
| `backend/.env.production` | **NEW** — has the DATABASE_URL, committed to git |
| `backend/Dockerfile` | **FIXED** — added `COPY .env.production ./` so the env file gets into the Docker image |
| `.gitignore` | Allows `.env.production` to be committed |
| `backend/src/config/index.ts` | Loads `.env.production` in production |
| `backend/railway.json` | Sets `NODE_ENV=production` |
| `backend/src/routes/auth.ts` | Better error messages for DB errors |
| `backend/src/server.ts` | DB connection test at startup + health check + **CORS fix** (allows localhost:3000) |
| `backend/src/seed.ts` | **NEW** — creates roles in database |
| `backend/package.json` | Added `seed:prod` script |
| `backend/.env.example` | **NEW** — template documenting all env vars |
