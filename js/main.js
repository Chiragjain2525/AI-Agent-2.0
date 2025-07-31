import { fetchRepoData, getFileContent, callAIAssistant, callImageGenerationAPI } from './api.js';

// --- GLOBAL STATE ---
let currentModule = 'module1';
let currentRepoPath = null;
let rawMarkdownContent = '';
let languageChart = null;
let lenis; // For smooth scrolling

// --- INITIALIZATION ---
console.log("main.js script started.");

// 1. Wait for the initial HTML document to be ready.
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed.");
    // 2. Start the process of loading everything else.
    loadApp();
});

async function loadApp() {
    try {
        // 3. Wait for external libraries (like THREE, Chart.js) to be available.
        await waitForDependencies();
        console.log("All external libraries are loaded.");

        // 4. Wait for all HTML templates to be fetched and inserted into the page.
        await loadAllTemplates();
        console.log("All HTML templates are loaded.");

        // 5. Now that everything is ready, initialize the application logic.
        initializeApp();
        console.log("Application initialized successfully!");

        // Set initial module title on mobile
        updateMobileModuleTitle('module1');

        // Hide the loading overlay after everything is loaded
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            // Start the smooth transition of Three.js properties
            smoothThreeJsTransition(); 

            loadingOverlay.classList.add('opacity-0'); // Start fade out
            setTimeout(() => {
                loadingOverlay.classList.add('hidden'); // Hide after fade out
            }, 700); // Match CSS transition duration
        }

    } catch (error) {
        console.error("A critical error occurred during app loading:", error);
        // Display a user-friendly error on the page itself
        document.body.innerHTML = `<div style="color: white; padding: 2rem; text-align: center; font-family: sans-serif;">
            <h1>Application Failed to Load</h1>
            <p>A critical error occurred. Please check the browser's developer console (F12) for more details.</p>
            <p><i>Error: ${error.message}</i></p>
        </div>`;
    }
}

/**
 * Checks every 100ms if the required external libraries are available on the window object.
 */
function waitForDependencies() {
    const dependencies = ['THREE', 'Lenis', 'marked', 'Chart'];
    return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
            const allLoaded = dependencies.every(dep => window[dep]);
            if (allLoaded) {
                clearInterval(interval);
                resolve();
            }
        }, 100);
        // Fail after 10 seconds if libraries don't load
        setTimeout(() => {
            clearInterval(interval);
            reject(new Error("External libraries took too long to load. Check network connection and CDN links."));
        }, 10000);
    });
}

/**
 * Loads all HTML templates concurrently and waits for them to complete.
 */
function loadAllTemplates() {
    const templates = [
        { url: 'templates/header.html', selector: '#header-placeholder' },
        { url: 'templates/module1.html', selector: '#module1-container' },
        { url: 'templates/module2.html', selector: '#module2-container' },
        { url: 'templates/module3.html', selector: '#module3-container' },
        { url: 'templates/module4.html', selector: '#module4-container' },
        { url: 'templates/special-feature.html', selector: '#special-feature-container' }
    ];
    const loadPromises = templates.map(t => loadHTML(t.url, t.selector));
    return Promise.all(loadPromises);
}

/**
 * Fetches HTML content from a file and loads it into a specified element.
 */
