const mongoose = require('mongoose');
const uri = "mongodb+srv://Vercel-Admin-ethree_data:zEx6FeaB7XIaDOgr@ethree-data.asjikyd.mongodb.net/ethree_pos?retryWrites=true&w=majority";

async function run() {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const count = await db.collection('products').countDocuments({name: { $regex: /COMBO/ }});
    console.log("Number of Combo Products:", count);
    const combos = await db.collection('products').find({name: { $regex: /COMBO/ }}).toArray();
    console.log(combos.map(c => `${c.name} - ${c.price}`));
    process.exit(0);
}
run().catch(console.error);
