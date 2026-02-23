/**
 * Single server: serves the TTB API at /api/* and static site (HTML, JS, CSS) for everything else.
 * Use this so one Render "Web Service" can run both the site and the API at the same URL.
 *
 * Run from repo root: node server.js
 * Set env vars (or use api/.env locally): MONGODB_URI, ADMIN_PASSWORD, JWT_SECRET, PORT, ALLOWED_ORIGIN
 */

const path = require('path');
const express = require('express');

// Load api/.env so same env as running api/server.js alone
require('dotenv').config({ path: path.join(__dirname, 'api', '.env') });

const { app: apiApp, connectDB } = require('./api/server');

const app = express();
const PORT = process.env.PORT || 3000;

// API handles /api/* (health, auth, spots, tiktok/oembed, etc.)
app.use(apiApp);

// Static site (admin.html, index.html, js/, css/, etc.)
app.use(express.static(__dirname));

async function start() {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`TTB site + API running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start:', err.message);
        process.exit(1);
    }
}

start();
