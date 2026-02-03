const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mock DB Initializer log
const mongoose = require('mongoose');

// Database Connection (Cached for Serverless)
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        const MONGO_FALLBACK = "mongodb://localhost:27017/ethree_pos";
        cached.promise = mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || MONGO_FALLBACK, opts).then((mongoose) => {
            console.log(' New MongoDB Connection Established');
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
};

// Ensure DB is connected for every request in serverless environment
app.use(async (req, res, next) => {
    try {
        await connectDB();
        console.log('[API] DB Connected. State:', mongoose.connection.readyState);
        next();
    } catch (error) {
        console.error('Database Connection Failed:', error);
        res.status(500).json({
            error: 'Database Connection Failed',
            message: error.message,
            readyState: mongoose.connection.readyState,
            hint: 'Check MONGODB_URI in Vercel and Atlas IP whitelisting (0.0.0.0/0).'
        });
    }
});

// Debugging middleware for Vercel
app.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.url}`);
    next();
});

// Import Routes from the server directory
const authRoutes = require('../server/routes/auth');
const productRoutes = require('../server/routes/products');
const orderRoutes = require('../server/routes/orders');
const bookingRoutes = require('../server/routes/bookings');
const loyaltyRoutes = require('../server/routes/loyalty');
const ticketRoutes = require('../server/routes/tickets');

// Flexible routing: Handle both /api/auth and /auth
// Vercel sometimes strips the /api prefix before passing it to the function
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/products', productRoutes);
app.use('/products', productRoutes);

app.use('/api/orders', orderRoutes);
app.use('/orders', orderRoutes);

app.use('/api/bookings', bookingRoutes);
app.use('/bookings', bookingRoutes);

app.use('/api/loyalty', loyaltyRoutes);
app.use('/loyalty', loyaltyRoutes);

app.use('/api/tickets', ticketRoutes);
app.use('/tickets', ticketRoutes);

// Root Route
app.get('/api', (req, res) => {
    res.json({
        status: 'online',
        message: 'Ethree Express API is running on Vercel.',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        dbState: mongoose.connection.readyState
    });
});

app.get('/', (req, res) => {
    res.send('Ethree Express API is running on Vercel (Root).');
});

// Export the app for Vercel
module.exports = app;
