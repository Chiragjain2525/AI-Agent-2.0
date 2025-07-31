/**
 * Handles the "Generate Image" button click in the Special Feature section.
 * Sends the user's prompt to the AI to generate an image.
 */
export async function handleGenerateImage() {
    window.hideMessages(); // Hide any existing messages
    const prompt = document.getElementById('image-prompt-input').value.trim();

    // Validate if an image description (prompt) is provided
    if (!prompt) {
        return window.showError('Please enter an image description to generate an image.');
    }

    window.setLoadingState(true, 'AI is generating your image...'); // Set loading state
    
    const container = document.getElementById('generated-image-container');
    if(container) {
        container.classList.add('hidden'); // Hide the image container while loading
    }

    try {
        // Call the AI image generation API
        const imageUrl = await window.callImageGenerationAPI(prompt);
        
        const img = document.getElementById('generated-image-output');
        const link = document.getElementById('download-image-btn');
        
        // Update the image source and enable the download link
        if (img) {
            img.src = imageUrl;
        }
        if (link) {
            link.href = imageUrl;
            link.classList.remove('disabled-link'); // Remove disabled state
        }
        
        if (container) {
            container.classList.remove('hidden'); // Show the generated image container
        }
        window.showSuccess('Image generated successfully! You can now download it.');
    } catch (error) { 
        window.showError(error.message || 'An error occurred during image generation.'); 
    } finally { 
        window.setLoadingState(false); // Reset loading state
    }
}
