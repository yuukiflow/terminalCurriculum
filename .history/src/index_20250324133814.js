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
async function fetchFileTree() {
    try {
        const response = await fetch('/fileTree.json', { 
            headers: { "Accept": "application/json" } 
        });
        if (!response.ok) throw new Error('Failed to fetch file tree');
        
        const fileTree = await response.json();
        state.fileTreeBuffer = fileTree;
        state.activeDirectory = fileTree;
        DOM.terminalPath.innerHTML = state.currentPath;
    } catch (error) {
        console.error('Error fetching file tree:', error);
        writeToTerminal('system', 'Error: Failed to load file system');
    }
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
                handleGuiCommand();
                break;
            default:
                writeToTerminal(commands, `Command not found: ${command}`);
        }
    } catch (error) {
        writeToTerminal(commands, `Error: ${error.message}`);
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
    const sanitizedOutput = sanitizeHTML(output);
    DOM.stdout.innerHTML += `
        <p>${state.currentPath}<span class="green">${DOM.prompt.innerHTML}</span> ${command}</p>
        <p>${sanitizedOutput}</p>
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
    let children = state.activeDirectory.children;
    let childrenString = '';
    let partialInput = DOM.stdin.value.split(' ')[1];
    if (partialInput[partialInput.length - 1] === '/') {
        let searchNode = navigateFileTree(state.currentPath + '/' + partialInput);
        console.log(searchNode);
        if (searchNode) {
            console.log("found search node");
            for (let child in searchNode.children) {
                console.log(child);

                if (searchNode.children[child].type === 'folder') {
                    childrenString += `${child}/`
                } else {
                    childrenString += `${child}`;
                }
                console.log(childrenString);
            }
            DOM.stdin.value = command + ' ' + partialInput + childrenString
        }
    } else if (partialInput !== '') {
        for (let child in children) {
            if (child.startsWith(partialInput)) {
                if (state.activeDirectory.children[child].type === 'folder') {
                    DOM.stdin.value = command + ' ' + child + '/'
                } else {
                    DOM.stdin.value = command + ' ' + child
                }

            }
        }

    } else {
        return;
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
