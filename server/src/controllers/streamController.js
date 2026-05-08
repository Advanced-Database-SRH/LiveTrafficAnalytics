// src/controllers/streamController.js

const handleVideoStream = (redisImgClient) => async (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    const interval = setInterval(async () => {
        try {
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
};

module.exports = { handleVideoStream };