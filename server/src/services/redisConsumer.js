const { saveEvent } = require('./mongoService');
const { embedImageBuffer } = require('./embeddingService');

async function startRedisConsumer(redisClient, redisImgClient) {
    console.log('Started — draining to mongo every 5s...');

    setInterval(async () => {
        try {
            let raw = await redisClient.rPop('traffic:events');

            while (raw) {
                const event = JSON.parse(raw);
                const imageKey = event.linked_frame;
                let imageBuffer = null;
                let imageVector = null;

                if (imageKey && redisImgClient) {
                    imageBuffer = await redisImgClient.get(imageKey); 

                    if (imageBuffer) {
                        imageVector = await embedImageBuffer(imageBuffer);
                    } else {
                        console.warn(`[RedisConsumer] No image found for key: ${imageKey}`);
                    }
                }

                delete event.linked_frame;

                await saveEvent(event, imageBuffer, imageVector);

                if (imageKey) {
                    await redisClient.del(imageKey);
                }

                raw = await redisClient.rPop('traffic:events');
            }
        } catch (error) {
            console.error('Error:', error.message);
        }
    }, 5000);
}

module.exports = { startRedisConsumer };