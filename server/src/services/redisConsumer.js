//const { saveEvent } = require("./mongoService.js");
import { saveEvent } from "./mongoService.js";

export async function startRedisConsumer(redisClient) {
  console.log("Started — draining to mongo every 5s...");

  setInterval(async () => {
    try {
      let raw = await redisClient.rPop("traffic:events");
      let count = 0;

      while (raw) {
        const event = JSON.parse(raw);
        await saveEvent(event);
        count++;
        raw = await redisClient.rPop("traffic:events");
      }
      if (count > 0) {
        console.log(
          `[CONSUMER] Successfully processed ${count} events from Redis.`
        );
      }
    } catch (error) {
      console.error("Error:", error.message);
    }
  }, 5000);
}

// module.exports = { startRedisConsumer };