async function loadHTML(url, selector) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load template ${url}: ${response.statusText}`);
    const text = await response.text();
    const element = document.querySelector(selector);
    if (element) {
        element.innerHTML = text;
    } else {
        throw new Error(`Placeholder element "${selector}" not found for template "${url}".`);
    }
}

/**
 * Initializes the application's event listeners and animations.
 */
function initializeApp() {
    setupThreeJSAnimation(); // This is now called early to show during loading
    setupLenisSmoothScroll();
    // initCustomCursorEffect(); // Removed custom cursor effect
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    setupGlobalEventListeners();
}


// --- EVENT LISTENER SETUP ---

function setupGlobalEventListeners() {
    // Using event delegation on the body to ensure elements exist when listeners are attached.
    document.body.addEventListener('click', (event) => {
        const target = event.target;
        const targetId = target.id;

        // Global buttons
        if (targetId === 'analyze-btn') handleAnalyzeClick();
        if (target.closest('.tab-button')) {
            const id = target.closest('.tab-button').id;
            // Handle both desktop and mobile tab buttons
            if (id.includes('module')) {
                const moduleNum = id.replace(/^(mobile-)?tab-/, '');
                switchModule(moduleNum);
                // Close mobile menu if clicked from there
                if (id.startsWith('mobile-')) {
                    document.getElementById('mobile-module-menu')?.classList.add('hidden');
                }
            }
        }
        if (targetId === 'backToTopBtn') lenis?.scrollTo(0);
        if (targetId === 'mobile-menu-toggle' || target.closest('#mobile-menu-toggle')) {
            document.getElementById('mobile-module-menu')?.classList.toggle('hidden');
        }


        // Module 1 buttons
        if (targetId === 'copy-btn') copyToClipboard(rawMarkdownContent, 'Markdown copied to clipboard!');
        if (targetId === 'push-btn') handlePushToGitHub();
        if (targetId === 'improve-readme-btn') handleImproveReadme();
        if (target.classList.contains('commit-suggestion')) {
            const commitMessageInput = document.getElementById('commit-message');
            if (commitMessageInput) commitMessageInput.value = target.textContent;
            showSuccess('Commit message updated!');
        }

        // Module 2 file list
        const fileItem = target.closest('.file-item');
        if (fileItem && fileItem.dataset.path) {
            handleFileClick(fileItem.dataset.path);
        }

        // Module 3 buttons
        if (targetId === 'refactor-code-btn') handleRefactorCode();
        if (targetId === 'copy-refactored-btn') {
            const code = document.getElementById('refactored-code-output')?.textContent;
            copyToClipboard(code, 'Refactored code copied to clipboard!');
        }

        // Module 4 buttons
        if (targetId === 'generate-code-btn') handleGenerateCode();
        if (targetId === 'execute-code-btn') handleExecuteCode();
        if (targetId === 'copy-generated-code-btn') {
            const code = document.getElementById('generated-code-output')?.textContent;
            copyToClipboard(code, 'Generated code copied to clipboard!');
        }

        // Special Feature button
        if (targetId === 'generate-image-btn') handleGenerateImage();
    });

    // Listen for file uploads separately
    document.getElementById('data-upload-input')?.addEventListener('change', handleDataUpload);
    
    // Scroll listener for back-to-top button
    window.addEventListener('scroll', () => {
        document.getElementById('backToTopBtn')?.classList.toggle('show', window.scrollY > 300);
    });
}


// --- CORE HANDLERS ---

async function handleAnalyzeClick() {
    hideMessages();
    const repoUrl = document.getElementById('repo-url').value.trim();
    if (!isValidRepoUrl(repoUrl)) return;

    currentRepoPath = parseGithubUrl(repoUrl);
    setLoadingState(true, 'Analyzing repository...');
    document.getElementById('result-container')?.classList.add('hidden');
    document.getElementById('analysis-results-container')?.classList.add('hidden');

    try {
        const repoData = await fetchRepoData(currentRepoPath.owner, currentRepoPath.repo);
        if (currentModule === 'module1') {
            setLoadingState(true, 'AI is writing the README...');
            const prompt = `You are an expert technical writer. Create a high-quality README.md for a GitHub repository. Data: Name: ${repoData.name}, Description: ${repoData.description}, Language: ${repoData.primaryLanguage}. Include Description, Features, Installation, and Usage sections.`;
            rawMarkdownContent = await callAIAssistant(prompt);
            const readmeOutput = document.getElementById('readme-output');
            if (readmeOutput) readmeOutput.innerHTML = window.marked.parse(rawMarkdownContent);
            document.getElementById('result-container')?.classList.remove('hidden');
        } else if (currentModule === 'module2') {
            setLoadingState(true, 'Visualizing data & fetching file tree...');
            displayAnalysis(repoData);
        }
    } catch (error) {
        showError(error.message || 'An unknown error occurred.');
    } finally {
        setLoadingState(false);
    }
}

async function handleFileClick(filePath) {
    hideMessages();
    setLoadingState(true, `Fetching ${filePath}...`);
    const codeDisplaySection = document.getElementById('code-display-section');
    if (codeDisplaySection) codeDisplaySection.classList.remove('hidden');

    try {
        const fileContent = await getFileContent(currentRepoPath.owner, currentRepoPath.repo, filePath);
        if (fileContent === null) throw new Error('Could not fetch file content.');

        let displayContent = fileContent.endsWith('.ipynb')
            ? JSON.parse(fileContent).cells.filter(c => c.cell_type === 'code').map(c => c.source.join('')).join('\n\n# --- End of Cell ---\n\n')
            : fileContent;

        document.getElementById('code-file-header').textContent = `Code Viewer: ${filePath}`;
        document.getElementById('code-viewer').innerHTML = `<pre><code>${displayContent.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`;
        document.getElementById('refactor-file-path').value = filePath;
        document.getElementById('original-code-input').value = displayContent;

        const explanationLoader = document.getElementById('code-explanation-loader');
        if(explanationLoader) explanationLoader.classList.remove('hidden');
        const prompt = `Explain this code from "${filePath}". Summarize first, then break it down. Format in Markdown.\n\n\`\`\`\n${displayContent}\n\`\`\``;
        const explanation = await callAIAssistant(prompt);
        document.getElementById('code-explanation-output').innerHTML = window.marked.parse(explanation);
        if(explanationLoader) explanationLoader.classList.add('hidden');

    } catch (error) {
        showError(error.message);
    } finally {
        setLoadingState(false);
    }
}

