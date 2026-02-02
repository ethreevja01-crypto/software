const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Stripe = require('stripe');
const { auth, admin } = require('../middleware/auth');

const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

/**
 * @swagger
 * /api/orders/all:
 *   get:
 *     summary: Get all orders (Admin only)
 *     tags: [Orders]
 */
router.get('/all', auth, admin, async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get user orders
 *     tags: [Orders]
 */
router.get('/', auth, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * @swagger
 * /api/orders/checkout:
 *   post:
 *     summary: Create checkout session
 *     tags: [Orders]
 */
router.post('/checkout', auth, async (req, res) => {
    try {
        const { items } = req.body;

        const order = await Order.create({
            user: req.user.id,
            items: items.map(item => ({
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                product: item.id
            })),
            totalAmount: items.reduce((acc, item) => acc + (item.price * item.quantity), 0),
            paymentMethod: 'stripe',
            paymentStatus: 'pending',
            orderStatus: 'placed'
        });

        // Mocking Stripe checkout URL
        res.json({ id: 'mock_session_id', url: `https://example.com/checkout?orderId=${order._id}` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * @swagger
 * /api/orders/clear-all:
 *   delete:
 *     summary: Delete all orders (Admin only)
 *     tags: [Orders]
 */
router.delete('/clear-all', auth, admin, async (req, res) => {
    try {
        await Order.deleteMany({});
        res.json({ message: 'All orders cleared successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
