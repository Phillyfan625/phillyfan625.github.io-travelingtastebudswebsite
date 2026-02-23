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

### Step 2: Deploy on Render.com (Free)

**Option A — One URL (recommended): site and API at the same address**

1. Go to **https://render.com** and sign up with your GitHub account.
2. Click **New** > **Web Service** and connect your GitHub repo.
3. Use the **repo root** (leave Root Directory blank):
   - **Build Command:** `npm install && cd api && npm install`
   - **Start Command:** `npm start`
4. Under **Environment Variables**, add:
   - `MONGODB_URI` = your MongoDB connection string from Step 1
   - `ADMIN_PASSWORD` = pick a strong password (this is your admin login)
   - `JWT_SECRET` = a random string (run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` to generate one)
   - `ALLOWED_ORIGIN` = your Render URL, e.g. `https://ttb-website-hior.onrender.com`
5. Click **Create Web Service**. Your one URL will serve both the site and the API at `/api/*`. No need to set anything in `js/ttb-config.js`.

**Option B — Two services (static site + separate API)**

1. Create a **Web Service** with **Root Directory:** `api`.
2. **Build Command:** `npm install`  
   **Start Command:** `npm start`
3. Add the same environment variables as above. You’ll get a URL like `https://ttb-api.onrender.com`.
4. Set that URL in **`js/ttb-config.js`** as `window.TTB_API_URL = 'https://ttb-api.onrender.com';` and deploy your static site (e.g. GitHub Pages or static Render) as usual.

### Step 3: Connect and log in

- **If you used Option A (one URL):** The site and API are at the same address. `js/ttb-config.js` can stay as-is (or use the same URL). No extra config.
- **If you used Option B (two services):** Set your API URL in **`js/ttb-config.js`**: `window.TTB_API_URL = 'https://your-api.onrender.com';`

Then:

1. Go to your live site’s **/admin** and log in with the password from Step 2.
2. Click **Seed DB** to import spots from the local JSON into MongoDB (if the DB is empty).
3. You can now add/edit/delete spots from the admin panel.

### Step 4: Manage Your Spots

- Go to `/admin` anytime to manage spots
- Add new spots with the form (includes map picker for coordinates)
- Edit or delete existing spots
- All changes reflect instantly across the entire site

---

## Local Development

Use this to run the API on your machine for testing admin endpoints before deploying.

### Prerequisites

- **Node.js v18+** — check with `node -v`
- **MongoDB Atlas** — you need a cluster (free M0 tier works). Follow Step 1 above if you haven't done this yet.

### 1. Create your `.env` file

```bash
cd api
cp .env.example .env
```

Open `.env` and fill in your values:

```
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/ttb?retryWrites=true&w=majority
ADMIN_PASSWORD=pick-a-strong-password
JWT_SECRET=paste-a-random-hex-string
PORT=3001
ALLOWED_ORIGIN=http://localhost:5500
```

To generate a JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Install dependencies and start the server

```bash
npm install
npm start
```

You should see:
```
Connected to MongoDB Atlas
TTB API running on port 3001
```

### 3. Verify the health endpoint

```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"2026-02-20T..."}
```

### 4. Log in and get a token

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your-admin-password"}'
```

Response:
```json
{"message":"Logged in successfully","token":"eyJhbG...","expiresIn":"24h"}
```

Copy the `token` value — you'll use it in the next steps as `YOUR_TOKEN`.

### 5. Seed the database from local JSON

If the database is empty, you can import all spots from `data/spots.json`:

```bash
curl -X POST http://localhost:3001/api/seed \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d @../data/spots.json
```

**Note:** The seed endpoint wraps the data in a `spots` array. If the raw file is just an array, use:

```bash
curl -X POST http://localhost:3001/api/seed \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "{\"spots\": $(cat ../data/spots.json)}"
```

Expected: `{"message":"Successfully seeded 11 spots","count":11}`

### 6. Test CRUD endpoints

**Get all spots (public):**
```bash
curl http://localhost:3001/api/spots
```

**Get a single spot:**
```bash
curl http://localhost:3001/api/spots/SPOT_ID
```

**Create a spot:**
```bash
curl -X POST http://localhost:3001/api/spots \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Spot",
    "tiktokId": "1234567890123456789",
    "lat": 39.95,
    "lng": -75.16,
    "location": "Philadelphia, PA",
    "tags": ["test"],
    "rating": 8.5
  }'
```

**Update a spot:**
```bash
curl -X PUT http://localhost:3001/api/spots/SPOT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Updated Name",
    "tiktokId": "1234567890123456789",
    "lat": 39.95,
    "lng": -75.16,
    "location": "Philadelphia, PA",
    "tags": ["updated"],
    "rating": 9.0
  }'
```

**Delete a spot:**
```bash
curl -X DELETE http://localhost:3001/api/spots/SPOT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 7. Connect the admin panel locally

1. Serve the site locally (e.g. with VS Code Live Server on port 5500)
2. Go to `http://localhost:5500/admin.html`
3. Paste `http://localhost:3001` as the API URL
4. Log in with your admin password
5. You should see all your seeded spots in the admin table

### Troubleshooting

| Problem | Fix |
|---------|-----|
| `Missing required environment variable` | Check your `.env` file has all 3 required vars: `MONGODB_URI`, `ADMIN_PASSWORD`, `JWT_SECRET` |
| `MongoServerError: bad auth` | Your MongoDB username/password in the URI is wrong. Check Atlas > Database Access. |
| `CORS error in browser` | Make sure `ALLOWED_ORIGIN` in `.env` matches your local dev URL (e.g. `http://localhost:5500`) |
| `Too many login attempts` | Rate limiter triggered. Wait 15 minutes or restart the server. |
| `Seed: Database already has data` | The DB already has spots. Delete them from Atlas (or via the admin panel) before re-seeding. |
| `Cannot connect to MongoDB` | Check Atlas > Network Access — make sure your IP is allowed (or 0.0.0.0/0 for dev). |

---

## Notes

- **Free tier limits:** Render free tier sleeps after 15 min of inactivity. First request after sleep takes ~30 seconds. The site gracefully falls back to local JSON during this time.
- **Fallback:** If the API is ever down, the site automatically loads from `/data/spots.json` so visitors always see content.
- **Security:** Only you can add/edit/delete — requires your password. Visitors can only read data.