// --- MODULE 1: README ---
async function handleImproveReadme() {
    hideMessages();
    const instruction = document.getElementById('improve-readme-input').value.trim();
    if (!instruction) return showError("Please enter an instruction.");
    setLoadingState(true, 'AI is improving the README...');
    try {
        const prompt = `Improve this README.md based on the instruction. Generate a new, complete README. Original:\n---\n${rawMarkdownContent}\n---\nInstruction: "${instruction}". Generate ONLY the full, updated Markdown.`;
        rawMarkdownContent = await callAIAssistant(prompt);
        document.getElementById('readme-output').innerHTML = window.marked.parse(rawMarkdownContent);
        showSuccess("README has been improved!");
    } catch (error) { showError(error.message); } finally { setLoadingState(false); }
}
async function handleSuggestCommits() {
    setLoadingState(true, 'AI is suggesting commit messages...');
    const container = document.getElementById('commit-suggestions-container');
    if(container) container.classList.add('hidden');
    try {
        const prompt = `Based on this README.md, generate 3-5 Conventional Commit messages. Provide ONLY the messages, each on a new line. README:\n---\n${rawMarkdownContent}\n---`;
        const suggestionsText = await callAIAssistant(prompt);
        const suggestions = suggestionsText.split('\n').filter(s => s.trim());
        if (container && suggestions.length) {
            container.innerHTML = `<p class="text-sm font-semibold text-gray-300 mb-2">Click a suggestion to use it:</p>` + 
                suggestions.map(s => `<div class="p-2 rounded-md bg-slate-700/50 text-gray-200 text-sm font-mono commit-suggestion">${s.replace(/^-/, '').trim()}</div>`).join('');
            container.classList.remove('hidden');
        } else { showError("AI couldn't generate suggestions."); }
    } catch (error) { showError(error.message); } finally { setLoadingState(false); }
}
async function handlePushToGitHub() {
    const token = document.getElementById('github-token').value.trim();
    const message = document.getElementById('commit-message').value.trim();
    if (!token || !message) return showError('Token and commit message are required.');
    setLoadingState(true, 'Pushing to repository...');
    try {
        const url = `https://api.github.com/repos/${currentRepoPath.owner}/${currentRepoPath.repo}/contents/README.md`;
        const existingFile = await fetch(url, { headers: { 'Authorization': `token ${token}` } });
        const payload = { message, content: btoa(unescape(encodeURIComponent(rawMarkdownContent))) };
        if (existingFile.ok) payload.sha = (await existingFile.json()).sha;
        const response = await fetch(url, { method: 'PUT', headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error((await response.json()).message);
        const data = await response.json();
        showSuccess(`Successfully pushed! <a href="${data.content.html_url}" target="_blank" class="underline">View commit</a>`);
    } catch (error) { showError(error.message); } finally { setLoadingState(false); }
}

// --- MODULE 2: CODE ANALYZER ---
function displayAnalysis(repoData) {
    document.getElementById('analysis-results-container')?.classList.remove('hidden');
    displayLanguageChart(repoData.languages);
    displayFileTree(repoData.branch);
}
function displayLanguageChart(languages) {
    const canvas = document.getElementById('language-chart');
    if (!canvas) return;
    if (languageChart) languageChart.destroy();
    
    // The key change is in the options object below
    languageChart = new window.Chart(canvas.getContext('2d'), {
        type: 'polarArea',
        data: {
            labels: Object.keys(languages),
            datasets: [{ 
                data: Object.values(languages), 
                backgroundColor: ['#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#14b8a6', '#10b981'] 
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: {
                r: {
                    // These options add padding and prevent the labels from being cut off
                    pointLabels: {
                        display: true,
                        centerPointLabels: true,
                        font: {
                            size: 14,
                            family: "'Poppins', sans-serif"
                        },
                        color: '#e2e8f0'
                    },
                    ticks: {
                        display: false // Hides the radial tick lines (e.g., 1.00, 2.00)
                    }
                }
            },
            plugins: { 
                legend: { 
                    position: 'bottom', 
                    labels: { 
                        color: '#e2e8f0',
                        font: {
                            family: "'Roboto', sans-serif"
                        }
                    } 
                } 
            } 
        }
    });
}
async function displayFileTree(branch) {
    const container = document.getElementById('file-list');
    if (!container) return;
    try {
        const response = await fetch(`https://api.github.com/repos/${currentRepoPath.owner}/${currentRepoPath.repo}/git/trees/${branch}?recursive=1`);
        if (!response.ok) throw new Error('Failed to fetch file tree.');
        const { tree } = await response.json();
        container.innerHTML = tree.filter(item => item.type === 'blob')
            .map(item => `<div class="file-item p-2 rounded-md flex items-center gap-3 text-sm" data-path="${item.path}"><i class="fas fa-file-code"></i><span>${item.path}</span></div>`).join('');
    } catch (error) { showError(error.message); }
}

// --- MODULE 3: REFACTOR ---
async function handleRefactorCode() {
    const code = document.getElementById('original-code-input').value.trim();
    const instruction = document.getElementById('refactor-instruction-input').value.trim();
    if (!code || !instruction) return showError("Code and instructions are required.");
    setLoadingState(true, 'AI is refactoring your code...');
    const container = document.getElementById('refactored-code-container');
    if (container) container.classList.add('hidden');
    try {
        const filePath = document.getElementById('refactor-file-path').value;
        const prompt = `Refactor this code from "${filePath}" based on this instruction: "${instruction}". Provide ONLY the refactored code, no explanations or markdown formatting.\n\n\`\`\`\n${code}\n\`\`\``;
        const refactoredCode = await callAIAssistant(prompt);
        document.getElementById('refactored-code-output').textContent = refactoredCode;
        if (container) container.classList.remove('hidden');
        showSuccess('Code refactored successfully!');
    } catch (error) { showError(error.message); } finally { setLoadingState(false); }
}

// --- MODULE 4: GENERATOR ---
function handleDataUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) return showError('Please upload a CSV file.');
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const lines = e.target.result.trim().split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            window.uploadedData = lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.trim());
                return headers.reduce((obj, header, i) => ({ ...obj, [header]: values[i] }), {});
            });
            document.getElementById('uploaded-file-name').textContent = file.name;
            const previewHtml = `
                <table class="data-preview-table">
                    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                    <tbody>${window.uploadedData.slice(0, 5).map(row => `<tr>${headers.map(h => `<td>${row[h]}</td>`).join('')}</tr>`).join('')}</tbody>
                </table>`;
            document.getElementById('data-preview-table-wrapper').innerHTML = previewHtml;
            document.getElementById('data-preview-container').classList.remove('hidden');
        } catch (err) { showError('Failed to parse CSV file.'); }
    };
    reader.readAsText(file);
}
async function handleGenerateCode() {
    const promptText = document.getElementById('code-prompt-input').value.trim();
    if (!promptText) return showError('Please describe the code you want to generate.');
    setLoadingState(true, 'AI is generating code...');
    const container = document.getElementById('generated-code-container');
    if (container) container.classList.add('hidden');
    try {
        const lang = document.getElementById('programming-language-input').value.trim();
        let prompt = `Generate code for this description: "${promptText}". Provide ONLY the code, no explanations or markdown formatting.`;
        if (lang) prompt += ` The language should be ${lang}.`;
        if (window.uploadedData) prompt += ` The code should process data from a variable named 'uploadedData'.`;
        const generatedCode = await callAIAssistant(prompt);
        document.getElementById('generated-code-output').textContent = generatedCode;
        if (container) container.classList.remove('hidden');
    } catch (error) { showError(error.message); } finally { setLoadingState(false); }
}
function handleExecuteCode() {
    const code = document.getElementById('generated-code-output').textContent;
    const outputEl = document.getElementById('code-execution-output');
    if (!code || !outputEl) return;
    outputEl.textContent = '';
    let capturedOutput = '';
    const originalConsoleLog = console.log;
    console.log = (...args) => { capturedOutput += args.map(String).join(' ') + '\n'; };
    try {
        eval(code);
        outputEl.textContent = capturedOutput || 'Code executed with no console output.';
    } catch (error) {
        outputEl.textContent = `Execution Error:\n${error.message}\n\nCaptured Output:\n${capturedOutput}`;
    } finally {
        console.log = originalConsoleLog;
    }
}

