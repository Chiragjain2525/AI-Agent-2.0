// This is a Netlify serverless function.
// It acts as a secure proxy to the Google AI APIs.

// We use node-fetch to make HTTP requests from the backend.
const fetch = require('node-fetch');

exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Get the secret API key from Netlify's environment variables
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            throw new Error("API key is not set in the environment variables.");
        }

        // Parse the data sent from the client-side api.js
        const body = JSON.parse(event.body);
        const { prompt, type, image } = body;

        let apiUrl;
        let apiPayload;
        let model;

        // Determine which Google API to call based on the 'type'
        if (type === 'text') {
            model = 'gemini-2.5-flash-preview-05-20';
            apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            apiPayload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
        } else if (type === 'image') {
            model = 'imagen-3.0-generate-002';
            apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;
            apiPayload = { instances: { prompt: prompt }, parameters: { "sampleCount": 1 } };
        } else if (type === 'image_edit') {
            model = 'gemini-2.0-flash-preview-image-generation';
            apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            apiPayload = {
                contents: [{
                    parts: [{ text: prompt }, {
                        inlineData: {
                            mimeType: "image/jpeg", // Assuming all images are sent as JPEGs
                            data: image
                        }
                    }]
                }],
                generationConfig: {
                    responseModalities: ['TEXT', 'IMAGE']
                }
            };
        } else {
            return { statusCode: 400, body: 'Invalid request type specified.' };
        }

        // Make the actual call to the Google AI API
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apiPayload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Google API Error for model ${model}:`, errorBody);
            return { statusCode: response.status, body: `Google API Error: ${errorBody}` };
        }

        const data = await response.json();

        // Return the successful response back to the client
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error('Serverless function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
