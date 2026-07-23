# 🚀 What To Do Now (Fix Registration)

## Problem
Registration fails because Railway has no `DATABASE_URL` variable. The `.env` file was never committed to GitHub.

## Fix (Already Done - Just Deploy It)
I've already fixed the code. You just need to push and deploy.

---

## Step 1: Push to GitHub

Open Command Prompt (cmd) and run:

```bash
cd c:\Users\neger\Desktop\crack
git remote add origin https://github.com/YOUR_USERNAME/rattighetsplattform-backend.git
git branch -M main
git push -u origin main
```

**Replace `YOUR_USERNAME`** with your actual GitHub username.

---

## Step 2: Wait for Railway to Rebuild

1. Go to https://railway.app
2. Click on your project
3. Click "Deployments" tab
4. Wait for the latest deployment to show "Success" (2-3 minutes)
5. Check the logs — you should see:
   ```
   ✅ Database: Connected
   ```
   If you see `❌ Database: Connection failed`, check your MySQL host allows remote connections.

---

## Step 3: Run Seed Script

After deployment succeeds:

1. In Railway, click your project
2. Click "Settings" → "General"
3. Scroll down to "Build & Deploy" → click "…" → "Run"
4. Run this command:
   ```bash
   npm run seed:prod
   ```
5. You should see: `✅ Seed complete: 6 roles seeded successfully`

---

## Step 4: Test Registration

Go to: http://mseet_42481750.thatserver.com/register

Try registering. It should work now! 🎉

---

## Step 5: Verify (Optional)

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

1. **Check the health endpoint** above — if `database.status` is `disconnected`, the MySQL host (`sql112.hstn.me`) might block Railway's IP. You need to add Railway's IP to your webhost's "Remote MySQL" whitelist in cPanel.

2. **Check Railway logs** — the new error handling will show descriptive messages like:
   - "Kunde inte ansluta till databasen" (DB connection error)
   - "Registrering misslyckades - kontrollera att databasens tabeller är korrekt inställda" (missing roles/seed)

3. **Make sure you imported the database schema** — go to phpMyAdmin and import `database/mysql_schema.sql` if you haven't already.

---

## What Was Changed (Summary)

| File | What Changed |
|------|-------------|
| `backend/.env.production` | **NEW** — has the DATABASE_URL, committed to git |
| `.gitignore` | Allows `.env.production` to be committed |
| `backend/src/config/index.ts` | Loads `.env.production` in production |
| `backend/railway.json` | Sets `NODE_ENV=production` |
| `backend/src/routes/auth.ts` | Better error messages for DB errors |
| `backend/src/server.ts` | DB connection test at startup + health check |
| `backend/src/seed.ts` | **NEW** — creates roles in database |
| `backend/package.json` | Added `seed:prod` script |