// --- SPECIAL FEATURE: IMAGE ---
async function handleGenerateImage() {
    const prompt = document.getElementById('image-prompt-input').value.trim();
    if (!prompt) return showError('Please enter an image description.');
    setLoadingState(true, 'AI is generating your image...');
    const container = document.getElementById('generated-image-container');
    if(container) container.classList.add('hidden');
    try {
        const imageUrl = await callImageGenerationAPI(prompt);
        const img = document.getElementById('generated-image-output');
        const link = document.getElementById('download-image-btn');
        if (img) img.src = imageUrl;
        if (link) {
            link.href = imageUrl;
            link.classList.remove('disabled-link');
        }
        if (container) container.classList.remove('hidden');
    } catch (error) { showError(error.message); } finally { setLoadingState(false); }
}

// --- UI & UTILITY FUNCTIONS ---
function switchModule(newModule) {
    if (newModule === currentModule) return;

    const currentModuleContainer = document.getElementById(`${currentModule}-container`);
    const newModuleContainer = document.getElementById(`${newModule}-container`);

    if (currentModuleContainer && newModuleContainer) {
        // 1. Fade out current module
        currentModuleContainer.classList.add('fade-out');
        currentModuleContainer.classList.remove('fade-in'); // Ensure fade-in is removed for next transition

        // 2. After fade-out, hide current and fade in new
        setTimeout(() => {
            currentModuleContainer.classList.add('hidden');
            currentModuleContainer.classList.remove('fade-out'); // Clean up fade-out class

            newModuleContainer.classList.remove('hidden');
            newModuleContainer.classList.add('fade-in'); // Add fade-in to new module
        }, 400); // This duration should match or be slightly less than CSS animation-duration (0.5s)

    } else {
        // Fallback for no animation or if elements not found
        document.querySelectorAll('.module-content').forEach(c => c.classList.add('hidden'));
        document.getElementById(`${newModule}-container`)?.classList.remove('hidden');
    }

    // Deactivate all tab buttons (both desktop and mobile)
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));

    // Activate the corresponding tab button (both desktop and mobile)
    document.getElementById(`tab-${newModule}`)?.classList.add('active');
    document.getElementById(`mobile-tab-${newModule}`)?.classList.add('active');

    // Update the mobile selected module title
    updateMobileModuleTitle(newModule);

    currentModule = newModule;
}

