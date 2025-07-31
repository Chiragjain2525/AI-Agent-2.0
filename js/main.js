import { fetchRepoData, getFileContent, callAIAssistant, callImageGenerationAPI } from './api.js';
import { setupThreeJSAnimation, smoothThreeJsTransition, setupLenisSmoothScroll } from './animations.js';
import { switchModule, updateMobileModuleTitle } from './module-manager.js';
import { handleAnalyzeClick } from './module1-handlers.js';
import { handleFileClick } from './module2-handlers.js';
import { handleRefactorCode } from './module3-handlers.js';
import { handleDataUpload, handleGenerateCode, handleExecuteCode } from './module4-handlers.js';
import { handleGenerateImage } from './special-feature-handlers.js';
import { setLoadingState, showError, showSuccess, hideMessages, parseGithubUrl, isValidRepoUrl, copyToClipboard } from './utils.js';
import { initializeFooter } from './footer.js';


// --- GLOBAL STATE ---
// These global states are still managed here as they are central to the application's overall behavior.
// They are exposed to the window object for easier access by other modules without explicit imports everywhere.
window.currentModule = 'module1';
window.currentRepoPath = null;
window.rawMarkdownContent = '';
window.languageChart = null; // Chart instance for module 2
window.lenis = null; // For smooth scrolling, initialized by setupLenisSmoothScroll


// Expose utility functions to the window object
window.setLoadingState = setLoadingState;
window.showError = showError;
window.showSuccess = showSuccess;
window.hideMessages = hideMessages;
window.parseGithubUrl = parseGithubUrl;
window.isValidRepoUrl = isValidRepoUrl;
window.copyToClipboard = copyToClipboard;

// Expose API functions to the window object
window.fetchRepoData = fetchRepoData;
window.getFileContent = getFileContent;
window.callAIAssistant = callAIAssistant;
window.callImageGenerationAPI = callImageGenerationAPI;

// Expose module-specific handlers that need to be globally accessible (e.g., via event listeners)
window.handleAnalyzeClick = handleAnalyzeClick;
window.handleFileClick = handleFileClick;
window.handleRefactorCode = handleRefactorCode;
window.handleDataUpload = handleDataUpload;
window.handleGenerateCode = handleGenerateCode;
window.handleExecuteCode = handleExecuteCode;
window.handleGenerateImage = handleGenerateImage;
window.switchModule = switchModule;
window.updateMobileModuleTitle = updateMobileModuleTitle;


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

            // Add 'opacity-0' class to start the fade-out transition
            loadingOverlay.classList.add('opacity-0'); 
            
            // After the transition, hide the element completely
            setTimeout(() => {
                loadingOverlay.classList.add('hidden'); 
            }, 1000); // This duration should match the CSS transition for opacity
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
    initializeFooter(); // Call the new footer initialization function
    setupGlobalEventListeners();
}


// --- EVENT LISTENER SETUP ---
// This remains in main.js as it's the central point for global event delegation.
function setupGlobalEventListeners() {
    // Using event delegation on the body to ensure elements exist when listeners are attached.
    document.body.addEventListener('click', (event) => {
        const target = event.target;
        const targetId = target.id;

        // Global buttons
        if (targetId === 'analyze-btn') window.handleAnalyzeClick(); // Call global handler
        if (target.closest('.tab-button')) {
            const id = target.closest('.tab-button').id;
            // Handle both desktop and mobile tab buttons
            if (id.includes('module')) {
                const moduleNum = id.replace(/^(mobile-)?tab-/, '');
                window.switchModule(moduleNum); // Call global module switch
                // Close mobile menu if clicked from there
                if (id.startsWith('mobile-')) {
                    document.getElementById('mobile-module-menu')?.classList.add('hidden');
                }
            }
        }
        if (targetId === 'backToTopBtn') window.lenis?.scrollTo(0); // Use global lenis instance
        if (targetId === 'mobile-menu-toggle' || target.closest('#mobile-menu-toggle')) {
            document.getElementById('mobile-module-menu')?.classList.toggle('hidden');
        }

        // Module 1 buttons
        if (targetId === 'copy-btn') window.copyToClipboard(window.rawMarkdownContent, 'Markdown copied to clipboard!');
        if (targetId === 'push-btn') window.handlePushToGitHub();
        if (targetId === 'improve-readme-btn') window.handleImproveReadme();
        if (target.classList.contains('commit-suggestion')) {
            const commitMessageInput = document.getElementById('commit-message');
            if (commitMessageInput) commitMessageInput.value = target.textContent;
            window.showSuccess('Commit message updated!');
        }

        // Module 2 file list
        const fileItem = target.closest('.file-item');
        if (fileItem && fileItem.dataset.path) {
            window.handleFileClick(fileItem.dataset.path);
        }

        // Module 3 buttons
        if (targetId === 'refactor-code-btn') window.handleRefactorCode();
        if (targetId === 'copy-refactored-btn') {
            const code = document.getElementById('refactored-code-output')?.textContent;
            window.copyToClipboard(code, 'Refactored code copied to clipboard!');
        }

        // Module 4 buttons
        if (targetId === 'generate-code-btn') window.handleGenerateCode();
        if (targetId === 'execute-code-btn') window.handleExecuteCode();
        if (targetId === 'copy-generated-code-btn') {
            const code = document.getElementById('generated-code-output')?.textContent;
            window.copyToClipboard(code, 'Generated code copied to clipboard!');
        }

        // Special Feature button
        if (targetId === 'generate-image-btn') window.handleGenerateImage();
    });

    // Listen for file uploads separately
    document.getElementById('data-upload-input')?.addEventListener('change', window.handleDataUpload);
    
    // Scroll listener for back-to-top button
    window.addEventListener('scroll', () => {
        document.getElementById('backToTopBtn')?.classList.toggle('show', window.scrollY > 300);
    });
}
