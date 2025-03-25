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

const state = {
    currentPath: '/Home',
    fileTreeBuffer: null,
    activeDirectory: null,
    commandHistory: [],
    commandIndex: 0
};

function initializeTerminal() {
    DOM.terminalPath.innerHTML = state.currentPath;
    fetchFileTree();
    setupEventListeners();
}

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
            case "":
                writeToTerminal(" ", " ");
                break;
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
                if (window.innerWidth <= 900) {
                    writeToTerminal(commands, "Screen too small for GUI. Opening in new window...");
                    window.open('gui.html', '_blank');
                } else {
                    writeToTerminal(commands, "Executing " + command + "..." + "press CTRL+C to stop.");
                    DOM.stdin.style.opacity = '0';
                    DOM.prompt.style.display = 'none';
                    DOM.terminalPath.style.display = 'none';
                    DOM.gui.style.display = 'block';
                }
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
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([name, child]) => {
            if (child.type === 'folder') return `<li> <span class="folder">${name}/</span></li>`;
            if (child.executable) return `<li> <span class="executable">${name}</span></li>`;
            else return `<li> <span class="file">${name}</span></li>`;
        })
        .join(' ');
    
    writeToTerminal('ls', "<ul>" + childrenString + "</ul>");
}

function clearInput() {
    DOM.stdin.value = '';
}

function writeToTerminal(command, output, path = state.currentPath) {
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
        if (searchPath.includes('/')) {
            const pathParts = searchPath.split('/');
            const parentPath = pathParts.slice(0, -1).join('/');
            const searchTerm = pathParts[pathParts.length - 1];
            
            searchNode = navigateFileTree(`${state.currentPath}/${parentPath}`);
            if (!searchNode) {
                writeToTerminal('', `No such directory: ${parentPath}`);
                return;
            }
            
            const matches = Object.keys(searchNode.children)
                .filter(child => child.startsWith(searchTerm));
            
            if (matches.length === 0) {
                writeToTerminal('', `No matches found for: ${searchTerm}`);
                return;
            }
            
            if (matches.length === 1) {
                const match = matches[0];
                const isFolder = searchNode.children[match].type === 'folder';
                const newPath = `${parentPath}/${match}${isFolder ? '/' : ''}`;
                DOM.stdin.value = `${command} ${newPath}`;
            } else {
                const matchList = matches.map(match => {
                    const isFolder = searchNode.children[match].type === 'folder';
                    return `${parentPath}/${match}${isFolder ? '/' : ''}`;
                }).join('\n');
                writeToTerminal('', `Possible matches:\n${matchList}`);
            }
            return;
        }
        
        const matches = Object.keys(searchNode.children)
            .filter(child => child.startsWith(searchPath));
        
        if (matches.length === 0) {
            writeToTerminal('', `No matches found for: ${searchPath}`);
            return;
        }
        
        if (matches.length === 1) {
            const match = matches[0];
            const isFolder = searchNode.children[match].type === 'folder';
            DOM.stdin.value = `${command} ${match}${isFolder ? '/' : ''}`;
        } else {
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
    const pathParts = path.split('/').filter(part => part !== ''); 
    let currentNode = state.fileTreeBuffer;

    if (pathParts[0] === 'Home') {
        pathParts.shift();
    }

    for (const part of pathParts) {
        if (!currentNode.children || !currentNode.children[part]) {
            return null;
        }
        currentNode = currentNode.children[part];
    }
    return currentNode;
}

document.addEventListener('DOMContentLoaded', initializeTerminal);
