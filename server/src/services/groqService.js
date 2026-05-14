const axios = require('axios');
 
/**
 * Sends the retrieved context and user question to Ollama
 */
async function generateResponse(context, question) {
   
            const systemPrompt = `### ROLE: Traffic Security & Intelligence Analyst
            ### DIRECTIVE: 
            You process retrieved database records (Context) to answer user queries about traffic flow and specific vehicle sightings. The context is a combination of image vector and the text vector

            ### OPERATING PARAMETERS:
            - RELY ON EVIDENCE: The context contains the Top 5 unique vehicle matches derived from Hybrid Vector Search (Text + Image). 
            - BE DIRECT: Start your answer immediately. Do not say "Based on the context provided..."
            - HIGHLIGHT ANOMALIES: If the context shows vehicles in extreme weather, unusual hours, or matching a specific visual query, point it out.
            - FORMATTING: Use bold text for **Vehicle Classes** and **Timestamps**.`;

            const userPrompt = `### DATABASE EVIDENCE:
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
 
        const groqResponse = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "llama-3.3-70b-versatile",
            stream: false
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
            }
        })
 
        // const [groqResult] = await Promise.all([groqResponse]);
 
        return groqResponse.data.choices[0].message.content;
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