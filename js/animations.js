/**
 * Initializes and animates the Three.js background (starfield).
 * Exposes scene, camera, renderer, and stars globally for loading animation control.
 */
export function setupThreeJSAnimation() {
    const canvas = document.querySelector('#bg-canvas');
    if (!canvas) {
        console.error("Three.js canvas (#bg-canvas) not found.");
        return;
    }

    const scene = new window.THREE.Scene();
    const camera = new window.THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new window.THREE.WebGLRenderer({ canvas, alpha: true }); 
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.position.setZ(30);

    const starGeometry = new window.THREE.BufferGeometry();
    const numParticles = 50000; // Significantly increased number of particles for a denser effect
    const positions = new Float32Array(numParticles * 3); 
    const colors = new Float32Array(numParticles * 3); 

    // Define a few space-themed colors for particles
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
        positions[i] = (Math.random() - 0.5) * 1000; // X position
        positions[i + 1] = (Math.random() - 0.5) * 1000; // Y position
        positions[i + 2] = (Math.random() - 0.5) * 1000; // Z position

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

    // Make scene, camera, renderer, and stars accessible globally for loading animation control
    window.loadingScene = { scene, camera, renderer, stars }; 

    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => { 
        mouseX = (e.clientX / window.innerWidth) * 2 - 1; // Normalize to -1 to +1
        mouseY = -(e.clientY / window.innerHeight) * 2 + 1; // Normalize to -1 to +1
    });

    const animate = (time) => {
        // Subtle rotation of the starfield
        stars.rotation.y += 0.0005; 
        stars.rotation.x += 0.0002;

        const positionsArray = stars.geometry.attributes.position.array;
        const particleSpeed = 0.5; // How fast particles move towards the camera
        const zDepth = 1000; // Total depth of the particle field (from -500 to 500)

        // Move particles forward and wrap them around when they pass the camera
        for (let i = 2; i < positionsArray.length; i += 3) { // Iterate over Z coordinates
            positionsArray[i] += particleSpeed; // Move particle forward

            // If particle moves past the camera's front plane, reset it to the back
            if (positionsArray[i] > camera.position.z + (zDepth / 2)) {
                positionsArray[i] -= zDepth; // Wrap around to the far end of the depth range
            }
        }
        stars.geometry.attributes.position.needsUpdate = true; // Crucial for Three.js to re-render updated positions

        // Enhanced camera movement based on mouse position for a parallax effect
        camera.position.x += (mouseX * 20 - camera.position.x) * 0.05; 
        camera.position.y += (mouseY * 20 - camera.position.y) * 0.05; 
        
        camera.lookAt(scene.position); // Always look at the center of the scene
        renderer.render(scene, camera); // Render the scene
        window.lenis?.raf(time); // Update Lenis for smooth scrolling
        requestAnimationFrame(animate); // Loop the animation
    };

    animate(); // Start the animation loop

    // Handle window resizing to maintain responsiveness
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

/**
 * Smoothly transitions Three.js properties (camera Z, particle size) for the loading screen fade-out.
 */
export function smoothThreeJsTransition() {
    if (!window.loadingScene) {
        console.warn("smoothThreeJsTransition called but window.loadingScene is not defined.");
        return;
    }

    // Set initial loading state properties for the transition start
    window.loadingScene.camera.position.z = 15;
    window.loadingScene.stars.material.size = 2;
    
    // Define target values and duration for the transition
    const targetZ = 30;
    const targetSize = 1.5;
    const duration = 1500; // 1.5 seconds for the transition
    const startTime = performance.now();

    function interpolate() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1); // Clamp progress between 0 and 1
        const easedProgress = 0.5 - Math.cos(progress * Math.PI) / 2; // Ease-in-out easing function

        // Interpolate camera Z position
        window.loadingScene.camera.position.z = 15 + (targetZ - 15) * easedProgress;
        // Interpolate particle size
        window.loadingScene.stars.material.size = 2 + (targetSize - 2) * easedProgress;

        // Animate loading rotation, slowing down as the transition progresses
        window.loadingScene.stars.rotation.y += 0.01 * (1 - easedProgress); 
        window.loadingScene.stars.rotation.x += 0.005 * (1 - easedProgress); 

        // Continue animation until progress is complete
        if (progress < 1) {
            requestAnimationFrame(interpolate);
        }
    }
    requestAnimationFrame(interpolate); // Start the interpolation animation
}

/**
 * Initializes the Lenis smooth scrolling library.
 * The Lenis instance is stored in window.lenis.
 */
export function setupLenisSmoothScroll() { 
    if (typeof window.Lenis !== 'undefined') {
        window.lenis = new window.Lenis(); 
    } else {
        console.warn("Lenis library not found. Smooth scrolling will not be enabled.");
    }
}

/**
 * Initializes a custom cursor particle effect.
 * (Currently commented out in main.js, but included here for completeness if desired)
 */
// export function initCustomCursorEffect() {
//     const colors = ["#a855f7", "#c084fc", "#e9d5ff", "#ffffff"];
//     const createParticle = (x, y) => {
//         const p = document.createElement('div');
//         p.className = 'cursor-particle';
//         document.body.appendChild(p);
//         p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
//         p.style.left = `${x}px`;
//         p.style.top = `${y}px`;
//         setTimeout(() => p.remove(), 600);
//     };
//     document.body.addEventListener('mousemove', e => createParticle(e.clientX, e.clientY));
// }
