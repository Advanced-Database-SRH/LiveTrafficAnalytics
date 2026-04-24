const { pipeline } = require('@xenova/transformers');

let _embedder = null;

async function getEmbedder() {
    if (!_embedder) {
        console.log('[EmbeddingService] Loading all-MiniLM-L6-v2...');
        _embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log('[EmbeddingService] Model ready');
    }
    return _embedder;
}

async function embedText(text) {
    const model  = await getEmbedder();
    const output = await model(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
}

module.exports = { embedText };