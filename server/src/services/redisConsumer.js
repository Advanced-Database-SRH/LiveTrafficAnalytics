const { saveEvent } = require('./mongoService');

async function startRedisConsumer(redisClient) {
    console.log('Started — draining to mongo every 5s...');

    setInterval(async () => {
        try {
            let raw = await redisClient.rPop('traffic:events');

            while (raw) {
                const event = JSON.parse(raw);
                await saveEvent(event);
                raw = await redisClient.rPop('traffic:events');
            }
        } catch (error) {
            console.error('Error:', error.message);
        }
    }, 5000);
}

module.exports = { startRedisConsumer };