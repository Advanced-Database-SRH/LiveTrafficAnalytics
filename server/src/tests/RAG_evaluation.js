require("dotenv").config();
const fs = require('fs');
const testBench = require('./RAG_eval_bench.json');
const { searchMultimodal } = require('../services/qdrantService');
const { generateResponse } = require('../services/groqService');

const { embedText } = require('../services/embeddingService'); 

async function compileEvaluationDataset() {
    console.log("Starting LIVE Multimodal RAG Evaluation Collection...");
    const evaluationPayload = [];

    for (const testCase of testBench) {
        console.log(`\n Processing real-time query: "${testCase.query}"`);

        try {
           
            const realTextVector = await embedText(testCase.query); 
            
            const contextHits = await searchMultimodal(null, realTextVector, 3);
            
            const retrievedContext = contextHits.map(h => h.sentence || h.payload?.sentence || ""); 

            const aiAnswer = await generateResponse(JSON.stringify(contextHits), testCase.query);

            evaluationPayload.push({
                question: testCase.query,
                contexts: retrievedContext.filter(Boolean),
                answer: aiAnswer,
                ground_truth: testCase.expected_ground_truth
            });
            
            console.log(`Extracted ${retrievedContext.length} real context records from Qdrant.`);

        } catch (error) {
            console.error(`Failed to process evaluation for query "${testCase.query}":`, error);
        }
    }

    // Save out the fully populated production dataset
    fs.writeFileSync('./src/tests/rag_eval_output.json', JSON.stringify(evaluationPayload, null, 2));
    console.log("\n SUCCESS: True RAG Evaluation Corpus compiled dynamically at rag_eval_output.json!");
}

compileEvaluationDataset().catch(console.error);