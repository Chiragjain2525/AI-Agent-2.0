// This file contains all the functions for interacting with external APIs.

// The ExponentialBackoff utility is included here to make the file self-contained.
class ExponentialBackoff {
    constructor(maxRetries = 5, initialDelay = 1000) {
        this.maxRetries = maxRetries;
        this.initialDelay = initialDelay;
        this.retries = 0;
    }

    async run(fn) {
        while (this.retries < this.maxRetries) {
            try {
                await fn();
                return;
            } catch (error) {
                this.retries++;
                if (this.retries >= this.maxRetries) {
                    throw error;
                }
                const delay = this.initialDelay * Math.pow(2, this.retries);
                console.warn(`Retrying in ${delay}ms due to:`, error.message);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
}


// IMPORTANT: Your API key will be automatically provided by the Canvas environment.
// Do not paste your own API key here.
const apiKey = "";
const textModel = "gemini-2.5-flash-preview-05-20";
const imageGenModel = "imagen-3.0-generate-002";
const imageEditModel = "gemini-2.0-flash-preview-image-generation";


/**
 * Fetches repository data from the GitHub API.
 * @param {string} owner - The owner of the repository.
 * @param {string} repo - The name of the repository.
 * @returns {Promise<object>} An object containing repository details.
 */
export async function fetchRepoData(owner, repo) {
    const GITHUB_API_BASE = 'https://api.github.com/repos/';
    const fetchJson = async (url) => {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`GitHub API request failed: ${response.statusText} (${response.status})`);
        }
        return response.json();
    };
    const [details, languages] = await Promise.all([
        fetchJson(`${GITHUB_API_BASE}${owner}/${repo}`),
        fetchJson(`${GITHUB_API_BASE}${owner}/${repo}/languages`)
    ]);
    return {
        name: details.name,
        description: details.description || 'No description provided.',
        primaryLanguage: details.language,
        languages,
        branch: details.default_branch
    };
}

/**
 * Fetches the content of a specific file from a GitHub repository.
 * @param {string} owner - The owner of the repository.
 * @param {string} repo - The name of the repository.
 * @param {string} path - The path to the file within the repository.
 * @returns {Promise<string|null>} - The decoded content of the file, or null if not found.
 */
export async function getFileContent(owner, repo, path) {
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`);
        if (!response.ok) return null;
        const data = await response.json();
        // The content is base64 encoded, so we need to decode it.
        return atob(data.content);
    } catch (error) {
        console.warn(`Could not fetch ${path}:`, error);
        return null;
    }
}

/**
 * Calls the Gemini API to generate text based on a given prompt.
 * Uses exponential backoff for retries.
 * @param {string} prompt - The text prompt for the AI.
 * @returns {string} The AI-generated text.
 */
export async function callAIAssistant(prompt) {
    const backoff = new ExponentialBackoff();
    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${textModel}:generateContent?key=${apiKey}`;

    let response;
    try {
        await backoff.run(async () => {
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                // If it's a rate limit error, throw to trigger a retry
                if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Retrying...');
                }
                const errorData = await response.json();
                throw new Error(errorData.error.message || 'API request failed.');
            }
        });
        const result = await response.json();
        
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            return result.candidates[0].content.parts[0].text;
        } else {
            throw new Error("Invalid response from API.");
        }
    } catch (error) {
        console.error("Error in callAIAssistant:", error);
        throw new Error(`AI assistant failed to respond: ${error.message}`);
    }
}


/**
 * Calls the Gemini API to generate an image from a text prompt.
 * @param {string} prompt - The text description for the image.
 * @returns {string} The data URL of the generated image.
 */
export async function callImageGenerationAPI(prompt) {
    const backoff = new ExponentialBackoff();
    const payload = {
        instances: { prompt: prompt },
        parameters: { "sampleCount": 1 }
    };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${imageGenModel}:predict?key=${apiKey}`;
    
    let response;
    try {
        await backoff.run(async () => {
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Retrying...');
                }
                const errorData = await response.json();
                throw new Error(errorData.error.message || 'API request failed.');
            }
        });

        const result = await response.json();
        const base64Data = result?.predictions?.[0]?.bytesBase64Encoded;

        if (base64Data) {
            return `data:image/png;base64,${base64Data}`;
        } else {
            throw new Error("Invalid response from image generation API.");
        }
    } catch (error) {
        console.error("Error in callImageGenerationAPI:", error);
        throw new Error(`Image generation failed: ${error.message}`);
    }
}

/**
 * Calls the Gemini API to edit an image based on a text prompt.
 * @param {string} imageDataBase64 - The base64-encoded image data.
 * @param {string} prompt - The text prompt for editing the image.
 * @returns {string} The data URL of the edited image.
 */
export async function callImageEditingAPI(imageDataBase64, prompt) {
    const backoff = new ExponentialBackoff();
    const payload = {
        contents: [
            {
                role: "user",
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: "image/jpeg", // Assuming JPEG for now
                            data: imageDataBase64
                        }
                    }
                ]
            }
        ],
    };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${imageEditModel}:generateContent?key=${apiKey}`;

    let response;
    try {
        await backoff.run(async () => {
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Retrying...');
                }
                const errorData = await response.json();
                throw new Error(errorData.error.message || 'API request failed.');
            }
        });

        const result = await response.json();
        const base64Data = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

        if (base64Data) {
            return `data:image/png;base64,${base64Data}`;
        } else {
            throw new Error("Invalid response from image editing API.");
        }
    } catch (error) {
        console.error("Error in callImageEditingAPI:", error);
        throw new Error(`Image editing failed: ${error.message}`);
    }
}
