import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

/**
 * Renders an interactive D3.js tree diagram visualizing code dependencies.
 * @param {object} treeData - The hierarchical data representing the file tree and dependencies.
 */
function renderDependencyTree(treeData) {
    const margin = { top: 20, right: 90, bottom: 20, left: 90 };
    const svgElement = document.getElementById('dependency-tree-svg');
    const width = svgElement.clientWidth - margin.left - margin.right;
    const height = svgElement.clientHeight - margin.top - margin.bottom;

    // Remove any existing SVG content
    const svg = d3.create('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
        
    d3.select(svgElement).html(''); // Clear the old SVG
    d3.select(svgElement).node().appendChild(svg.node()); // Append new SVG

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const treeLayout = d3.tree().size([height, width]);
    
    // Create a new hierarchy from the flat data
    const root = d3.hierarchy(treeData, d => d.children);
    treeLayout(root);

    // Add nodes and links
    const nodes = g.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.y},${d.x})`);

    // Add circles for the nodes
    nodes.append('circle').attr('r', 10);

    // Add labels for the nodes
    nodes.append('text')
        .attr('dy', 3)
        .attr('x', d => d.children ? -15 : 15)
        .attr('text-anchor', d => d.children ? 'end' : 'start')
        .text(d => d.data.name);

    // Add links between nodes
    g.selectAll('.link')
        .data(root.links())
        .enter()
        .insert('path', 'g')
        .attr('class', 'link')
        .attr('d', d3.linkHorizontal()
            .x(d => d.y)
            .y(d => d.x)
        );
}

/**
 * Fetches repository data and generates the dependency tree using the AI model.
 */
export async function handleGenerateDependencyTree() {
    window.hideMessages(); // Hide any existing messages
    const repoUrl = document.getElementById('repo-url').value.trim();

    // Validate the GitHub repository URL
    if (!window.isValidRepoUrl(repoUrl)) {
        return;
    }

    window.currentRepoPath = window.parseGithubUrl(repoUrl);
    window.setLoadingState(true, 'AI is building the dependency tree...');

    try {
        const repoData = await window.fetchRepoData(window.currentRepoPath.owner, window.currentRepoPath.repo);
        
        // This is a placeholder prompt. We'll need to define a structured response schema
        // for the AI to return the hierarchical data.
        const prompt = `Generate a hierarchical JSON object representing the file dependency tree for the following repository. Analyze the code to determine dependencies, where 'children' are the files a parent file imports or relies on. If no dependencies are found, return an empty 'children' array.
            Repository: ${repoData.name},
            Branch: ${repoData.branch},
            File paths: ${JSON.stringify(repoData.files)},
            Example structure: { "name": "root", "children": [ { "name": "file1.js", "children": [] }, { "name": "file2.js", "children": [] } ] }
            Provide ONLY the JSON object.`;

        // The AI needs to return a structured JSON response. We'll use a placeholder model for now.
        // NOTE: The `window.callAIAssistant` function may need to be updated to support structured responses with a schema.
        const rawResponse = await window.callAIAssistant(prompt);
        const dependencyTreeData = JSON.parse(rawResponse);
        
        if (dependencyTreeData) {
            renderDependencyTree(dependencyTreeData);
            window.showSuccess("Dependency tree generated successfully!");
        } else {
            window.showError("AI could not generate a valid dependency tree.");
        }
    } catch (error) {
        window.showError(error.message || 'An error occurred while generating the dependency tree.');
    } finally {
        window.setLoadingState(false);
    }
}
