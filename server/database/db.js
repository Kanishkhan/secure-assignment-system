const mongoose = require('mongoose');

let isConnecting = false;

const connectDB = async () => {
    const MONGO_URI = process.env.MONGO_URI;

    const options = {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 60000,
        maxPoolSize: 10,
        // Let Mongoose handle reconnection internally
        heartbeatFrequencyMS: 10000,
    };

    const tryConnect = async () => {
        if (isConnecting) return; // Prevent duplicate connection attempts
        isConnecting = true;
        try {
            await mongoose.connect(MONGO_URI, options);
            console.log('✅ MongoDB Connected Successfully');
        } catch (err) {
            console.error('❌ MongoDB Connection Error:', err.message);
            console.log('⏳ Retrying in 5 seconds...');
            isConnecting = false;
            setTimeout(tryConnect, 5000);
            return;
        }
        isConnecting = false;
    };

    mongoose.connection.on('disconnected', () => {
        console.warn('⚠️  MongoDB Disconnected.');
        if (!isConnecting) {
            console.log('⏳ Attempting to reconnect in 5 seconds...');
            setTimeout(tryConnect, 5000);
        }
    });

    mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB Runtime Error:', err.message);
    });

    await tryConnect();
};

module.exports = connectDB;