// Function to update the mobile module title
function updateMobileModuleTitle(module) {
    const titleElement = document.getElementById('mobile-selected-module-title');
    if (titleElement) {
        switch (module) {
            case 'module1':
                titleElement.textContent = 'Module 1: README Generator';
                break;
            case 'module2':
                titleElement.textContent = 'Module 2: Code Analyzer';
                break;
            case 'module3':
                titleElement.textContent = 'Module 3: Code Refactor';
                break;
            case 'module4':
                titleElement.textContent = 'Module 4: Code Generator';
                break;
            default:
                titleElement.textContent = 'Select Module';
        }
    }
}

function setLoadingState(isLoading, message = '') {
    const buttons = document.querySelectorAll('button');
    const loadingSpinner = document.getElementById('loading-spinner');
    buttons.forEach(btn => { btn.disabled = isLoading; btn.classList.toggle('opacity-50', isLoading); btn.classList.toggle('cursor-not-allowed', isLoading); });
    if (loadingSpinner) {
        loadingSpinner.classList.toggle('hidden', !isLoading);
        loadingSpinner.querySelector('p').textContent = message;
    }
}
function showError(message) { const el = document.getElementById('error-message'); if(el) { el.textContent = message; el.parentElement.classList.remove('hidden'); } }
function showSuccess(message) { const el = document.getElementById('success-message'); if(el) { el.innerHTML = message; el.parentElement.classList.remove('hidden'); } }
function hideMessages() { document.querySelectorAll('#error-box, #success-box').forEach(el => el.classList.add('hidden')); }
function parseGithubUrl(url) { try { const u = new URL(url); if (u.hostname !== 'github.com') return null; const p = u.pathname.split('/').filter(Boolean); return p.length >= 2 ? { owner: p[0], repo: p[1].replace('.git', '') } : null; } catch (e) { return null; } }
function isValidRepoUrl(url) { if (!url || !parseGithubUrl(url)) { showError('Invalid GitHub URL format.'); return false; } return true; }
function copyToClipboard(text, message) { if (!text) return; navigator.clipboard.writeText(text).then(() => showSuccess(message)).catch(() => showError('Failed to copy.')); }

