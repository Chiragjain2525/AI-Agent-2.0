/**
 * Handles the "Refactor Code" button click in Module 3.
 * Sends the original code and user's refactoring instruction to the AI.
 */
export async function handleRefactorCode() {
    window.hideMessages(); // Hide any existing messages

    const code = document.getElementById('original-code-input').value.trim();
    const instruction = document.getElementById('refactor-instruction-input').value.trim();

    // Validate if both code and instruction are provided
    if (!code || !instruction) {
        return window.showError("Please provide both the code to refactor and an instruction.");
    }

    window.setLoadingState(true, 'AI is refactoring your code...'); // Set loading state
    
    const container = document.getElementById('refactored-code-container');
    if (container) {
        container.classList.add('hidden'); // Hide the refactored code container while loading
    }

    try {
        const filePath = document.getElementById('refactor-file-path').value; // Get the file path for context
        
        // Construct the prompt for the AI refactoring
        const prompt = `Refactor this code from "${filePath}" based on this instruction: "${instruction}". Provide ONLY the refactored code, no explanations or markdown formatting.\n\n\`\`\`\n${code}\n\`\`\``;
        
        // Call the AI assistant to get the refactored code
        const refactoredCode = await window.callAIAssistant(prompt);
        
        // Display the refactored code
        document.getElementById('refactored-code-output').textContent = refactoredCode;
        
        if (container) {
            container.classList.remove('hidden'); // Show the refactored code container
        }
        window.showSuccess('Code refactored successfully!');
    } catch (error) { 
        window.showError(error.message || 'An error occurred during code refactoring.'); 
    } finally { 
        window.setLoadingState(false); // Reset loading state
    }
}
