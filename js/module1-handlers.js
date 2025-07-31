/**
 * Handles the click event for the "Analyze" button, specifically for Module 1 (README generation).
 * Fetches repository data and then calls the AI to generate a README.
 */
export async function handleAnalyzeClick() {
    window.hideMessages(); // Hide any existing messages
    const repoUrl = document.getElementById('repo-url').value.trim();

    // Validate the GitHub repository URL
    if (!window.isValidRepoUrl(repoUrl)) {
        return; // If invalid, isValidRepoUrl will show an error.
    }

    // Parse the URL to get owner and repository name
    window.currentRepoPath = window.parseGithubUrl(repoUrl);

    // Set loading state for the initial analysis
    window.setLoadingState(true, 'Analyzing repository...');
    // Hide previous results containers
    document.getElementById('result-container')?.classList.add('hidden');
    document.getElementById('analysis-results-container')?.classList.add('hidden');

    try {
        // Fetch repository data from GitHub API
        const repoData = await window.fetchRepoData(window.currentRepoPath.owner, window.currentRepoPath.repo);
        
        // If the current module is Module 1 (README Generator), proceed with README generation
        if (window.currentModule === 'module1') {
            window.setLoadingState(true, 'AI is writing the README...');
            // Construct the prompt for the AI assistant
            const prompt = `You are an expert technical writer. Create a high-quality README.md for a GitHub repository. Data: Name: ${repoData.name}, Description: ${repoData.description}, Language: ${repoData.primaryLanguage}. Include Description, Features, Installation, and Usage sections.`;
            
            // Call the AI assistant to generate the README content
            window.rawMarkdownContent = await window.callAIAssistant(prompt);
            
            // Render the Markdown content to HTML
            const readmeOutput = document.getElementById('readme-output');
            if (readmeOutput) {
                readmeOutput.innerHTML = window.marked.parse(window.rawMarkdownContent);
            }
            // Show the README output container
            document.getElementById('result-container')?.classList.remove('hidden');
        } 
    } catch (error) {
        // Display any errors that occur during the process
        window.showError(error.message || 'An unknown error occurred during analysis or README generation.');
    } finally {
        // Always reset loading state when the operation completes
        window.setLoadingState(false);
    }
}

/**
 * Handles the "Improve README" button click.
 * Sends the current README and user instruction to the AI for refinement.
 */
export async function handleImproveReadme() {
    window.hideMessages(); // Hide any existing messages
    const instruction = document.getElementById('improve-readme-input').value.trim();

    // Validate if an instruction was provided
    if (!instruction) {
        return window.showError("Please enter an instruction to improve the README.");
    }

    window.setLoadingState(true, 'AI is improving the README...');
    try {
        // Construct the prompt for improving the README
        const prompt = `Improve this README.md based on the instruction. Generate a new, complete README. Original:\n---\n${window.rawMarkdownContent}\n---\nInstruction: "${instruction}". Generate ONLY the full, updated Markdown.`;
        
        // Call the AI assistant to get the improved README
        window.rawMarkdownContent = await window.callAIAssistant(prompt);
        
        // Render the improved Markdown content to HTML
        document.getElementById('readme-output').innerHTML = window.marked.parse(window.rawMarkdownContent);
        window.showSuccess("README has been improved successfully!");
    } catch (error) { 
        window.showError(error.message || 'Failed to improve README.'); 
    } finally { 
        window.setLoadingState(false); 
    }
}

/**
 * Handles the "Suggest Commits" button click.
 * Asks the AI to suggest conventional commit messages based on the current README.
 */
export async function handleSuggestCommits() {
    window.setLoadingState(true, 'AI is suggesting commit messages...');
    const container = document.getElementById('commit-suggestions-container');
    if(container) {
        container.classList.add('hidden'); // Hide container while loading
        container.innerHTML = ''; // Clear previous suggestions
    }
    
    try {
        // Construct the prompt for commit message suggestions
        const prompt = `Based on this README.md, generate 3-5 Conventional Commit messages. Provide ONLY the messages, each on a new line. README:\n---\n${window.rawMarkdownContent}\n---`;
        
        // Call the AI assistant for suggestions
        const suggestionsText = await window.callAIAssistant(prompt);
        // Split suggestions by newline and filter out empty lines
        const suggestions = suggestionsText.split('\n').filter(s => s.trim());

        if (container && suggestions.length) {
            // Populate the container with clickable suggestions
            container.innerHTML = `<p class="text-sm font-semibold text-gray-300 mb-2">Click a suggestion to use it:</p>` + 
                suggestions.map(s => `<div class="p-2 rounded-md bg-slate-700/50 text-gray-200 text-sm font-mono commit-suggestion">${s.replace(/^-/, '').trim()}</div>`).join('');
            container.classList.remove('hidden'); // Show the suggestions container
        } else { 
            window.showError("AI couldn't generate commit suggestions."); 
        }
    } catch (error) { 
        window.showError(error.message || 'Failed to suggest commits.'); 
    } finally { 
        window.setLoadingState(false); 
    }
}

/**
 * Handles the "Push to GitHub" button click.
 * Attempts to push the generated README.md to the specified GitHub repository.
 */
export async function handlePushToGitHub() {
    const token = document.getElementById('github-token').value.trim();
    const message = document.getElementById('commit-message').value.trim();

    // Validate required inputs
    if (!token || !message) {
        return window.showError('GitHub Personal Access Token and commit message are required.');
    }

    window.setLoadingState(true, 'Pushing to repository...');
    try {
        const url = `https://api.github.com/repos/${window.currentRepoPath.owner}/${window.currentRepoPath.repo}/contents/README.md`;
        
        // Check if the README.md file already exists to get its SHA (required for updates)
        const existingFileResponse = await fetch(url, { 
            headers: { 'Authorization': `token ${token}` } 
        });

        const payload = { 
            message: message, 
            // Content must be Base64 encoded for GitHub API
            content: btoa(unescape(encodeURIComponent(window.rawMarkdownContent))) 
        };

        // If the file exists, add its SHA to the payload for updating
        if (existingFileResponse.ok) {
            const existingFileData = await existingFileResponse.json();
            payload.sha = existingFileData.sha;
        }

        // Make the PUT request to update/create the README.md file
        const response = await fetch(url, { 
            method: 'PUT', 
            headers: { 
                'Authorization': `token ${token}`, 
                'Content-Type': 'application/json' 
            }, 
            body: JSON.stringify(payload) 
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to push to GitHub.');
        }

        const data = await response.json();
        window.showSuccess(`Successfully pushed! <a href="${data.content.html_url}" target="_blank" class="underline">View commit</a>`);
    } catch (error) { 
        window.showError(error.message || 'An error occurred while pushing to GitHub.'); 
    } finally { 
        window.setLoadingState(false); 
    }
}
