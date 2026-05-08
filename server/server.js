require('dotenv').config();
const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const { createClient, RESP_TYPES } = require('redis');
const { QdrantClient } = require('@qdrant/js-client-rest');
const { ensureCollections }  = require('./src/services/qdrantService');

const { startRedisConsumer } = require('./src/services/redisConsumer');
const trafficRoutes = require('./src/routes/trafficRoute');

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


// --- SINGLE FRAME TEST ROUTE ---
app.get('/api/traffic/test-frame', async (req, res) => {
    try {
        // Fetch raw buffer
        const frameBuffer = await redisImgClient.get(
            commandOptions({ returnBuffers: true }), 
            'traffic:frame:live'
        );

        if (!frameBuffer) {
            return res.status(404).send("Key found, but data is empty.");
        }

        // Send as a standard, single static image
        res.set('Content-Type', 'image/jpeg');
        res.set('Content-Length', frameBuffer.length);
        res.send(frameBuffer);

    } catch (err) {
        console.error("Test Route Error:", err);
        res.status(500).send(`Error reading from Redis: ${err.message}`);
    }
});

// --- LIVE VIDEO STREAM ROUTE ---
app.get('/api/traffic/stream', async (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    const interval = setInterval(async () => {
        try {
            // In v5, redisImgClient now natively returns raw Buffers
            const frameBuffer = await redisImgClient.get('traffic:frame:live');

            if (frameBuffer && Buffer.isBuffer(frameBuffer)) {
                res.write(`--frame\r\n`);
                res.write(`Content-Type: image/jpeg\r\n`);
                res.write(`Content-Length: ${frameBuffer.length}\r\n\r\n`);
                res.write(frameBuffer); 
                res.write(`\r\n`);
            }
        } catch (err) {
            console.error("Error fetching live frame:", err);
        }
    }, 100);

    req.on('close', () => {
        clearInterval(interval);
        res.end();
    });
});

app.use('/api/traffic', trafficRoutes);

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