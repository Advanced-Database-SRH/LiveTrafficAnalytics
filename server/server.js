require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { createClient } = require('redis');
const { QdrantClient } = require('@qdrant/js-client-rest');

const app = express();
app.use(express.json()); 

const redisClient = createClient({
    url: process.env.REDIS_URL
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));

const qdrantClient = new QdrantClient({
    url: process.env.QDRANT_URL
});

async function startServer() {
    try {
        console.log("Starting database connections...");

        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected successfully');

        await redisClient.connect();
        console.log('Redis connected successfully');

        const qdrantCollections = await qdrantClient.getCollections();
        console.log('Qdrant Vector DB connected successfully');

        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Node Server is running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('Failed to start server or connect to databases:', error);
        process.exit(1);
    }
}

startServer();