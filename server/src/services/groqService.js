const axios = require('axios');
 
/**
 * Sends the retrieved context and user question to Ollama
 */
async function generateResponse(context, question) {
   
        const prompt = `### ROLE: Traffic Analyst
                ### CONTEXT:
                ${context}
 
                ### USER QUESTION:
                ${question}
 
                ### ANSWER:`.trim();
        try {
        // const ollamaResponse = await axios.post('http://127.0.0.1:11434/api/generate', {
        //     model: 'llama3', // Make sure you have pulled this model in Ollama
        //     prompt: prompt,
        //     stream: false
        // });
 
        const groqResponse = await axios.post('https://api.x.ai/v1/chat/completions', {
            messages: [
                { role: "system", content: "You are a Traffic Intelligence Auditor storing prompts to the cloud." },
                { role: "user", content: prompt }
            ],
            model: "llama-3.3-70b-specdec",
            stream: false
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
            }
        })
 
        const [groqResult] = await Promise.all([groqResponse]);
 
        return groqResult.data.response;
    } catch (error) {
        if (error.response) {
        // This will tell you exactly which parameter Groq didn't like
        console.error("Groq Error Details:", error.response.data);
        }
        console.error('Connection Error:', error.message);
        return "I'm having trouble connecting to Traffic Analyst right now.";
    }
}
 
module.exports = { generateResponse };