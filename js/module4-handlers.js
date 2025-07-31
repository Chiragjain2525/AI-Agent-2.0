/**
 * Handles the file upload event for CSV data in Module 4.
 * Parses the CSV and displays a preview in a table.
 * @param {Event} event - The change event from the file input.
 */
export function handleDataUpload(event) {
    window.hideMessages(); // Hide any existing messages
    const file = event.target.files[0];

    if (!file) {
        return; // No file selected
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
        return window.showError('Please upload a CSV file.');
    }

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const lines = e.target.result.trim().split('\n');
            if (lines.length === 0) {
                return window.showError('Uploaded CSV file is empty.');
            }

            const headers = lines[0].split(',').map(h => h.trim());
            
            // Store parsed data globally for access by code generation
            window.uploadedData = lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.trim());
                // Map values to headers to create an array of objects
                return headers.reduce((obj, header, i) => ({ ...obj, [header]: values[i] }), {});
            });

            // Display uploaded file name
            document.getElementById('uploaded-file-name').textContent = file.name;
            
            // Generate HTML for data preview table (first 5 rows)
            const previewHtml = `
                <table class="data-preview-table">
                    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                    <tbody>${window.uploadedData.slice(0, 5).map(row => 
                        `<tr>${headers.map(h => `<td>${row[h]}</td>`).join('')}</tr>`
                    ).join('')}</tbody>
                </table>`;
            
            document.getElementById('data-preview-table-wrapper').innerHTML = previewHtml;
            document.getElementById('data-preview-container').classList.remove('hidden'); // Show preview container
            window.showSuccess('CSV file uploaded and previewed successfully!');
        } catch (err) { 
            console.error("Error parsing CSV:", err);
            window.showError('Failed to parse CSV file. Please ensure it is correctly formatted.'); 
        }
    };

    reader.readAsText(file); // Read the file as text
}

/**
 * Handles the "Generate Code" button click in Module 4.
 * Sends the user's prompt and optional language/data context to the AI.
 */
export async function handleGenerateCode() {
    window.hideMessages(); // Hide any existing messages
    const promptText = document.getElementById('code-prompt-input').value.trim();

    // Validate if a prompt is provided
    if (!promptText) {
        return window.showError('Please describe the code you want to generate.');
    }

    window.setLoadingState(true, 'AI is generating code...'); // Set loading state
    
    const container = document.getElementById('generated-code-container');
    if (container) {
        container.classList.add('hidden'); // Hide generated code container while loading
    }

    try {
        const lang = document.getElementById('programming-language-input').value.trim();
        let prompt = `Generate code for this description: "${promptText}". Provide ONLY the code, no explanations or markdown formatting.`;
        
        // Add language constraint if provided
        if (lang) {
            prompt += ` The language should be ${lang}.`;
        }
        
        // Add data context if a CSV was uploaded
        if (window.uploadedData && window.uploadedData.length > 0) {
            // Provide a sample of the data structure to the AI
            const sampleData = JSON.stringify(window.uploadedData.slice(0, 3), null, 2); // Send first 3 rows
            prompt += ` The code should process data from a variable named 'uploadedData'. Here's a sample of its structure:\n\`\`\`json\n${sampleData}\n\`\`\``;
        }

        // Call the AI assistant to generate the code
        const generatedCode = await window.callAIAssistant(prompt);
        
        // Display the generated code
        document.getElementById('generated-code-output').textContent = generatedCode;
        
        if (container) {
            container.classList.remove('hidden'); // Show the generated code container
        }
        window.showSuccess('Code generated successfully! You can now execute it.');
    } catch (error) { 
        window.showError(error.message || 'An error occurred during code generation.'); 
    } finally { 
        window.setLoadingState(false); // Reset loading state
    }
}

/**
 * Executes the generated code displayed in the output area.
 * Captures console output and displays execution errors.
 */
export function handleExecuteCode() {
    window.hideMessages(); // Hide any existing messages
    const code = document.getElementById('generated-code-output').textContent;
    const outputEl = document.getElementById('code-execution-output');

    if (!code || !outputEl) {
        return window.showError("No code to execute or output element not found.");
    }

    outputEl.textContent = ''; // Clear previous output
    let capturedOutput = '';

    // Temporarily override console.log to capture its output
    const originalConsoleLog = console.log;
    console.log = (...args) => { 
        capturedOutput += args.map(String).join(' ') + '\n'; 
    };

    try {
        // Execute the code using eval().
        // WARNING: eval() is dangerous if the code source is untrusted.
        // For this application's purpose (user-generated code for testing), it's used.
        eval(code); 
        outputEl.textContent = capturedOutput || 'Code executed with no console output.';
        window.showSuccess('Code executed successfully!');
    } catch (error) {
        outputEl.textContent = `Execution Error:\n${error.message}\n\nCaptured Output:\n${capturedOutput}`;
        window.showError('Code execution failed. Check the output for details.');
    } finally {
        // Restore original console.log
        console.log = originalConsoleLog;
    }
}
