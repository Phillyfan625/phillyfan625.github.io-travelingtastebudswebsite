require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Validation helpers ─────────────────────────────

function sanitizeString(val, maxLen = 500) {
    if (typeof val !== 'string') return '';
    return val.trim().slice(0, maxLen);
}

function validateSpot(body) {
    const errors = [];
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
        errors.push('Name is required');
    }
    if (!body.tiktokId || typeof body.tiktokId !== 'string' || !body.tiktokId.trim()) {
        errors.push('TikTok Video ID is required');
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
    return errors;
}

function buildSpotDocument(body) {
    return {
        name: sanitizeString(body.name, 100),
        tiktokId: sanitizeString(body.tiktokId, 50),
        lat: Number(body.lat),
        lng: Number(body.lng),
        location: sanitizeString(body.location, 200),
        discount: sanitizeString(body.discount || '', 100),
        logoImage: sanitizeString(body.logoImage || '', 500),
        tags: Array.isArray(body.tags)
            ? body.tags.map(t => sanitizeString(t, 50).toLowerCase()).filter(Boolean)
            : [],
        rating: body.rating != null ? Math.min(10, Math.max(0, Number(body.rating))) : 0,
        snippet: sanitizeString(body.snippet || '', 300)
    };
}

// ── MongoDB ────────────────────────────────────────

let db;

async function connectDB() {
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI environment variable is not set');
    }
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db('ttb');
    console.log('Connected to MongoDB Atlas');

    // Create indexes
    await db.collection('spots').createIndex({ name: 1 });
    await db.collection('spots').createIndex({ tags: 1 });
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
        if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
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

// ── Error handling ─────────────────────────────────

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

// ── Start server ───────────────────────────────────

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

start();
