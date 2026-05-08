const { pipeline, RawImage, CLIPVisionModelWithProjection, AutoProcessor } = require('@xenova/transformers');

let _textEmbedder = null;
let _visionModel = null;
let _visionProcessor = null;
let _visionLoadingPromise = null;

async function getTextEmbedder() {
    if (!_textEmbedder) {
        console.log('[EmbeddingService] Loading Text Model (all-MiniLM-L6-v2)...');
        _textEmbedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log('[EmbeddingService] Text Model ready');
    }
    return _textEmbedder;
}

async function getVisionEmbedder() {
    if (_visionModel && _visionProcessor) return { model: _visionModel, processor: _visionProcessor };
    if (_visionLoadingPromise) return _visionLoadingPromise;

    console.log('[EmbeddingService] Initializing CLIP Vision...');
    _visionLoadingPromise = Promise.all([
        CLIPVisionModelWithProjection.from_pretrained('Xenova/clip-vit-base-patch32'),
        AutoProcessor.from_pretrained('Xenova/clip-vit-base-patch32'),
    ]).then(([model, processor]) => {
        _visionModel = model;
        _visionProcessor = processor;
        _visionLoadingPromise = null;
        console.log('[EmbeddingService] Vision Model & Processor ready');
        return { model, processor };
    }).catch(err => {
        _visionLoadingPromise = null;
        throw err;
    });

    return _visionLoadingPromise;
}

async function embedText(text) {
    const model  = await getTextEmbedder();
    const output = await model(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
}

async function embedImageBuffer(buffer) {
    try {
        const { model, processor } = await getVisionEmbedder();
 
        if (buffer[0] !== 0xFF || buffer[1] !== 0xD8 || buffer[2] !== 0xFF) {
            console.warn('[EmbeddingService] Buffer is not a valid JPEG — skipping');
            return null;
        }
 
        console.log(`[EmbeddingService] Embedding image: ${buffer.length} bytes`);
 
        const blob  = new Blob([buffer], { type: 'image/jpeg' });
        const image = await RawImage.fromBlob(blob);
 
        console.log(`[EmbeddingService] Image parsed: ${image.width}x${image.height}`);
 
        const inputs = await processor(image);
        const output = await model(inputs);
 
        return Array.from(output.image_embeds.data);
 
    } catch (error) {
        console.error('[EmbeddingService] Vision embedding error:', error.message);
        return null;
    }
}

module.exports = { embedText, embedImageBuffer };