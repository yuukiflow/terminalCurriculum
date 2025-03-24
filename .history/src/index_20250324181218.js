// Cache DOM elements
const DOM = {
    stdout: document.querySelector('.terminal-output'),
    stdin: document.querySelector('#terminal-input'),
    prompt: document.querySelector('.prompt'),
    terminalWindow: document.querySelector('.terminal-window'),
    terminalBody: document.querySelector('.terminal-body'),
    terminalHeader: document.querySelector('.terminal-header'),
    terminalPath: document.querySelector('.path'),
    gui: document.querySelector('.gui')
};

// State management
const state = {
    currentPath: '/Home',
    fileTreeBuffer: null,
    activeDirectory: null,
    commandHistory: [],
    commandIndex: 0
};

// Initialize terminal
function initializeTerminal() {
    DOM.terminalPath.innerHTML = state.currentPath;
    fetchFileTree();
    setupEventListeners();
}

// Fetch and initialize file tree
function fetchFileTree() {
    fetch('/fileTree.json', { 
        headers: { "Accept": "application/json" } 
    })
    .then(response => response.json())
    .then(fileTree => {
        state.fileTreeBuffer = fileTree;
        state.activeDirectory = fileTree;
        DOM.terminalPath.innerHTML = state.currentPath;
    })
    .catch(error => {
        console.error('Error fetching file tree:', error);
        writeToTerminal('system', '<span class="error">Error: Failed to load file system</span>');
    });
}

// Event Listeners
function setupEventListeners() {
    DOM.terminalWindow.addEventListener('click', () => DOM.stdin.focus());
    
    DOM.terminalWindow.addEventListener('keydown', handleTerminalKeydown);
    DOM.stdin.addEventListener('keydown', handleInputKeydown);
}

function handleTerminalKeydown(event) {
    if (event.key === 'c' && event.ctrlKey) {
        DOM.stdin.style.opacity = 100;
        DOM.gui.style.display = 'none';
    }
}

function handleInputKeydown(event) {
    switch(event.key) {
        case 'Enter':
            const inputCommand = DOM.stdin.value;
            parseCommand(inputCommand);
            state.commandHistory.push(inputCommand);
            state.commandIndex = state.commandHistory.length;
            break;
        case 'Tab':
            event.preventDefault();
            const tabCommand = DOM.stdin.value.split(' ')[0];
            tabComplete(tabCommand);
            break;
        case 'ArrowUp':
            if (state.commandIndex > 0) {
                state.commandIndex--;
                DOM.stdin.value = state.commandHistory[state.commandIndex];
            }
            break;
        case 'ArrowDown':
            if (state.commandIndex < state.commandHistory.length - 1) {
                state.commandIndex++;
                DOM.stdin.value = state.commandHistory[state.commandIndex];
            } else {
                state.commandIndex = state.commandHistory.length;
                DOM.stdin.value = '';
            }
            break;
        case 'c':
            if (event.ctrlKey) {
                DOM.gui.style.display = 'none';
                DOM.stdin.style.opacity = 1;
            }
            break;
    }
}

// Command parsing and execution
function parseCommand(commands) {
    const [command, ...args] = commands.split(' ');
    
    try {
        switch (command) {
            case 'clear':
                DOM.stdout.innerHTML = '';
                break;
            case 'help':
                writeToTerminal(commands, getHelpText());
                break;
            case 'exit':
                DOM.terminalWindow.style.display = 'none';
                break;
            case 'cat':
                if (!args[0]) throw new Error('No file specified');
                cat(args[0]);
                break;
            case 'ls':
                ls();
                break;
            case 'cd':
                if (args[0]) {
                    cd(args[0]);
                } else {
                    cd('/Home');
                }
                break;
            case 'gui':
                let gui = document.querySelector('.gui'); // Use a general `.gui` selector
                let stdin = document.querySelector('.terminal-input');
                writeToTerminal(commands, "Executing " + command + "..." + "press CTRL+C to stop.");
                stdin.style.opacity = 0;
                gui.style.display = 'block'; // Ensure .gui is visible
                break;
            default:
                writeToTerminal(commands, `Command not found: ${command}`);
        }
    } catch (error) {
        writeToTerminal(commands, `<span class="error">Error: ${error.message}</span>`);
    } finally {
        clearInput();
    }
}

// File system operations
function cd(path) {
    const previousPath = state.currentPath;
    
    if (path === '..') {
        if (state.currentPath === '/Home') {
            throw new Error('No parent directory');
        }
        state.currentPath = state.currentPath.split('/').slice(0, -1).join('/');
    } else if (path === '/' || path === '/Home' || path === 'Home') {
        state.currentPath = '/Home';
        state.activeDirectory = state.fileTreeBuffer;
    } else {
        // Remove trailing slash if present
        path = path.replace(/\/$/, '');
        const fullPath = `${state.currentPath}/${path}`;
        const targetNode = navigateFileTree(fullPath);
        
        if (!targetNode) throw new Error('No such directory');
        if (targetNode.type !== 'folder') throw new Error('Not a directory');
        
        state.currentPath = fullPath;
    }
    
    state.activeDirectory = navigateFileTree(state.currentPath);
    writeToTerminal(`cd ${path}`, '', previousPath);
    DOM.terminalPath.innerHTML = state.currentPath;
}

