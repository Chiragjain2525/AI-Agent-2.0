/**
 * Calls our secure Netlify function to get a response from the Gemini AI.
 * @param {string} prompt - The prompt to send to the AI.
 * @returns {Promise<string>} - The text response from the AI.
 */
export async function callAIAssistant(prompt) {
    const response = await fetch('/.netlify/functions/call-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt, type: 'text' }) // Specify type
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response.');
    }

    const result = await response.json();
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
        return result.candidates[0].content.parts[0].text;
    } else {
        console.error("Unexpected AI API response structure:", result);
        throw new Error("The AI failed to generate a valid response.");
    }
}

/**
 * Calls our secure Netlify function to generate an image.
 * @param {string} prompt - The prompt for image generation.
 * @returns {Promise<string>} - The base64-encoded image data URL.
 */
export async function callImageGenerationAPI(prompt) {
    const response = await fetch('/.netlify/functions/call-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt, type: 'image' }) // Specify type
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate image.');
    }

    const result = await response.json();
    if (result.predictions?.[0]?.bytesBase64Encoded) {
        return `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
    } else {
        console.error("Unexpected Image API response structure:", result);
        throw new Error("The Image AI failed to generate a valid response.");
    }
}


/**
 * Fetches repository data from the GitHub API. This can remain on the client-side
 * as it does not use a secret key.
 * @param {string} owner - The owner of the repository.
 * @param {string} repo - The name of the repository.
 * @returns {Promise<object>} - An object containing repository details.
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
