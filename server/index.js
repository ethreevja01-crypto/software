const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Swagger Setup
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'ETHREE POS API',
            version: '1.0.0',
            description: 'API for ETHREE - Eat, Enjoy, Entertainment platform',
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
            },
        ],
    },
    apis: ['./routes/*.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Mock DB Initializer log
const mongoose = require('mongoose');

// Database Connection (Cached for Serverless)
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
    if (cached.conn) {
        console.log(' Using Cached MongoDB Connection');
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        const MONGO_FALLBACK = "mongodb://localhost:27017/ethree_pos";
        cached.promise = mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || MONGO_FALLBACK, opts).then((mongoose) => {
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
        next();
    } catch (error) {
        console.error('Database Connection Failed:', error);
        res.status(500).json({
            error: 'Database Connection Failed',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            hint: 'Check if MONGO_URI is set in Vercel and if IP 0.0.0.0/0 is allowed in MongoDB Atlas.',
            env_check: {
                has_mongo: !!(process.env.MONGO_URI || process.env.MONGODB_URI),
                node_env: process.env.NODE_ENV,
                db_state: mongoose.connection.readyState
            }
        });
    }
});

// Root Route
app.get('/', (req, res) => {
    res.send('E3 POS Local API is running. Check /api-docs for documentation.');
});

// Import Routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const bookingRoutes = require('./routes/bookings');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/bookings', bookingRoutes);

const loyaltyRoutes = require('./routes/loyalty');
app.use('/api/loyalty', loyaltyRoutes);

const ticketRoutes = require('./routes/tickets');
app.use('/api/tickets', ticketRoutes);

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
    });
}

module.exports = app;
