# ⚖️ Digital Rättighetsplattform

En webbplats som hjälper dig förstå dina rättigheter hos myndigheter.

---

## 🚀 Så här får du upp sidan (3 steg, ca 15 minuter)

Det finns 3 delar:
1. **Databasen** – görs i webbläsaren (phpMyAdmin)
2. **Backend** – görs i webbläsaren (Railway)
3. **Frontend** – laddas upp via FTP

---

## ✅ Steg 1: Databasen (2 minuter)

Görs i webbläsaren, inget att installera.

1. Gå till: `https://sql112.hstn.me/phpmyadmin`
2. Logga in med:
   - Användare: `mseet_42481750`
   - Lösenord: `Lolland6`
3. Klicka på databasen `mseet_42481750_1` till vänster
4. Klicka på **"Importera"** högst upp
5. Klicka **"Välj fil"** och välj filen `database/mysql_schema.sql` från din dator
6. Scrolla ner och klicka **"Kör"**

✅ Klart! Databasen är installerad.

---

## ✅ Steg 2: Backend (5 minuter)

Backend är "motorn" som driver sidan. Din webhost stöder bara PHP, därför måste denna del körs på Railway (gratis, inget att installera).

### 2a. Ladda upp backend till GitHub

1. Gå till `https://github.com/new`
2. Namn: `rattighetsplattform-backend`
3. Klicka **"Create repository"**
4. Klicka **"uploading an existing file"**
5. Öppna mappen `backend` på din dator
6. Dra alla filer från `backend`-mappen till GitHub
7. Klicka **"Commit changes"**

### 2b. Starta på Railway

1. Gå till `https://railway.app`
2. Klicka **"Sign up"** → **"Continue with GitHub"**
3. Logga in med ditt GitHub-konto
4. Klicka **"New Project"** → **"Deploy from GitHub repo"**
5. Välj `rattighetsplattform-backend`
6. Vänta 2–3 minuter

### 2c. Koppla databasen och inställningarna

> **WICHTIG:** Filen `backend/.env.production` ingår redan i paketet och innehåller alla nödvändiga inställningar (DATABASE_URL, JWT_SECRET, etc.). När du laddar upp alla filer från `backend`-mappen till GitHub kommer denna fil automatiskt att användas av Railway. Du behöver **inte** manuellt lägga till variabler i Railway.

Om du vill kan du fortfarande lägga till variabler manuellt i Railway (dessa överskriver `.env.production`):

I Railway:
1. Klicka på ditt projekt
2. Klicka på **"Variables"**
3. Du kan lägga till variabler en i taget om du vill åsidoga eller åsidoa specifika värden:

**Rekommenderade variabler (valfritt, .env.production har redan dessa):**
- Key: `DATABASE_URL`
- Value: `mysql://mseet_42481750:Lolland6@sql112.hstn.me:3306/mseet_42481750_1`

- Key: `JWT_SECRET`
- Value: `det-har-ar-min-hemliga-nyckel`

- Key: `JWT_REFRESH_SECRET`
- Value: `det-har-ar-min-andra-hemliga-nyckel`

- Key: `CORS_ORIGIN`
- Value: `http://mseet_42481750.thatserver.com`

- Key: `PORT`
- Value: `5000`

> **Om du får frågan om format:** Välj **"Plain Text"** eller bara skriv in som text. Det är bara vanliga nyckel/värde-par.

Railway startar om automatiskt.

> **Behöver jag ändra JWT_SECRET och JWT_REFRESH_SECRET?**
> Nej! Du kan behålla texten `det-har-ar-min-hemliga-nyckel` som den är. Fungerar perfekt.

> **Måste jag referera till variablerna någon annanstans?**
> Nej! När du lagt till variablerna i Railway så används de automatiskt. Du behöver inte ändra någon annan fil.

### 2d. Kör seed (skapa roller i databasen)

Efter att backend är igång, måste du köra seed för att skapa roller i databasen (behövs för registrering):

1. I Railway, klicka på ditt projekt
2. Klicka på **"Settings"** → **"General"**
3. Skrolla ner till **"Build & Deploy"** och klicka på **"...**" → **"Run"** eller klicka på **"Deployments"** → klicka på din senaste deployment → **"...**" → **"Replay"**
4. Alternativt: Kör lokalt efter att du byggt:
   ```
   cd backend
   npm run build
   npm run seed:prod
   ```

> **Varför behövs detta?** Registreringsfunktionen kräver att rollen "user" (id=6) finns i databasen. Seed-skriptet skapar alla nödvändiga roller.

### 2d. Hämta din backend-URL

Efter att byggt är färdigt:

1. Klicka på **"Settings"** i Railway
2. Klicka på fliken **"Domains"**
3. Under **"Generated Domain"** ser du en URL som `https://rattighetsplattform-backend-production.up.railway.app`
4. **Kopiera denna URL!** Du behöver den i nästa steg.

