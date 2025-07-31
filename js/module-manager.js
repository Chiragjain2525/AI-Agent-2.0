/**
 * Switches the currently active module displayed in the application.
 * Handles fading animations and updates tab active states.
 * @param {string} newModule - The ID of the module to switch to (e.g., 'module1', 'module2').
 */
export function switchModule(newModule) {
    // If the new module is already the current module, do nothing.
    if (newModule === window.currentModule) {
        return;
    }

    const currentModuleContainer = document.getElementById(`${window.currentModule}-container`);
    const newModuleContainer = document.getElementById(`${newModule}-container`);

    if (currentModuleContainer && newModuleContainer) {
        // 1. Start fading out the current module.
        currentModuleContainer.classList.add('fade-out');
        // Ensure 'fade-in' is removed so it doesn't interfere with the next transition if the user rapidly switches.
        currentModuleContainer.classList.remove('fade-in'); 

        // 2. After the fade-out animation completes, hide the current module
        // and then fade in the new module.
        setTimeout(() => {
            currentModuleContainer.classList.add('hidden'); // Hide the old module completely
            currentModuleContainer.classList.remove('fade-out'); // Clean up fade-out class

            newModuleContainer.classList.remove('hidden'); // Make the new module visible
            newModuleContainer.classList.add('fade-in'); // Start the fade-in animation for the new module
        }, 400); // This timeout duration should match or be slightly less than the CSS animation-duration (0.5s) for '.module-content'.

    } else {
        // Fallback for cases where animation is not desired or elements are not found.
        // This ensures the modules still switch even if animations fail.
        document.querySelectorAll('.module-content').forEach(c => c.classList.add('hidden'));
        document.getElementById(`${newModule}-container`)?.classList.remove('hidden');
    }

    // Deactivate all tab buttons (both desktop and mobile)
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));

    // Activate the corresponding tab button for the new module (both desktop and mobile)
    document.getElementById(`tab-${newModule}`)?.classList.add('active');
    document.getElementById(`mobile-tab-${newModule}`)?.classList.add('active');

    // Update the mobile selected module title to reflect the new module.
    updateMobileModuleTitle(newModule);

    // Update the global currentModule state.
    window.currentModule = newModule;
}

/**
 * Updates the title displayed for the currently selected module on mobile screens.
 * This function is called when a module is switched.
 * @param {string} module - The ID of the currently active module (e.g., 'module1').
 */
export function updateMobileModuleTitle(module) {
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
                titleElement.textContent = 'Select Module'; // Default text if module is unknown
        }
    }
}
