import { fetchRepoData, getFileContent, callAIAssistant, callImageGenerationAPI } from './api.js';

// --- GLOBAL STATE ---
let currentModule = 'module1';
let currentRepoPath = null;
let rawMarkdownContent = '';
let languageChart = null;
let lenis; // For smooth scrolling
let currentRepoAnalysisData = null;

// --- INITIALIZATION ---
console.log("main.js script started.");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed.");
    loadApp();
});

async function loadApp() {
    try {
        await waitForDependencies();
        console.log("All external libraries are loaded.");

        await loadAllTemplates();
        console.log("All HTML templates are loaded.");

        initializeApp();
        console.log("Application initialized successfully!");

        setTimeout(() => {
            document.getElementById('preloader')?.classList.add('preloader-hidden');
        }, 500);

    } catch (error) {
        console.error("A critical error occurred during app loading:", error);
        document.getElementById('preloader')?.classList.add('preloader-hidden');
        document.body.innerHTML = `<div style="color: white; padding: 2rem; text-align: center; font-family: sans-serif;">
            <h1>Application Failed to Load</h1>
            <p>A critical error occurred. Please check the browser's developer console (F12) for more details.</p>
            <p><i>Error: ${error.message}</i></p>
        </div>`;
    }
}

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
        setTimeout(() => {
            clearInterval(interval);
            reject(new Error("External libraries took too long to load."));
        }, 10000);
    });
}

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

function initializeApp() {
    setupThreeJSAnimation();
    setupLenisSmoothScroll();
    initCustomCursorEffect();
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    setupGlobalEventListeners();
    setupScrollListener();

    setTimeout(() => {
        document.body.classList.add('page-loaded');
        if(lenis) {
            lenis.scrollTo(0, { immediate: true });
        } else {
            window.scrollTo(0, 0);
        }
    }, 100);
}


// --- EVENT LISTENER SETUP ---

function setupGlobalEventListeners() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    mobileMenuButton?.addEventListener('click', () => {
        mobileMenu?.classList.toggle('hidden');
        mobileMenuButton.querySelector('svg').classList.toggle('rotate-180');
    });

    document.body.addEventListener('click', (event) => {
        const target = event.target;
        const targetId = target.id;

        if (targetId === 'analyze-btn') handleAnalyzeClick();
        if (target.closest('.tab-button')) {
            const id = target.closest('.tab-button').id;
            if (id === 'tab-module1') switchModule('module1');
            if (id === 'tab-module2') switchModule('module2');
            if (id === 'tab-module3') switchModule('module3');
            if (id === 'tab-module4') switchModule('module4');
        }
        if (target.closest('.mobile-menu-item')) {
            event.preventDefault();
            const module = target.closest('.mobile-menu-item').dataset.module;
            switchModule(module);
            mobileMenu?.classList.add('hidden');
            mobileMenuButton.querySelector('svg').classList.remove('rotate-180');
        }
        if (targetId === 'backToTopBtn') lenis?.scrollTo(0);
        if (targetId === 'copy-btn') copyToClipboard(rawMarkdownContent, 'Markdown copied to clipboard!');
        if (targetId === 'push-btn') handlePushToGitHub();
        if (targetId === 'improve-readme-btn') handleImproveReadme();
        if (targetId === 'suggest-commit-btn') handleSuggestCommits();
        if (target.classList.contains('commit-suggestion')) {
            const commitMessageInput = document.getElementById('commit-message');
            if (commitMessageInput) commitMessageInput.value = target.textContent;
            showSuccess('Commit message updated!');
        }
        if (targetId === 'refactor-code-btn') handleRefactorCode();
        if (targetId === 'copy-refactored-btn') {
            const code = document.getElementById('refactored-code-output')?.textContent;
            copyToClipboard(code, 'Refactored code copied to clipboard!');
        }
        if (targetId === 'generate-code-btn') handleGenerateCode();
        if (targetId === 'execute-code-btn') handleExecuteCode();
        if (targetId === 'copy-generated-code-btn') {
            const code = document.getElementById('generated-code-output')?.textContent;
            copyToClipboard(code, 'Generated code copied to clipboard!');
        }
        if (targetId === 'generate-image-btn') handleGenerateImage();
    });
    
    // FIXED: Event delegation for the file tree is now more specific
    document.getElementById('module2-container')?.addEventListener('click', (event) => {
        const target = event.target;
        // For clicking on a file
        const fileItem = target.closest('.file-item');
        if (fileItem && fileItem.dataset.path) {
            handleFileClick(fileItem.dataset.path);
        }
        // For clicking on a folder to expand/collapse
        const folderItem = target.closest('.folder-item');
        if (folderItem) {
            folderItem.classList.toggle('open');
            const nextUl = folderItem.nextElementSibling;
            if (nextUl && nextUl.tagName === 'UL') {
                nextUl.classList.toggle('hidden');
            }
        }
    });

    document.getElementById('data-upload-input')?.addEventListener('change', handleDataUpload);
    
    window.addEventListener('scroll', () => {
        document.getElementById('backToTopBtn')?.classList.toggle('show', window.scrollY > 300);
    });
}