> **Om du bara ser "Public Networking" och ingen URL:**
> Vänta tills bygget är klart (kolla under "Deployments" om det står "Success"). 
> Om det fortfarande inte visas en URL, försök ladda om sidan eller vänta 1 minut.

---

## ✅ Steg 3: Frontend / Hemsida (8 minuter)

Detta är själva hemsidan som besökare ser.

### 3a. Ändra API-URL

1. Öppna filen `frontend/src/lib/api.ts` på din dator med Anteckningar (Notepad)
2. Rad 3 ser ut så här:
   ```
   const API_URL = 'http://localhost:5000/api';
   ```
3. Byt mot din Railway-URL från steg 2d:
   ```
   const API_URL = 'https://rattighetsplattform-backend-production.up.railway.app/api';
   ```
4. Spara filen

### 3b. Bygg frontend

Innan du laddar upp frontend måste du bygga den till statiska filer.

**Om du INTE har Node.js installerat:**
- Gå till `https://nodejs.org`
- Klicka på den största knappen "LTS"
- Installera programmet som ett vanligt Windows-program

**Bygga frontend med kommandotolken:**

1. Tryck på **Windows-loggan** på tangentbordet (till vänster om mellanslag)
2. Skriv `cmd` och tryck **Enter**
3. Du ser ett svart fönster med text. Klistra in denna rad och tryck Enter:
   ```
   cd %USERPROFILE%\Desktop\crack\frontend
   ```
4. Klistra in nästa rad och tryck Enter:
   ```
   npm install
   ```
   Vänta 3-5 minuter tills allt är klart
5. Klistra in nästa rad och tryck Enter:
   ```
   npm run build
   ```
   Vänta 2-3 minuter tills det står "Compiled successfully"
6. Nu ska det ha skapats en mapp kallad `out` inuti `frontend`. **Det är denna mapp du ska ladda upp!**

> **Om du ser felmeddelanden:** Kontrollera att du installerat Node.js från `nodejs.org` och startat om datorn efter installation.

### 3c. Ladda upp till din webhost

Detta är den viktigaste delen. Följ exakt för att undvika 403:

#### Steg 1: Förbered FileZilla

1. Öppna **FileZilla** (ladda ner från filezilla-project.org om du inte har det)
2. Klicka **"File" → "Site Manager"**
3. Klicka **"New Site"**, namnge det t.ex. "Min webbhotell"
4. Fyll i:
   - **Host:** `mseet_42481750.thatserver.com`
   - **Port:** `21`
   - **Protocol:** `FTP - File Transfer Protocol`
   - **Encryption:** `Use plain FTP`
   - **Logon Type:** `Normal`
   - **User:** `mseet_42481750`
   - **Password:** `Lolland6`
5. Klicka **"Connect"**

#### Steg 2: Rensa `public_html`

1. När du är ansluten ser du två fönster:
   - Vänster: Din dator
   - Höger: Servern
2. Högerklicka i mappen `public_html` på servern (höger fönster)
3. Välj **"Delete"** för att ta bort alla gamla filer

#### Steg 3: Ladda upp frontend-filerna

1. Om du inte redan byggt frontend, följ steg 3b ovan
2. Öppna **FileZilla**
3. I FileZilla, dra **ALLA filer och mappar från mappen `out`** (som finns i `frontend`-mappen på din dator) till `public_html` på servern.

**VIKTIGT:**
- Du ska se filer som `index.html`, `_next`, `assets`等 **direkt i** `public_html`
- Ladda INTE själva `out`-mappen
- Ladda INTE hela `frontend`-mappen

#### Steg 4: Verifiera

1. Vänta 30 sekunder
2. Gå till: `http://mseet_42481750.thatserver.com`
3. Du ska se hemsidan

> **Om du får 403:**
> - Vänta 1-2 minuter och ladda om
> - Kontrollera att du laddade UPP **innehållet** i `out`, inte hela mappen
> - Kontrollera att `index.html` finns direkt i `public_html` på servern

---

## 🎉 Klart! Din sida är live

| Del | Adress |
|-----|--------|
| 🌐 Hemsidan | `http://mseet_42481750.thatserver.com` |
| ⚙️ Backend | `https://rattighetsplattform-backend-production.up.railway.app` |
| 🗄️ Databas | `sql112.hstn.me` (phpMyAdmin) |

---

## ❓ Vanliga frågor

**Varför kan inte allt ligga på webhotellet?**
Din webhost stöder bara PHP. Backend måste köras på Railway eftersom den är byggd med Node.js. Railway är gratis och fungerar som en motor bakom hemsidan.

**Behöver jag installera något?**
Nej! Allt görs i webbläsaren. FileZilla är enda programmet du behöver, och det är gratis.

**Är det gratis?**
Ja. Railway är gratis för små projekt. Din webhost är också gratis.

---

## ⚠️ Viktigt

> **AI kan ha fel.** Slutligt ansvar ligger alltid hos dig.  
> Rådgör med en juridisk expert innan du skickar in viktiga handlingar.