require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Startup validation ────────────────────────────

const REQUIRED_ENV = ['MONGODB_URI', 'ADMIN_PASSWORD', 'JWT_SECRET'];
for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
        console.error(`Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

// ── Security headers ──────────────────────────────

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// ── Validation helpers ─────────────────────────────

function sanitizeString(val, maxLen = 500) {
    if (typeof val !== 'string') return '';
    return val.trim().replace(/[<>]/g, '').slice(0, maxLen);
}

function validateSpot(body) {
    const errors = [];
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
        errors.push('Name is required');
    }
    if (!body.tiktokId || typeof body.tiktokId !== 'string' || !body.tiktokId.trim()) {
        errors.push('TikTok Video ID is required');
    } else if (!/^\d{5,25}$/.test(body.tiktokId.trim())) {
        errors.push('TikTok Video ID must be a numeric string (5-25 digits)');
    }
    if (body.lat == null || typeof body.lat !== 'number' || body.lat < -90 || body.lat > 90) {
        errors.push('Valid latitude is required (-90 to 90)');
    }
    if (body.lng == null || typeof body.lng !== 'number' || body.lng < -180 || body.lng > 180) {
        errors.push('Valid longitude is required (-180 to 180)');
    }
    if (!body.location || typeof body.location !== 'string' || !body.location.trim()) {
        errors.push('Location (city, state) is required');
    }
    if (body.rating != null && (typeof body.rating !== 'number' || body.rating < 0 || body.rating > 10)) {
        errors.push('Rating must be between 0 and 10');
    }
    if (body.tags && !Array.isArray(body.tags)) {
        errors.push('Tags must be an array');
    }
    if (body.foodImage && !isValidImageUrl(body.foodImage)) {
        errors.push('Food image URL must start with / or https://');
    }
    return errors;
}

function isValidImageUrl(url) {
    if (!url) return true; // optional field
    // Allow relative paths or https URLs only
    return url.startsWith('/') || url.startsWith('https://');
}

function buildSpotDocument(body) {
    const logoImage = sanitizeString(body.logoImage || '', 500);
    const foodImage = sanitizeString(body.foodImage || '', 500);
    return {
        name: sanitizeString(body.name, 100),
        tiktokId: body.tiktokId ? body.tiktokId.trim().replace(/\D/g, '').slice(0, 25) : '',
        lat: Number(body.lat),
        lng: Number(body.lng),
        location: sanitizeString(body.location, 200),
        discount: sanitizeString(body.discount || '', 100),
        logoImage: isValidImageUrl(logoImage) ? logoImage : '',
        foodImage: isValidImageUrl(foodImage) ? foodImage : '',
        tags: Array.isArray(body.tags)
            ? body.tags.map(t => sanitizeString(t, 50).toLowerCase()).filter(Boolean).slice(0, 20)
            : [],
        rating: body.rating != null ? Math.round(Math.min(10, Math.max(0, Number(body.rating))) * 2) / 2 : 0,
        snippet: sanitizeString(body.snippet || '', 300),
        logoBgColor: /^#[0-9a-fA-F]{3,8}$/.test((body.logoBgColor || '').trim()) ? body.logoBgColor.trim() : ''
    };
}

// ── Package Validation ───────────────────────────

function validatePackage(body) {
    const errors = [];
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
        errors.push('Package name is required');
    }
    if (!body.price || typeof body.price !== 'string' || !body.price.trim()) {
        errors.push('Price is required');
    }
    if (!Array.isArray(body.features) || body.features.length === 0) {
        errors.push('At least one feature is required');
    }
    if (body.sortOrder != null && typeof body.sortOrder !== 'number') {
        errors.push('Sort order must be a number');
    }
    return errors;
}

function buildPackageDocument(body) {
    return {
        name: sanitizeString(body.name, 100),
        price: sanitizeString(body.price, 50),
        priceNote: sanitizeString(body.priceNote || '', 10),
        description: sanitizeString(body.description || '', 300),
        features: Array.isArray(body.features)
            ? body.features.map(f => ({
                icon: sanitizeString(f.icon || 'fas fa-check', 60),
                text: sanitizeString(f.text || '', 200)
            })).filter(f => f.text).slice(0, 15)
            : [],
        buttonText: sanitizeString(body.buttonText || 'Get Started', 50),
        buttonLink: sanitizeString(body.buttonLink || '/contact', 300),
        highlighted: !!body.highlighted,
        headerEmojis: sanitizeString(body.headerEmojis || '', 50),
        footnote: sanitizeString(body.footnote || '', 200),
        sortOrder: typeof body.sortOrder === 'number' ? Math.round(body.sortOrder) : 0,
        active: body.active !== false
    };
}

// ── Testimonial Validation ────────────────────────

function validateTestimonial(body) {
    const errors = [];
    if (!body.quote || typeof body.quote !== 'string' || !body.quote.trim()) {
        errors.push('Quote is required');
    }
    if (!body.authorName || typeof body.authorName !== 'string' || !body.authorName.trim()) {
        errors.push('Author name is required');
    }
    if (!body.location || typeof body.location !== 'string' || !body.location.trim()) {
        errors.push('Location is required');
    }
    if (body.rating != null && (typeof body.rating !== 'number' || body.rating < 1 || body.rating > 5)) {
        errors.push('Rating must be between 1 and 5');
    }
    if (body.tiktokUrl && typeof body.tiktokUrl === 'string' && body.tiktokUrl.trim() && !body.tiktokUrl.includes('tiktok.com')) {
        errors.push('TikTok URL must be a valid TikTok link');
    }
    return errors;
}

function buildTestimonialDocument(body) {
    return {
        quote: sanitizeString(body.quote, 500),
        authorName: sanitizeString(body.authorName, 100),
        restaurantName: sanitizeString(body.restaurantName || '', 100),
        location: sanitizeString(body.location, 100),
        date: sanitizeString(body.date || '', 50),
        rating: body.rating != null ? Math.min(5, Math.max(1, Math.round(Number(body.rating)))) : 5,
        result: sanitizeString(body.result || '', 150),
        resultIcon: sanitizeString(body.resultIcon || 'fas fa-chart-line', 50),
        tiktokUrl: sanitizeString(body.tiktokUrl || '', 300),
        featured: body.featured !== false,
        spotId: body.spotId && ObjectId.isValid(body.spotId) ? String(body.spotId) : null
    };
}

// ── MongoDB ────────────────────────────────────────

let db;

async function connectDB() {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db('ttb');
    console.log('Connected to MongoDB Atlas');

    // Create indexes
    await db.collection('spots').createIndex({ name: 1 });
    await db.collection('spots').createIndex({ tags: 1 });
    await db.collection('testimonials').createIndex({ createdAt: -1 });
    await db.collection('settings').createIndex({ key: 1 }, { unique: true });
    await db.collection('packages').createIndex({ sortOrder: 1 });
}

// ── Middleware ──────────────────────────────────────

const allowedOrigins = [
    process.env.ALLOWED_ORIGIN,
    'https://travelingtastebuds.org',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000'
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc in dev)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again in a minute' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { error: 'Too many login attempts, please try again later' }
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

// Auth middleware
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
    }
}

// ── Health Check ───────────────────────────────────

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Auth Routes ────────────────────────────────────

// Hash the admin password on first startup if not already hashed
let hashedPassword = null;

async function getHashedPassword() {
    if (hashedPassword) return hashedPassword;
    hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    return hashedPassword;
}

app.post('/api/auth/login', async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }

        const hash = await getHashedPassword();
        const match = await bcrypt.compare(password, hash);

        if (!match) {
            return res.status(401).json({ error: 'Incorrect password' });
        }

        const token = jwt.sign(
            { role: 'admin', iat: Math.floor(Date.now() / 1000) },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Logged in successfully',
            token,
            expiresIn: '24h'
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

app.post('/api/auth/verify', requireAuth, (req, res) => {
    res.json({ valid: true, role: req.admin.role });
});

// ── Spots CRUD Routes ──────────────────────────────

// GET all spots (public)
app.get('/api/spots', async (req, res) => {
    try {
        const spots = await db.collection('spots')
            .find({})
            .sort({ createdAt: -1 })
            .toArray();

        res.json({ spots, count: spots.length });
    } catch (err) {
        console.error('Error fetching spots:', err);
        res.status(500).json({ error: 'Failed to load spots. Please try again.' });
    }
});

// GET single spot (public)
app.get('/api/spots/:id', async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid spot ID' });
        }
        const spot = await db.collection('spots').findOne({ _id: new ObjectId(req.params.id) });
        if (!spot) {
            return res.status(404).json({ error: 'Spot not found' });
        }
        res.json(spot);
    } catch (err) {
        console.error('Error fetching spot:', err);
        res.status(500).json({ error: 'Failed to load spot' });
    }
});

// POST create spot (admin only)
app.post('/api/spots', requireAuth, async (req, res) => {
    try {
        const errors = validateSpot(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ error: errors.join('. ') });
        }

        const doc = buildSpotDocument(req.body);
        doc.createdAt = new Date();
        doc.updatedAt = new Date();

        const result = await db.collection('spots').insertOne(doc);
        const created = await db.collection('spots').findOne({ _id: result.insertedId });

        res.status(201).json({ message: 'Spot created successfully', spot: created });
    } catch (err) {
        console.error('Error creating spot:', err);
        res.status(500).json({ error: 'Failed to create spot. Please try again.' });
    }
});

// PUT update spot (admin only)
app.put('/api/spots/:id', requireAuth, async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid spot ID' });
        }

        const errors = validateSpot(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ error: errors.join('. ') });
        }

        const doc = buildSpotDocument(req.body);
        doc.updatedAt = new Date();

        const result = await db.collection('spots').findOneAndUpdate(
            { _id: new ObjectId(req.params.id) },
            { $set: doc },
            { returnDocument: 'after' }
        );

        if (!result) {
            return res.status(404).json({ error: 'Spot not found' });
        }

        res.json({ message: 'Spot updated successfully', spot: result });
    } catch (err) {
        console.error('Error updating spot:', err);
        res.status(500).json({ error: 'Failed to update spot. Please try again.' });
    }
});

// DELETE spot (admin only)
app.delete('/api/spots/:id', requireAuth, async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid spot ID' });
        }

        const result = await db.collection('spots').findOneAndDelete(
            { _id: new ObjectId(req.params.id) }
        );

        if (!result) {
            return res.status(404).json({ error: 'Spot not found' });
        }

        res.json({ message: 'Spot deleted successfully' });
    } catch (err) {
        console.error('Error deleting spot:', err);
        res.status(500).json({ error: 'Failed to delete spot. Please try again.' });
    }
});

// ── TikTok oEmbed proxy (admin only) ───────────────

app.post('/api/tiktok/oembed', requireAuth, async (req, res) => {
    try {
        const { url } = req.body;
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ error: 'TikTok URL is required' });
        }

        // Validate it looks like a TikTok URL
        if (!url.includes('tiktok.com/')) {
            return res.status(400).json({ error: 'Not a valid TikTok URL' });
        }

        const oembedUrl = 'https://www.tiktok.com/oembed?url=' + encodeURIComponent(url);
        const response = await fetch(oembedUrl, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'TikTok oEmbed request failed (status ' + response.status + ')' });
        }

        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('oEmbed proxy error:', err);
        res.status(500).json({ error: 'Failed to fetch TikTok data: ' + err.message });
    }
});

// Batch oEmbed for multiple URLs
app.post('/api/tiktok/oembed/batch', requireAuth, async (req, res) => {
    try {
        const { urls } = req.body;
        if (!Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({ error: 'Provide a "urls" array' });
        }
        if (urls.length > 50) {
            return res.status(400).json({ error: 'Maximum 50 URLs per batch' });
        }

        const results = await Promise.allSettled(
            urls.map(async (url) => {
                if (!url || !url.includes('tiktok.com/')) {
                    return { url, error: 'Invalid TikTok URL' };
                }
                const oembedUrl = 'https://www.tiktok.com/oembed?url=' + encodeURIComponent(url);
                const response = await fetch(oembedUrl, {
                    headers: { 'Accept': 'application/json' },
                    signal: AbortSignal.timeout(10000)
                });
                if (!response.ok) throw new Error('Status ' + response.status);
                const data = await response.json();
                return { url, ...data };
            })
        );

        const items = results.map((r, i) => {
            if (r.status === 'fulfilled') return r.value;
            return { url: urls[i], error: r.reason?.message || 'Failed' };
        });

        res.json({ results: items });
    } catch (err) {
        console.error('Batch oEmbed error:', err);
        res.status(500).json({ error: 'Batch fetch failed' });
    }
});

// ── Testimonials CRUD Routes ──────────────────────

// GET all testimonials (public) — joins linked spot data
app.get('/api/testimonials', async (req, res) => {
    try {
        const testimonials = await db.collection('testimonials')
            .find({})
            .sort({ createdAt: -1 })
            .toArray();

        // Server-side join: fetch all spots for ID match + name fallback
        const allSpots = await db.collection('spots')
            .find({})
            .project({ name: 1, logoImage: 1, logoBgColor: 1, location: 1, tiktokId: 1 })
            .toArray();

        const spotsById = {};
        const spotsByName = {};
        allSpots.forEach(s => {
            spotsById[s._id.toString()] = s;
            if (s.name) spotsByName[s.name.toLowerCase().trim()] = s;
        });

        const enriched = testimonials.map(t => {
            if (t.spotId && spotsById[t.spotId]) {
                t.spot = spotsById[t.spotId];
            } else if (t.restaurantName && spotsByName[t.restaurantName.toLowerCase().trim()]) {
                t.spot = spotsByName[t.restaurantName.toLowerCase().trim()];
            } else {
                t.spot = null;
            }
            return t;
        });

        res.json({ testimonials: enriched, count: enriched.length });
    } catch (err) {
        console.error('Error fetching testimonials:', err);
        res.status(500).json({ error: 'Failed to load testimonials' });
    }
});

// POST create testimonial (admin only)
app.post('/api/testimonials', requireAuth, async (req, res) => {
    try {
        const errors = validateTestimonial(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ error: errors.join('. ') });
        }
        const doc = buildTestimonialDocument(req.body);
        doc.createdAt = new Date();
        doc.updatedAt = new Date();
        const result = await db.collection('testimonials').insertOne(doc);
        const created = await db.collection('testimonials').findOne({ _id: result.insertedId });
        res.status(201).json({ message: 'Testimonial created', testimonial: created });
    } catch (err) {
        console.error('Error creating testimonial:', err);
        res.status(500).json({ error: 'Failed to create testimonial' });
    }
});

// PUT update testimonial (admin only)
app.put('/api/testimonials/:id', requireAuth, async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid testimonial ID' });
        }
        const errors = validateTestimonial(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ error: errors.join('. ') });
        }
        const doc = buildTestimonialDocument(req.body);
        doc.updatedAt = new Date();
        const result = await db.collection('testimonials').findOneAndUpdate(
            { _id: new ObjectId(req.params.id) },
            { $set: doc },
            { returnDocument: 'after' }
        );
        if (!result) {
            return res.status(404).json({ error: 'Testimonial not found' });
        }
        res.json({ message: 'Testimonial updated', testimonial: result });
    } catch (err) {
        console.error('Error updating testimonial:', err);
        res.status(500).json({ error: 'Failed to update testimonial' });
    }
});

// DELETE testimonial (admin only)
app.delete('/api/testimonials/:id', requireAuth, async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid testimonial ID' });
        }
        const result = await db.collection('testimonials').findOneAndDelete(
            { _id: new ObjectId(req.params.id) }
        );
        if (!result) {
            return res.status(404).json({ error: 'Testimonial not found' });
        }
        res.json({ message: 'Testimonial deleted' });
    } catch (err) {
        console.error('Error deleting testimonial:', err);
        res.status(500).json({ error: 'Failed to delete testimonial' });
    }
});

// ── Packages CRUD Routes ─────────────────────────

// GET all packages (public)
app.get('/api/packages', async (req, res) => {
    try {
        const packages = await db.collection('packages')
            .find({})
            .sort({ sortOrder: 1, createdAt: 1 })
            .toArray();
        res.json({ packages, count: packages.length });
    } catch (err) {
        console.error('Error fetching packages:', err);
        res.status(500).json({ error: 'Failed to load packages' });
    }
});

// POST create package (admin only)
app.post('/api/packages', requireAuth, async (req, res) => {
    try {
        const errors = validatePackage(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ error: errors.join('. ') });
        }
        const doc = buildPackageDocument(req.body);
        doc.createdAt = new Date();
        doc.updatedAt = new Date();
        const result = await db.collection('packages').insertOne(doc);
        const created = await db.collection('packages').findOne({ _id: result.insertedId });
        res.status(201).json({ message: 'Package created', package: created });
    } catch (err) {
        console.error('Error creating package:', err);
        res.status(500).json({ error: 'Failed to create package' });
    }
});

// PUT update package (admin only)
app.put('/api/packages/:id', requireAuth, async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid package ID' });
        }
        const errors = validatePackage(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ error: errors.join('. ') });
        }
        const doc = buildPackageDocument(req.body);
        doc.updatedAt = new Date();
        const result = await db.collection('packages').findOneAndUpdate(
            { _id: new ObjectId(req.params.id) },
            { $set: doc },
            { returnDocument: 'after' }
        );
        if (!result) {
            return res.status(404).json({ error: 'Package not found' });
        }
        res.json({ message: 'Package updated', package: result });
    } catch (err) {
        console.error('Error updating package:', err);
        res.status(500).json({ error: 'Failed to update package' });
    }
});

// DELETE package (admin only)
app.delete('/api/packages/:id', requireAuth, async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid package ID' });
        }
        const result = await db.collection('packages').findOneAndDelete(
            { _id: new ObjectId(req.params.id) }
        );
        if (!result) {
            return res.status(404).json({ error: 'Package not found' });
        }
        res.json({ message: 'Package deleted' });
    } catch (err) {
        console.error('Error deleting package:', err);
        res.status(500).json({ error: 'Failed to delete package' });
    }
});

// ── Settings Routes ───────────────────────────────

// GET trust stats (public)
app.get('/api/settings/trustStats', async (req, res) => {
    try {
        const doc = await db.collection('settings').findOne({ key: 'trustStats' });
        if (!doc) {
            // Return defaults
            return res.json({
                stats: [
                    { icon: 'fas fa-utensils', number: '50+', label: 'Restaurants Featured' },
                    { icon: 'fas fa-star', number: '5.0', label: 'Average Rating' },
                    { icon: 'fas fa-eye', number: '10M+', label: 'Total Views' },
                    { icon: 'fas fa-handshake', number: '100%', label: 'Satisfaction' }
                ]
            });
        }
        res.json({ stats: doc.stats });
    } catch (err) {
        console.error('Error fetching trust stats:', err);
        res.status(500).json({ error: 'Failed to load trust stats' });
    }
});

// PUT update trust stats (admin only)
app.put('/api/settings/trustStats', requireAuth, async (req, res) => {
    try {
        const { stats } = req.body;
        if (!Array.isArray(stats) || stats.length === 0 || stats.length > 6) {
            return res.status(400).json({ error: 'Provide a stats array (1-6 items)' });
        }
        const sanitized = stats.map(s => ({
            icon: sanitizeString(s.icon || 'fas fa-star', 50),
            number: sanitizeString(s.number || '0', 20),
            label: sanitizeString(s.label || 'Stat', 50)
        }));
        await db.collection('settings').updateOne(
            { key: 'trustStats' },
            { $set: { key: 'trustStats', stats: sanitized, updatedAt: new Date() } },
            { upsert: true }
        );
        res.json({ message: 'Trust stats updated', stats: sanitized });
    } catch (err) {
        console.error('Error updating trust stats:', err);
        res.status(500).json({ error: 'Failed to update trust stats' });
    }
});

// ── Seed endpoint (admin only, one-time) ───────────

app.post('/api/seed', requireAuth, async (req, res) => {
    try {
        const count = await db.collection('spots').countDocuments();
        if (count > 0) {
            return res.status(400).json({
                error: 'Database already has data. Delete all spots first if you want to re-seed.'
            });
        }

        const { spots } = req.body;
        if (!Array.isArray(spots) || spots.length === 0) {
            return res.status(400).json({ error: 'Provide a "spots" array in the request body' });
        }

        const docs = spots.map(s => {
            const doc = buildSpotDocument(s);
            doc.createdAt = new Date();
            doc.updatedAt = new Date();
            return doc;
        });

        const result = await db.collection('spots').insertMany(docs);
        res.json({
            message: `Successfully seeded ${result.insertedCount} spots`,
            count: result.insertedCount
        });
    } catch (err) {
        console.error('Seed error:', err);
        res.status(500).json({ error: 'Failed to seed database' });
    }
});

// When mounted under root server: pass through non-API requests to static
app.use((req, res, next) => next());

// ── Error handling ─────────────────────────────────

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

// ── Graceful error handling ───────────────────────

process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err);
});

// ── Start server (when run directly: node server.js) ──

async function start() {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`TTB API running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err.message);
        process.exit(1);
    }
}

module.exports = { app, connectDB, start };
if (require.main === module) start();
