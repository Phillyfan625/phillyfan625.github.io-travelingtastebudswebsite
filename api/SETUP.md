# TTB API — Setup Guide

## Quick Start (15 minutes)

### Step 1: Create a MongoDB Atlas Account (Free)

1. Go to **https://www.mongodb.com/atlas** and create a free account
2. Create a **free shared cluster** (M0 tier — $0/month)
3. Under **Database Access**, create a database user with a username/password
4. Under **Network Access**, click "Allow Access from Anywhere" (0.0.0.0/0)
5. Click **Connect** > **Drivers** and copy the connection string
   - It looks like: `mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/`
   - Add `ttb` at the end: `mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/ttb?retryWrites=true&w=majority`

### Step 2: Deploy the API on Render.com (Free)

1. Go to **https://render.com** and sign up with your GitHub account
2. Click **New** > **Web Service**
3. Connect your GitHub repo
4. Set these options:
   - **Name:** `ttb-api`
   - **Root Directory:** `api`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Under **Environment Variables**, add:
   - `MONGODB_URI` = your MongoDB connection string from Step 1
   - `ADMIN_PASSWORD` = pick a strong password (this is your admin login)
   - `JWT_SECRET` = a random string (run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` to generate one)
   - `ALLOWED_ORIGIN` = `https://travelingtastebuds.org`
6. Click **Create Web Service**
7. Wait for it to deploy — you'll get a URL like `https://ttb-api.onrender.com`

### Step 3: Connect the Website to the API

1. Go to **https://travelingtastebuds.org/admin**
2. Paste your Render URL (e.g. `https://ttb-api.onrender.com`) and click **Connect API**
3. Log in with the password you set in Step 2
4. Click **Seed DB** to import all current spots from the local JSON into MongoDB
5. Done! You can now add/edit/delete spots from the admin panel

### Step 4: Manage Your Spots

- Go to `/admin` anytime to manage spots
- Add new spots with the form (includes map picker for coordinates)
- Edit or delete existing spots
- All changes reflect instantly across the entire site

## Notes

- **Free tier limits:** Render free tier sleeps after 15 min of inactivity. First request after sleep takes ~30 seconds. The site gracefully falls back to local JSON during this time.
- **Fallback:** If the API is ever down, the site automatically loads from `/data/spots.json` so visitors always see content.
- **Security:** Only you can add/edit/delete — requires your password. Visitors can only read data.
