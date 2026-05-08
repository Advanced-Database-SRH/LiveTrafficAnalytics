require('dotenv').config();
const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const { createClient, RESP_TYPES } = require('redis');
const { QdrantClient } = require('@qdrant/js-client-rest');
const { ensureCollections }  = require('./src/services/qdrantService');

const { startRedisConsumer } = require('./src/services/redisConsumer');
const trafficRoutes = require('./src/routes/trafficRoute');

const { handleVideoStream } = require('./src/controllers/streamController');

const app = express();
app.use(cors());
app.use(express.json());

const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.on('error', (err) => console.error('Redis Client Error:', err));


const redisImgClient = createClient({ url: process.env.REDIS_URL })
    .withTypeMapping({
        [RESP_TYPES.BLOB_STRING]: Buffer
    });
redisImgClient.on('error', (err) => console.error('Redis Image Client Error:', err));


const qdrantClient = new QdrantClient({ url: process.env.QDRANT_URL });



app.use('/api/traffic', trafficRoutes);
app.get('/api/traffic/stream', handleVideoStream(redisImgClient));

async function startServer() {
    try {
        console.log('Starting database connections...');

        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected successfully');

        await redisClient.connect();
        console.log('Redis connected successfully');

        await redisImgClient.connect();


        await qdrantClient.getCollections();
        console.log('Qdrant connected successfully');

        await ensureCollections();

        startRedisConsumer(redisClient, redisImgClient);

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