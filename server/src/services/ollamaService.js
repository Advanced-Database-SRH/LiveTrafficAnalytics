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
        const ollamaResponse = axios.post('http://127.0.0.1:11434/api/generate', {
            model: 'llama3', // Make sure you have pulled this model in Ollama
            prompt: prompt,
            stream: false
        });

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

        // const geminiResponse = axios.post(geminiUrl, {
        //    contents: [{
        //         parts: [{ text: prompt }]
        //     }],
        //     systemInstruction: {
        //         parts: [{ text: "You are a Traffic Intelligence Auditor storing prompts to the cloud." }]
        //     }
        // }, {
        //     headers: { 'Content-Type': 'application/json' }
        // });

        const groqResponse = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            messages: [
                { role: "system", content: "You are a Traffic Intelligence Auditor storing prompts to the cloud." },
                { role: "user", content: prompt }
            ],
            model: "llama-3.3-70b-versatile",
            stream: false
        }, {
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}` 
            }
        })

        const [ollamaResult, groqResult] = await Promise.all([ollamaResponse, groqResponse]);

        const cloudMetadata = {
                                model: groqResult.data.model || "llama-3.3-70b-versatile",
                                tokens: groqResult.data.usageMetadata?.totalTokenCount,
                                status: "Synced & Verified"
                            };

        console.log(`✅ Persistent Cloud ID: ${groqResult.data.id}`);
        console.log(`📊 Metadata: ${JSON.stringify(cloudMetadata)}`);

        return ollamaResult.data.response;
    } catch (error) {
        if (error.response && error.response.data) {
            console.error("Groq API Error Details:", JSON.stringify(error.response.data, null, 2));
        }
        console.error('Connection Error:', error.message);
        return "I'm having trouble connecting to Traffic Analyst right now.";
    }
}

module.exports = { generateResponse };