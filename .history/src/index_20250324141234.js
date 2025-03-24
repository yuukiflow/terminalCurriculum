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
    commandIndex: 0,
    isInitialized: false
};

// Initialize terminal
async function initializeTerminal() {
    try {
        DOM.terminalPath.innerHTML = state.currentPath;
        await fetchFileTree();
        setupEventListeners();
        state.isInitialized = true;
        writeToTerminal('system', 'File system initialized successfully.');
    } catch (error) {
        console.error('Initialization error:', error);
        writeToTerminal('system', 'Error: Failed to initialize file system');
    }
}

// Fetch and initialize file tree
async function fetchFileTree() {
    const response = await fetch('/fileTree.json', { 
        headers: { "Accept": "application/json" } 
    });
    if (!response.ok) throw new Error('Failed to fetch file tree');
    
    const fileTree = await response.json();
    state.fileTreeBuffer = fileTree;
    state.activeDirectory = fileTree;
    DOM.terminalPath.innerHTML = state.currentPath;
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
    if (!state.isInitialized) {
        writeToTerminal(commands, '<span class="error">Error: File system is still initializing. Please wait...</span>');
        return;
    }

    if (!state.activeDirectory) {
        writeToTerminal(commands, '<span class="error">Error: File system not properly initialized. Please refresh the page.</span>');
        return;
    }

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
                handleGuiCommand();
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
    if (path === '..') {
        if (state.currentPath === '/Home') {
            throw new Error('No parent directory');
        }
        state.currentPath = state.currentPath.split('/').slice(0, -1).join('/');
    } else if (path === '/') {
        state.currentPath = '/Home';
    } else {
        const fullPath = `${state.currentPath}/${path}`;
        const targetNode = navigateFileTree(fullPath);
        
        if (!targetNode) throw new Error('No such directory');
        if (targetNode.type !== 'folder') throw new Error('Not a directory');
        
        state.currentPath = targetNode.path;
    }
    
    state.activeDirectory = navigateFileTree(state.currentPath);
    DOM.terminalPath.innerHTML = state.currentPath;
    writeToTerminal(`cd ${path}`, '');
}

function cat(path) {
    const file = navigateFileTree(`${state.currentPath}/${path}`);
    if (!file) throw new Error('No such file');
    if (file.type !== 'file') throw new Error('Not a file');
    
    writeToTerminal(`cat ${path}`, file.data);
}

function ls() {
    if (!state.activeDirectory) {
        writeToTerminal('ls', '<span class="error">Error: File system not initialized</span>');
        return;
    }

    const children = state.activeDirectory.children;
    const childrenString = Object.entries(children)
        .map(([name, child]) => {
            if (child.type === 'folder') return `<span class="folder">${name}/</span>`;
            if (child.executable) return `<span class="executable">${name}</span>`;
            return name;
        })
        .join(' ');
    
    writeToTerminal('ls', childrenString);
}

// Utility functions
function clearInput() {
    DOM.stdin.value = '';
}

function writeToTerminal(command, output) {
    // Only sanitize the command part, not the output
    const sanitizedCommand = sanitizeHTML(command);
    DOM.stdout.innerHTML += `
        <p>${state.currentPath}<span class="green">${DOM.prompt.innerHTML}</span> ${sanitizedCommand}</p>
        <p>${output}</p>
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

    console.log("navigate", path);
    const pathParts = path.split('/').filter(part => part !== ''); // Split the path and remove empty parts
    let currentNode = state.fileTreeBuffer;

    for (const part of pathParts) {
        if (part === "Home") {
            continue
        }
        else if (!currentNode.children[part]) {
            return null; // Path does not exist
        }
        currentNode = currentNode.children[part];
    }
    return currentNode;
}

// Initialize the terminal when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeTerminal);
