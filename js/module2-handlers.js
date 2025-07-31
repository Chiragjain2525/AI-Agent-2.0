/**
 * Displays the analysis results for Module 2, including the language chart and file tree.
 * This function is called after successful repository data fetch.
 * @param {object} repoData - Object containing repository details, languages, and branch information.
 */
export function displayAnalysis(repoData) {
    // Ensure the analysis results container is visible
    document.getElementById('analysis-results-container')?.classList.remove('hidden');
    
    // Display the language distribution chart
    displayLanguageChart(repoData.languages);
    
    // Display the file tree
    displayFileTree(repoData.branch);
}

/**
 * Renders a polar area chart showing the distribution of programming languages in the repository.
 * @param {object} languages - An object where keys are language names and values are byte counts.
 */
function displayLanguageChart(languages) {
    const canvas = document.getElementById('language-chart');
    if (!canvas) {
        console.warn("Language chart canvas not found.");
        return;
    }

    // Destroy existing chart instance if it exists to prevent multiple charts on the same canvas
    if (window.languageChart) {
        window.languageChart.destroy();
    }
    
    // Create a new Chart.js instance
    window.languageChart = new window.Chart(canvas.getContext('2d'), {
        type: 'polarArea',
        data: {
            labels: Object.keys(languages), // Language names as labels
            datasets: [{ 
                data: Object.values(languages), // Byte counts as data
                backgroundColor: [ // Predefined color palette for the chart segments
                    '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', 
                    '#0ea5e9', '#14b8a6', '#10b981', '#f59e0b',
                    '#ef4444', '#ec4899', '#8b5cf6', '#6d28d9'
                ] 
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, // Allow canvas to resize freely
            scales: {
                r: {
                    // Configure point labels (language names)
                    pointLabels: {
                        display: true,
                        centerPointLabels: true,
                        font: {
                            size: 14,
                            family: "'Poppins', sans-serif"
                        },
                        color: '#e2e8f0' // Color of the labels
                    },
                    ticks: {
                        display: false // Hide the radial tick lines (e.g., 1.00, 2.00)
                    }
                }
            },
            plugins: { 
                legend: { 
                    position: 'bottom', // Position the legend at the bottom
                    labels: { 
                        color: '#e2e8f0', // Color of legend labels
                        font: {
                            family: "'Roboto', sans-serif"
                        }
                    } 
                } 
            } 
        }
    });
}

/**
 * Fetches the file tree for the specified branch and displays it in the file list container.
 * Only 'blob' (file) items are displayed.
 * @param {string} branch - The default branch name of the repository (e.g., 'main', 'master').
 */
async function displayFileTree(branch) {
    const container = document.getElementById('file-list');
    if (!container) {
        console.warn("File list container not found.");
        return;
    }
    container.innerHTML = '<p class="text-gray-400">Loading file tree...</p>'; // Show loading message
    
    try {
        // Fetch the tree structure from GitHub API (recursive to get all files)
        const response = await fetch(`https://api.github.com/repos/${window.currentRepoPath.owner}/${window.currentRepoPath.repo}/git/trees/${branch}?recursive=1`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch file tree: ${response.statusText}`);
        }
        
        const { tree } = await response.json();
        
        // Filter for 'blob' (files) and map them to HTML elements
        const fileItemsHtml = tree.filter(item => item.type === 'blob')
            .map(item => `<div class="file-item p-2 rounded-md flex items-center gap-3 text-sm" data-path="${item.path}"><i class="fas fa-file-code"></i><span>${item.path}</span></div>`)
            .join('');
        
        container.innerHTML = fileItemsHtml || '<p class="text-gray-400">No files found or repository is empty.</p>'; // Display files or a message
    } catch (error) { 
        window.showError(error.message || 'An error occurred while fetching the file tree.'); 
        container.innerHTML = '<p class="text-red-400">Failed to load file tree.</p>'; // Display error in container
    }
}

/**
 * Handles the click event on a file item in the file explorer.
 * Fetches the file content, displays it, and requests an AI explanation.
 * @param {string} filePath - The path of the clicked file within the repository.
 */
export async function handleFileClick(filePath) {
    window.hideMessages(); // Hide any existing messages
    window.setLoadingState(true, `Fetching ${filePath}...`); // Set loading state
    
    const codeDisplaySection = document.getElementById('code-display-section');
    if (codeDisplaySection) {
        codeDisplaySection.classList.remove('hidden'); // Show the code display section
    }

    try {
        // Fetch the content of the selected file
        const fileContent = await window.getFileContent(window.currentRepoPath.owner, window.currentRepoPath.repo, filePath);
        
        if (fileContent === null) {
            throw new Error('Could not fetch file content. It might be too large or binary.');
        }

        let displayContent = fileContent;
        // Special handling for Jupyter Notebooks (.ipynb) to extract code cells
        if (filePath.endsWith('.ipynb')) {
            try {
                const notebook = JSON.parse(fileContent);
                displayContent = notebook.cells
                    .filter(c => c.cell_type === 'code') // Get only code cells
                    .map(c => c.source.join('')) // Join source lines
                    .join('\n\n# --- End of Cell ---\n\n'); // Separate cells
            } catch (parseError) {
                console.warn("Failed to parse .ipynb as JSON, displaying raw content.", parseError);
                // Fallback to raw content if parsing fails
            }
        }

        // Update the code viewer header and content
        document.getElementById('code-file-header').textContent = `Code Viewer: ${filePath}`;
        // Escape HTML entities to display code correctly within <pre><code>
        document.getElementById('code-viewer').innerHTML = `<pre><code>${displayContent.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`;
        
        // Populate inputs for Module 3 (Refactor) with the fetched code
        document.getElementById('refactor-file-path').value = filePath;
        document.getElementById('original-code-input').value = displayContent;

        // Show loading spinner for AI explanation
        const explanationLoader = document.getElementById('code-explanation-loader');
        if(explanationLoader) {
            explanationLoader.classList.remove('hidden');
        }

        // Call AI assistant to explain the code
        const prompt = `Explain this code from "${filePath}". Summarize first, then break it down. Format in Markdown.\n\n\`\`\`\n${displayContent}\n\`\`\``;
        const explanation = await window.callAIAssistant(prompt);
        
        // Render the AI explanation (Markdown to HTML)
        document.getElementById('code-explanation-output').innerHTML = window.marked.parse(explanation);
        
        // Hide AI explanation loading spinner
        if(explanationLoader) {
            explanationLoader.classList.add('hidden');
        }

    } catch (error) {
        window.showError(error.message || 'An error occurred while fetching or explaining the file.');
    } finally {
        window.setLoadingState(false); // Reset loading state
    }
}
