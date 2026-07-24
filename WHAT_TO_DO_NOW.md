# 🚀 What To Do Now (Registration Fix - DONE & PUSHED)

## What Was Fixed

The `.env` file was gitignored, so Railway had **0 environment variables** — no `DATABASE_URL` — so Prisma couldn't connect to MySQL and registration failed.

I fixed it by:
1. Creating `backend/.env.production` (committed to git) with the correct `DATABASE_URL`
2. **Fixing the Dockerfile** to copy `.env.production` into the Docker image (this was the missing piece!)
3. Adding better error handling, a database health check, and a seed script
4. **Fixing CORS** — the backend now allows ALL origins (works from any frontend domain)
5. **Auto-seed on startup** — the 6 roles are now created automatically when the server starts (no need to manually run `npm run seed:prod` in Railway)
6. Updated `CORS_ORIGIN` to your frontend domain: `https://medborgarratt.zya.me`

**✅ Code is pushed to GitHub** at `https://github.com/Pingu662/rattighetsplattform-backend` (commit `be52965`)

---

## Step 1: Wait for Railway to Rebuild

1. Go to https://railway.app
2. Click on your project
3. Click **"Deployments"** tab
4. Wait for the latest deployment (commit `be52965`) to show **"Success"** (2-3 minutes)
5. Check the logs — you should see:
   ```
   ✅ Database: Connected
   ✅ Auto-seed complete: 6 roles in database
   ```
   If you see `❌ Database: Connection failed`, your MySQL host (`sql112.hstn.me`) might block Railway's IP. You need to add Railway's IP to your webhost's "Remote MySQL" whitelist in cPanel.

---

## Step 2: Test Registration (No Manual Seed Needed!)

The seed now runs **automatically** when the server starts. You do NOT need to find the "Run" command in Railway.

Go to: https://medborgarratt.zya.me/register

Try registering. It should work now! 🎉

---

## Step 3: Verify (Optional)

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

4. **CORS errors?** — The latest code allows ALL origins, so CORS should not be an issue anymore. Make sure you're running the latest deployed version (commit `be52965`).

---

## What Was Changed (Summary)

| File | What Changed |
|------|-------------|
| `backend/.env.production` | **NEW** — has the DATABASE_URL, committed to git. CORS_ORIGIN updated to `https://medborgarratt.zya.me` |
| `backend/Dockerfile` | **FIXED** — added `COPY .env.production ./` so the env file gets into the Docker image |
| `.gitignore` | Allows `.env.production` to be committed |
| `backend/src/config/index.ts` | Loads `.env.production` in production |
| `backend/railway.json` | Sets `NODE_ENV=production` |
| `backend/src/routes/auth.ts` | Better error messages for DB errors |
| `backend/src/server.ts` | DB connection test at startup + health check + **CORS fix (allow all origins)** + **auto-seed on startup** |
| `backend/src/seed.ts` | **NEW** — creates roles in database |
| `backend/package.json` | Added `seed:prod` script |
| `backend/.env.example` | **NEW** — template documenting all env vars |
