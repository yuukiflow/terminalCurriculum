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
        event.preventDefault();
        DOM.gui.style.display = 'none';
        DOM.stdin.style.opacity = '1';
        DOM.terminalPath.style.display = 'block';
        DOM.prompt.style.display = 'block';
        DOM.stdin.focus();
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
                event.preventDefault();
                DOM.gui.style.display = 'none';
                DOM.stdin.style.opacity = '1';
                DOM.terminalPath.style.display = 'block';
                DOM.prompt.style.display = 'block';
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
                writeToTerminal(commands, "Executing " + command + "..." + "press CTRL+C to stop.");
                DOM.stdin.style.opacity = '0';
                DOM.terminalPath.style.display = 'none';
                DOM.prompt.style.display = 'none';
                DOM.gui.style.display = 'block';
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
        
        if (!command || !partialInput) {
            return;
        }

        const isDirectory = partialInput.endsWith('/');
        const searchPath = isDirectory ? partialInput.slice(0, -1) : partialInput;
        
        let searchNode = state.activeDirectory;
        if (searchPath) {
            const pathParts = searchPath.split('/');
            for (const part of pathParts) {
                if (part === '..') {
                    if (state.currentPath === '/Home') break;
                    state.currentPath = state.currentPath.split('/').slice(0, -1).join('/');
                    searchNode = navigateFileTree(state.currentPath);
                } else if (part) {
                    if (!searchNode.children[part]) break;
                    searchNode = searchNode.children[part];
                }
            }
        }

        const matches = Object.keys(searchNode.children)
            .filter(name => name.startsWith(isDirectory ? partialInput.slice(0, -1) : partialInput))
            .map(name => isDirectory ? name + '/' : name);

        if (matches.length === 1) {
            const newInput = inputParts[0] + ' ' + matches[0];
            DOM.stdin.value = newInput;
        } else if (matches.length > 1) {
            writeToTerminal('', matches.join('  '));
        }
    } catch (error) {
        console.error('Tab completion error:', error);
    }
}

function navigateFileTree(path) {
    if (!path || path === '/') return state.fileTreeBuffer;
    
    const parts = path.split('/').filter(Boolean);
    let current = state.fileTreeBuffer;
    
    for (const part of parts) {
        if (!current.children[part]) return null;
        current = current.children[part];
    }
    
    return current;
}

// Initialize the terminal when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeTerminal);