function cat(path) {
    const file = navigateFileTree(`${state.currentPath}/${path}`);
    if (!file) throw new Error('No such file');
    if (file.type !== 'file') throw new Error('Not a file');
    
    writeToTerminal(`cat ${path}`, file.data);
}

function ls() {
    const children = state.activeDirectory.children;
    const childrenString = Object.entries(children)
        .map(([name, child]) => {
            if (child.type === 'folder') return `<li> <span class="folder">${name}/</span></li>`;
            if (child.executable) return `<li> <span class="executable">${name}</span></li>`;
            else return `<li> <span class="file">${name}</span></li>`;
        })
        .join(' ');
    
    writeToTerminal('ls', "<ul>" + childrenString + "</ul>");
}

// Utility functions
function clearInput() {
    DOM.stdin.value = '';
}

function writeToTerminal(command, output, path = state.currentPath) {
    // Only sanitize the command part, not the output
    const sanitizedCommand = sanitizeHTML(command);
    DOM.stdout.innerHTML += `
        <p class="line">${path}<span class="green">${DOM.prompt.innerHTML}</span> ${sanitizedCommand}</p>
        <p class="line">${output}</p>
    `;
    scrollDown();
}

function scrollDown() {
    DOM.terminalBody.scrollTop = DOM.terminalBody.scrollHeight;
}

function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function getHelpText() {
    return `<div class="cli-help">
        <pre>
Usage: [[<span class="command">command</span>] [<span class="command">argument</span>]]

Commands:
  <span class="command">clear</span>     Clear the terminal screen
  <span class="command">cat</span>       Display the contents of a file
  <span class="command">cd</span>        Change the current directory
  <span class="command">help</span>      Show available commands and their descriptions
  <span class="command">ls</span>        List the contents of the current directory
  <span class="command">gui</span>       Open the GUI for additional information
  <span class="command">exit</span>      Exit the terminal
        </pre>
    </div>`;
}

function tabComplete(command) {
    try {
        const inputParts = DOM.stdin.value.split(' ');
        const partialInput = inputParts[1] || '';
        
        // If there's no command or no partial input, just return
        if (!command || !partialInput) {
            return;
        }

        const isDirectory = partialInput.endsWith('/');
        const searchPath = isDirectory ? partialInput.slice(0, -1) : partialInput;
        
        // If we're in a directory path, navigate to that directory first
        let searchNode = state.activeDirectory;
        if (searchPath.includes('/')) {
            const pathParts = searchPath.split('/');
            const parentPath = pathParts.slice(0, -1).join('/');
            const searchTerm = pathParts[pathParts.length - 1];
            
            searchNode = navigateFileTree(`${state.currentPath}/${parentPath}`);
            if (!searchNode) {
                writeToTerminal('', `No such directory: ${parentPath}`);
                return;
            }
            
            // Find all matches in the current directory
            const matches = Object.keys(searchNode.children)
                .filter(child => child.startsWith(searchTerm));
            
            if (matches.length === 0) {
                writeToTerminal('', `No matches found for: ${searchTerm}`);
                return;
            }
            
            if (matches.length === 1) {
                // Single match - complete the path
                const match = matches[0];
                const isFolder = searchNode.children[match].type === 'folder';
                const newPath = `${parentPath}/${match}${isFolder ? '/' : ''}`;
                DOM.stdin.value = `${command} ${newPath}`;
            } else {
                // Multiple matches - show all possibilities
                const matchList = matches.map(match => {
                    const isFolder = searchNode.children[match].type === 'folder';
                    return `${parentPath}/${match}${isFolder ? '/' : ''}`;
                }).join('\n');
                writeToTerminal('', `Possible matches:\n${matchList}`);
            }
            return;
        }
        
        // Handle tab completion in current directory
        const matches = Object.keys(searchNode.children)
            .filter(child => child.startsWith(searchPath));
        
        if (matches.length === 0) {
            writeToTerminal('', `No matches found for: ${searchPath}`);
            return;
        }
        
        if (matches.length === 1) {
            // Single match - complete the path
            const match = matches[0];
            const isFolder = searchNode.children[match].type === 'folder';
            DOM.stdin.value = `${command} ${match}${isFolder ? '/' : ''}`;
        } else {
            // Multiple matches - show all possibilities
            const matchList = matches.map(match => {
                const isFolder = searchNode.children[match].type === 'folder';
                return `${match}${isFolder ? '/' : ''}`;
            }).join('\n');
            writeToTerminal('', `Possible matches:\n${matchList}`);
        }
    } catch (error) {
        console.error('Tab completion error:', error);
        writeToTerminal('', `Error during tab completion: ${error.message}`);
    }
}

function navigateFileTree(path) {
    const pathParts = path.split('/').filter(part => part !== ''); // Split the path and remove empty parts
    let currentNode = state.fileTreeBuffer;

    // If path starts with /Home, remove it as it's our root
    if (pathParts[0] === 'Home') {
        pathParts.shift();
    }

    for (const part of pathParts) {
        if (!currentNode.children || !currentNode.children[part]) {
            return null; // Path does not exist
        }
        currentNode = currentNode.children[part];
    }
    return currentNode;
}

// Initialize the terminal when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeTerminal);
