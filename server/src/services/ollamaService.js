const axios = require('axios');

/**
 * Sends the retrieved context and user question to Ollama
 */
async function generateResponse(context, question) {
    try {
        const prompt = `
### ROLE: Shinjuku Traffic Analyst
### CONTEXT:
${context}

### USER QUESTION:
${question}

### ANSWER:`.trim();

        const response = await axios.post('http://127.0.0.1:11434/api/generate', {
            model: 'llama3', // Make sure you have pulled this model in Ollama
            prompt: prompt,
            stream: false
        });

        return response.data.response;
    } catch (error) {
        console.error('Connection Error:', error.message);
        return "I'm having trouble connecting to Shinjuku Traffic Analyst right now.";
    }
}

module.exports = { generateResponse };