// --- SCROLL LISTENER FOR HEADER ---
function setupScrollListener() {
    const header = document.getElementById('main-header');
    if (!header) return;
    const scrollHandler = (scrollTop) => {
        header.classList.toggle('header-hidden', scrollTop > 50);
    };

    if (lenis) {
        lenis.on('scroll', (e) => scrollHandler(e.scroll));
    } else {
        window.addEventListener('scroll', () => scrollHandler(window.pageYOffset || document.documentElement.scrollTop), false);
    }
}


// --- CORE HANDLERS ---
async function handleAnalyzeClick() {
    hideMessages();
    const repoUrl = document.getElementById('repo-url').value.trim();
    if (!isValidRepoUrl(repoUrl)) return;

    currentRepoPath = parseGithubUrl(repoUrl);
    currentRepoAnalysisData = null;
    document.getElementById('result-container')?.classList.add('hidden');
    document.getElementById('analysis-results-container')?.classList.add('hidden');
    
    setLoadingState(true, 'Analyzing repository...');

    try {
        const repoData = await fetchRepoData(currentRepoPath.owner, currentRepoPath.repo);
        const readmePrompt = `You are an expert technical writer. Create a high-quality README.md for a GitHub repository. Data: Name: ${repoData.name}, Description: ${repoData.description}, Language: ${repoData.primaryLanguage}. Include Description, Features, Installation, and Usage sections.`;
        const readmeMarkdown = await callAIAssistant(readmePrompt);

        currentRepoAnalysisData = {
            repoDetails: repoData,
            readmeMarkdown: readmeMarkdown,
            readmeHtml: window.marked.parse(readmeMarkdown)
        };
        
        rawMarkdownContent = readmeMarkdown;

        renderCurrentModuleView();

    } catch (error) {
        showError(error.message || 'An unknown error occurred.');
    } finally {
        setLoadingState(false);
    }
}

function renderCurrentModuleView() {
    if (!currentRepoAnalysisData) return;

    switch (currentModule) {
        case 'module1':
            renderModule1(currentRepoAnalysisData);
            break;
        case 'module2':
            renderModule2(currentRepoAnalysisData);
            break;
    }
}

function renderModule1(data) {
    const readmeOutput = document.getElementById('readme-output');
    if (readmeOutput) {
        readmeOutput.innerHTML = data.readmeHtml;
        document.getElementById('result-container')?.classList.remove('hidden');
    }
}

function renderModule2(data) {
    displayAnalysis(data.repoDetails);
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
        if(currentRepoAnalysisData) {
            currentRepoAnalysisData.readmeMarkdown = rawMarkdownContent;
            currentRepoAnalysisData.readmeHtml = window.marked.parse(rawMarkdownContent);
        }
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
            scales: { r: { pointLabels: { display: true, centerPointLabels: true, font: { size: 14, family: "'Poppins', sans-serif" }, color: '#e2e8f0' }, ticks: { display: false } } },
            plugins: { legend: { position: 'bottom', labels: { color: '#e2e8f0', font: { family: "'Roboto', sans-serif" } } } } 
        }
    });
}

/**
 * FIXED: This function now builds and displays a hierarchical file tree.
 * @param {string} branch - The name of the branch to fetch the tree for.
 */
