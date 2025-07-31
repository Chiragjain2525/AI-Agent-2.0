/**
 * Sets the loading state of the application, disabling buttons and showing/hiding a loading spinner.
 * @param {boolean} isLoading - True to show loading state, false to hide.
 * @param {string} [message=''] - Optional message to display in the loading spinner.
 */
export function setLoadingState(isLoading, message = '') {
    const buttons = document.querySelectorAll('button');
    const loadingSpinner = document.getElementById('loading-spinner');

    // Disable/enable all buttons and apply visual feedback
    buttons.forEach(btn => { 
        btn.disabled = isLoading; 
        btn.classList.toggle('opacity-50', isLoading); 
        btn.classList.toggle('cursor-not-allowed', isLoading); 
    });

    // Show/hide the loading spinner and update its message
    if (loadingSpinner) {
        loadingSpinner.classList.toggle('hidden', !isLoading);
        const loadingMessageEl = loadingSpinner.querySelector('p');
        if (loadingMessageEl) {
            loadingMessageEl.textContent = message;
        }
    }
}

/**
 * Displays an error message to the user.
 * @param {string} message - The error message to display.
 */
export function showError(message) { 
    const el = document.getElementById('error-message'); 
    const box = document.getElementById('error-box');
    if(el && box) { 
        el.textContent = message; 
        box.classList.remove('hidden'); // Show the error box
        box.classList.add('animate-header-pop'); // Apply animation
    }
    // Automatically hide after a few seconds
    setTimeout(() => {
        if (box) box.classList.add('hidden');
    }, 5000);
}

/**
 * Displays a success message to the user.
 * @param {string} message - The success message to display (can contain HTML).
 */
export function showSuccess(message) { 
    const el = document.getElementById('success-message'); 
    const box = document.getElementById('success-box');
    if(el && box) { 
        el.innerHTML = message; // Use innerHTML to allow for links or bold text
        box.classList.remove('hidden'); // Show the success box
        box.classList.add('animate-header-pop'); // Apply animation
    }
    // Automatically hide after a few seconds
    setTimeout(() => {
        if (box) box.classList.add('hidden');
    }, 5000);
}

/**
 * Hides all error and success message boxes.
 */
export function hideMessages() { 
    document.querySelectorAll('#error-box, #success-box').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('animate-header-pop'); // Remove animation class
    });
}

/**
 * Parses a GitHub repository URL to extract the owner and repository name.
 * @param {string} url - The GitHub repository URL.
 * @returns {object|null} An object with `owner` and `repo` properties, or `null` if the URL is invalid.
 */
export function parseGithubUrl(url) { 
    try { 
        const u = new URL(url); 
        if (u.hostname !== 'github.com') {
            return null; // Not a GitHub URL
        }
        const p = u.pathname.split('/').filter(Boolean); // Split pathname and remove empty strings
        // Expecting format like /owner/repo or /owner/repo.git
        return p.length >= 2 ? { owner: p[0], repo: p[1].replace('.git', '') } : null; 
    } catch (e) { 
        console.error("Error parsing GitHub URL:", e);
        return null; 
    } 
}

/**
 * Validates if a given string is a valid GitHub repository URL.
 * Displays an error message if invalid.
 * @param {string} url - The URL to validate.
 * @returns {boolean} True if valid, false otherwise.
 */
export function isValidRepoUrl(url) { 
    if (!url || !parseGithubUrl(url)) { 
        showError('Invalid GitHub URL format. Please use a format like "https://github.com/username/repository-name".'); 
        return false; 
    } 
    return true; 
}

/**
 * Copies text to the clipboard and displays a success message.
 * @param {string} text - The text to copy.
 * @param {string} message - The success message to display.
 */
export function copyToClipboard(text, message) { 
    if (!text) {
        return; // Nothing to copy
    }
    // Using document.execCommand('copy') for broader compatibility in some iframe environments
    // Fallback to navigator.clipboard.writeText if execCommand is deprecated or fails
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed'; // Avoid scrolling to bottom
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showSuccess(message);
    } catch (err) {
        // Fallback for modern browsers with Clipboard API
        navigator.clipboard.writeText(text)
            .then(() => showSuccess(message))
            .catch((e) => {
                console.error('Failed to copy text using Clipboard API:', e);
                showError('Failed to copy text to clipboard. Please try manually.');
            });
    }
}
