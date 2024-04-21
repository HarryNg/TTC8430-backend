require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB using Mongoose
const connectMongoDB = () => {
  return mongoose.connect(process.env.CONN_STRING);
};

module.exports = connectMongoDB;