async function displayFileTree(branch) {
    const container = document.getElementById('file-list');
    if (!container) return;
    container.innerHTML = '<div class="text-center text-gray-400">Loading file tree...</div>'; // Loading state

    try {
        const response = await fetch(`https://api.github.com/repos/${currentRepoPath.owner}/${currentRepoPath.repo}/git/trees/${branch}?recursive=1`);
        if (!response.ok) throw new Error('Failed to fetch file tree.');
        const { tree: fileList } = await response.json();

        // 1. Build the tree structure
        const fileTree = {};
        fileList.forEach(item => {
            if (item.type !== 'blob') return; // Only process files
            let currentLevel = fileTree;
            const pathParts = item.path.split('/');
            pathParts.forEach((part, index) => {
                if (index === pathParts.length - 1) {
                    // It's a file
                    currentLevel[part] = {
                        __isFile: true,
                        path: item.path,
                    };
                } else {
                    // It's a directory
                    if (!currentLevel[part]) {
                        currentLevel[part] = { __isDirectory: true };
                    }
                    currentLevel = currentLevel[part];
                }
            });
        });

        // 2. Generate HTML from the tree structure
        const generateHtml = (tree) => {
            const sortedKeys = Object.keys(tree).sort((a, b) => {
                const aIsFile = tree[a].__isFile;
                const bIsFile = tree[b].__isFile;
                if (!aIsFile && bIsFile) return -1; // Directories first
                if (aIsFile && !bIsFile) return 1;
                return a.localeCompare(b); // Then sort alphabetically
            });

            let html = '<ul class="file-tree-ul">';
            for (const key of sortedKeys) {
                const node = tree[key];
                if (node.__isFile) {
                    html += `
                        <li class="file-item" data-path="${node.path}">
                            <i class="fas fa-file-code file-icon"></i>
                            <span>${key}</span>
                        </li>`;
                } else if (node.__isDirectory) {
                    html += `
                        <li>
                            <div class="folder-item">
                                <i class="fas fa-folder folder-icon"></i>
                                <span>${key}</span>
                            </div>
                            ${generateHtml(node)}
                        </li>`;
                }
            }
            html += '</ul>';
            return html;
        };
        
        container.innerHTML = generateHtml(fileTree);

    } catch (error) {
        showError(error.message);
        container.innerHTML = '<div class="text-center text-red-400">Could not load file tree.</div>';
    }
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
function switchModule(newModuleId) {
    if (newModuleId === currentModule) return;

    const tabsContainer = document.getElementById('desktop-tabs'); 
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const currentModuleEl = document.getElementById(`${currentModule}-container`);
    const newModuleEl = document.getElementById(`${newModuleId}-container`);

    if (!currentModuleEl || !newModuleEl) {
        console.error(`Module container not found for ${currentModule} or ${newModuleId}`);
        return;
    }

    tabsContainer?.classList.add('pointer-events-none');
    mobileMenuButton?.classList.add('pointer-events-none', 'opacity-50');

    currentModuleEl.classList.add('animate__animated', 'animate__slideFadeOut');

    currentModuleEl.addEventListener('animationend', function handleAnimationOut() {
        this.classList.remove('animate__animated', 'animate__slideFadeOut');
        this.classList.add('hidden');
        
        newModuleEl.classList.remove('hidden');
        newModuleEl.classList.add('animate__animated', 'animate__slideFadeIn');

        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.getElementById(`tab-${newModuleId}`)?.classList.add('active');

        const mobileMenuTitle = document.getElementById('mobile-menu-title');
        const mobileMenuItems = document.querySelectorAll('.mobile-menu-item');
        mobileMenuItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.module === newModuleId) {
                item.classList.add('active');
                if(mobileMenuTitle) mobileMenuTitle.textContent = item.textContent.trim();
            }
        });

        currentModule = newModuleId;
        
        renderCurrentModuleView();

        newModuleEl.addEventListener('animationend', function handleAnimationIn() {
            this.classList.remove('animate__animated', 'animate__slideFadeIn');
            tabsContainer?.classList.remove('pointer-events-none');
            mobileMenuButton?.classList.remove('pointer-events-none', 'opacity-50');
        }, { once: true });

    }, { once: true });
}

function setLoadingState(isLoading, message = '') {
    const buttons = document.querySelectorAll('button:not(#backToTopBtn)');
    const loadingSpinner = document.getElementById('loading-spinner');
    buttons.forEach(btn => { 
        btn.disabled = isLoading; 
        btn.classList.toggle('opacity-50', isLoading); 
        btn.classList.toggle('cursor-not-allowed', isLoading); 
    });
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
    const positions = new Float32Array(6000 * 3);
    for (let i = 0; i < positions.length; i++) { positions[i] = (Math.random() - 0.5) * 600; }
    starGeometry.setAttribute('position', new window.THREE.BufferAttribute(positions, 3));
    const stars = new window.THREE.Points(starGeometry, new window.THREE.PointsMaterial({ color: 0xffffff, size: 0.7 }));
    scene.add(stars);
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });
    const animate = (time) => {
        stars.rotation.y += 0.0001;
        camera.position.x += (mouseX - camera.position.x * 200) * 0.0001;
        camera.position.y += (-mouseY - camera.position.y * 200) * 0.0001;
        camera.lookAt(scene.position);
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
