require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { createClient } = require('redis');
const { QdrantClient } = require('@qdrant/js-client-rest');
const { ensureCollections }  = require('./src/services/qdrantService');

const { startRedisConsumer } = require('./src/services/redisConsumer');
const trafficRoutes = require('./src/routes/trafficRoute');

const app = express();
app.use(express.json());

const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.on('error', (err) => console.error('Redis Client Error:', err));

const qdrantClient = new QdrantClient({ url: process.env.QDRANT_URL });

app.use('/api/traffic', trafficRoutes);

async function startServer() {
    try {
        console.log('Starting database connections...');

        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected successfully');

        await redisClient.connect();
        console.log('Redis connected successfully');

        await qdrantClient.getCollections();
        console.log('Qdrant connected successfully');

        await ensureCollections();

        startRedisConsumer(redisClient);

        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();