const { pipeline, RawImage } = require('@xenova/transformers');

let _textEmbedder = null;
let _visionEmbedder = null;

async function getTextEmbedder() {
    if (!_textEmbedder) {
        console.log('[EmbeddingService] Loading Text Model (all-MiniLM-L6-v2)...');
        _textEmbedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log('[EmbeddingService] Text Model ready');
    }
    return _textEmbedder;
}

async function embedText(text) {
    const model = await getTextEmbedder();
    const output = await model(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data); 
}

async function getVisionEmbedder() {
    if (!_visionEmbedder) {
        console.log('[EmbeddingService] Loading Vision Model (clip-vit-base-patch32)...');
        _visionEmbedder = await pipeline('feature-extraction', 'Xenova/clip-vit-base-patch32');
        console.log('[EmbeddingService] Vision Model ready');
    }
    return _visionEmbedder;
}

async function embedImageBuffer(buffer) {
    const model = await getVisionEmbedder();  
    const image = await RawImage.read(buffer); 
    const output = await model(image);
    return Array.from(output.data); 
}

module.exports = { embedText, embedImageBuffer };