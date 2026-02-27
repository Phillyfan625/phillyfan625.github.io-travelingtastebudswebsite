/**
 * TTB API URL — only used by the admin panel for CRUD operations.
 * Public pages load all data from local JSON files in /data/ — no server needed.
 *
 * To update site data:
 *   1. Log into the admin panel (which uses this API)
 *   2. Make your changes
 *   3. Click "Export Data" to download updated JSON files
 *   4. Replace the files in /data/ and commit to GitHub
 */
window.TTB_API_URL = 'https://ttb-website-hior.onrender.com';
