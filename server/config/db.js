const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');

async function connectDB() {
  await mongoose.connect(MONGO_URI);
  console.log(`[db] connected: ${MONGO_URI}`);
}

module.exports = { connectDB };