// --- ANIMATION & EFFECTS ---
function setupThreeJSAnimation() {
    const canvas = document.querySelector('#bg-canvas');
    if (!canvas) return;
    const scene = new window.THREE.Scene();
    const camera = new window.THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new window.THREE.WebGLRenderer({ canvas, alpha: true }); 
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.position.setZ(30);
    const starGeometry = new window.THREE.BufferGeometry();
    // Significantly increased number of particles for a denser effect
    const numParticles = 50000; 
    const positions = new Float32Array(numParticles * 3); 
    const colors = new Float32Array(numParticles * 3); 

    // Define a few space-themed colors
    const colorPalette = [
        new window.THREE.Color(0xFFFFFF), // White
        new window.THREE.Color(0xF0F8FF), // AliceBlue
        new window.THREE.Color(0xE0FFFF), // LightCyan
        new window.THREE.Color(0xADD8E6), // LightBlue
        new window.THREE.Color(0x87CEEB), // SkyBlue
        new window.THREE.Color(0x6495ED), // CornflowerBlue
        new window.THREE.Color(0x4682B4), // SteelBlue
        new window.THREE.Color(0x8A2BE2), // BlueViolet (for subtle nebulae)
        new window.THREE.Color(0xFFC0CB), // Pink (for subtle nebulae)
        new window.THREE.Color(0xFFA07A), // LightSalmon (for subtle nebulae)
        new window.THREE.Color(0xFFFFE0)  // LightYellow
    ];

    for (let i = 0; i < positions.length; i += 3) {
        // Wider and deeper spread for particles
        positions[i] = (Math.random() - 0.5) * 1000; // X 
        positions[i + 1] = (Math.random() - 0.5) * 1000; // Y 
        positions[i + 2] = (Math.random() - 0.5) * 1000; // Z 

        // Assign random color from palette
        const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;
    }
    starGeometry.setAttribute('position', new window.THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new window.THREE.BufferAttribute(colors, 3)); // Add color attribute

    const stars = new window.THREE.Points(starGeometry, new window.THREE.PointsMaterial({ 
        vertexColors: true, // Enable vertex colors
        size: 2, // Slightly larger particles
        transparent: true,
        opacity: 0.9, // More opaque
        blending: window.THREE.AdditiveBlending // For glow effect
    }));
    scene.add(stars);

    // Make scene, camera, and stars accessible globally for loading animation control
    window.loadingScene = { scene, camera, renderer, stars }; 

    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => { 
        mouseX = (e.clientX / window.innerWidth) * 2 - 1; // Normalize to -1 to +1
        mouseY = -(e.clientY / window.innerHeight) * 2 + 1; // Normalize to -1 to +1
    });

    const animate = (time) => {
        // Subtle rotation
        stars.rotation.y += 0.0005; 
        stars.rotation.x += 0.0002;

        const positionsArray = stars.geometry.attributes.position.array;
        const particleSpeed = 0.5; // How fast particles move towards the camera
        const zDepth = 1000; // Total depth of the particle field (from -500 to 500)

        for (let i = 2; i < positionsArray.length; i += 3) { // Iterate over Z coordinates
            positionsArray[i] += particleSpeed; // Move particle forward

            // If particle moves past the camera's front plane, reset it to the back
            if (positionsArray[i] > camera.position.z + (zDepth / 2)) {
                positionsArray[i] -= zDepth; // Wrap around to the far end of the depth range
            }
        }
        stars.geometry.attributes.position.needsUpdate = true; // Crucial for Three.js to re-render updated positions

        // Enhanced camera movement based on mouse
        camera.position.x += (mouseX * 20 - camera.position.x) * 0.05; 
        camera.position.y += (mouseY * 20 - camera.position.y) * 0.05; 
        
        camera.lookAt(scene.position); // Always look at the center
        renderer.render(scene, camera);
        lenis?.raf(time);
        requestAnimationFrame(animate);
    };
    animate();
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Function to smoothly transition Three.js properties for loading screen
function smoothThreeJsTransition() {
    if (!window.loadingScene) return;

    // Set initial loading state properties
    window.loadingScene.camera.position.z = 15;
    window.loadingScene.stars.material.size = 2;
    
    // Animate these properties to their normal values
    const targetZ = 30;
    const targetSize = 1.5;
    const duration = 1500; // 1.5 seconds for the transition
    const startTime = performance.now();

    function interpolate() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1); // Clamp between 0 and 1
        const easedProgress = 0.5 - Math.cos(progress * Math.PI) / 2; // Ease-in-out easing

        // Interpolate camera Z position
        window.loadingScene.camera.position.z = 15 + (targetZ - 15) * easedProgress;
        // Interpolate particle size
        window.loadingScene.stars.material.size = 2 + (targetSize - 2) * easedProgress;

        // Animate loading rotation (this will blend into normal rotation)
        window.loadingScene.stars.rotation.y += 0.01 * (1 - easedProgress); // Slow down rotation
        window.loadingScene.stars.rotation.x += 0.005 * (1 - easedProgress); // Slow down rotation

        if (progress < 1) {
            requestAnimationFrame(interpolate);
        }
    }
    requestAnimationFrame(interpolate);
}


function setupLenisSmoothScroll() { if (typeof window.Lenis !== 'undefined') lenis = new window.Lenis(); }
function initCustomCursorEffect() {
    const colors = ["#a855f7", "#c084fc", "#e9d5ff", "#ffffff"];
    const createParticle = (x, y) => {
        const p = document.createElement('div');
        p.className = 'cursor-particle';
        document.body.appendChild(p);
        p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        p.style.left = `${x}px`;
        p.style.top = `${y}px`;
        setTimeout(() => p.remove(), 600);
    };
    document.body.addEventListener('mousemove', e => createParticle(e.clientX, e.clientY));
}
