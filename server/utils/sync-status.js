const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Ticket = require('../models/Ticket');
dotenv.config();

/**
 * Sync Status Utility
 * Compares Local MongoDB vs Cloud MongoDB (Atlas) to ensure all data is synced.
 */
async function checkSyncStatus() {
    const LOCAL_URI = 'mongodb://localhost:27017/ethree_pos';
    const CLOUD_URI = process.env.MONGODB_URI;

    if (!CLOUD_URI) {
        console.error('❌ MONGODB_URI not found in .env');
        process.exit(1);
    }

    try {
        console.log('--- DB Sync Status Check ---');
        
        // Connect to Local
        console.log('Connecting to Local DB...');
        const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
        const LocalTicket = localConn.model('Ticket', Ticket.schema);
        const localCount = await LocalTicket.countDocuments();
        console.log(`✅ Local: ${localCount} tickets`);

        // Connect to Cloud
        console.log('Connecting to Cloud DB...');
        const cloudConn = await mongoose.createConnection(CLOUD_URI).asPromise();
        const CloudTicket = cloudConn.model('Ticket', Ticket.schema);
        const cloudCount = await CloudTicket.countDocuments();
        console.log(`✅ Cloud: ${cloudCount} tickets`);

        const diff = localCount - cloudCount;
        if (diff > 0) {
            console.log(`⚠️  WARNING: ${diff} tickets are only on Local and NOT yet in Cloud.`);
            console.log('👉 Run `node migrate_to_cloud.js` to sync them.');
        } else if (diff < 0) {
            console.log(`ℹ️  Cloud has ${Math.abs(diff)} more tickets than Local (this is normal if multiple POS terminals sync to one cloud).`);
        } else {
            console.log('🎉 PERFECT: Local and Cloud databases are perfectly synced!');
        }

        await localConn.close();
        await cloudConn.close();
    } catch (e) {
        console.error('❌ Error during sync check:', e.message);
    } finally {
        process.exit(0);
    }
}

checkSyncStatus();
