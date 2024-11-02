let stdout = document.querySelector('.terminal-output');
let stdin = document.querySelector('#terminal-input');
let prompt = document.querySelector('.prompt');
let terminalWindow = document.querySelector('.terminal-window');
let terminalBody = document.querySelector('.terminal-body');
let terminalInput = document.querySelector('#terminal-input');
let terminalOutput = document.querySelector('.terminal-output');
let terminalHeader = document.querySelector('.terminal-header');
let terminalPath = document.querySelector('.path');
terminalPath.innerHTML = "/Home";
let currentPath = '/Home';
let fileTreebuffer
let activeDirectory
let commandHistory = [];
let commandIndex = 0;

fetch('/fileTree.json', { headers: { "Accept": "application/json" } })
    .then(response => response.json())
    .then(fileTree => {
        console.log('File tree data:', fileTree);
        // Use the file tree data as a JavaScript object
        // For example, you can access individual properties like fileTree.name, fileTree.children, etcfileTreebuffer
        fileTreebuffer = fileTree;
        activeDirectory = fileTree;
        terminalPath.innerHTML = currentPath;
    })
    .catch(error => console.error('Error fetching file tree:', error));


terminalWindow.addEventListener('click', () => {
    stdin.focus();
})
stdin.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        let command = stdin.value;
        console.log("Command sent")
        parseCommand(command);
        commandHistory.push(command);
        commandIndex = commandHistory.length;
    } else if (event.key === 'Tab') {
        event.preventDefault();
        let command = stdin.value.split(' ')[0];
        tabComplete(command);
    } else if (event.key === 'ArrowUp') {
        if (commandIndex > 0) {
            commandIndex--;
            stdin.value = commandHistory[commandIndex];
        }
    } else if (event.key === 'ArrowDown') {
        if (commandIndex < commandHistory.length - 1) {
            commandIndex++;
            stdin.value = commandHistory[commandIndex];
        } else {
            commandIndex = commandHistory.length;
            stdin.value = '';
        }
    }
});


function parseCommand(commands) {
    command = commands.split(' ')[0];
    args = commands.split(' ').slice(1);
    console.log(commands);
    switch (command) {
        case 'clear':
            stdout.innerHTML = '';
            break;
        case 'help':
            writeToTerminal(commands, 'Commands: clear, cat, cd, help, ls, exit');
            break;
        case 'exit':
            terminalWindow.style.display = 'none';
            break;
        case 'cat':
            if (args[0]) {
                cat(args[0]);
            } else {
                writeToTerminal(commands, 'no file specified');
            }
            break;
        case 'ls':
            ls();
            break;

        case 'cd':
            if (args[0]) {
                cd(args[0]);
                break;
            }
            else {
                writeToTerminal(commands, "");
                currentPath = '/Home';
                activeDirectory = fileTreebuffer;

            }
            terminalPath.innerHTML = currentPath;
            break;


        default:
            writeToTerminal(` Command not found: ${commands}`, '');
            break;
    }
    clearInput();
}

function clearInput() {
    stdin.value = '';
}

function writeToTerminal(command, s) {
    stdout.innerHTML += `<p>${currentPath}<span class="green">${prompt.innerHTML}</span> ${command}</p>` + `<p>${s}</p>`;
    scrollDown();
}

function cd(path) {
    if (path === '..') {
        if (currentPath === '/Home') {
            writeToTerminal(`cd ${path}`, 'no such directory');
            return;
        }

        writeToTerminal(`cd ${path}`, '');
        currentPath = currentPath.split('/').slice(0, -1).join('/');
        activeDirectory = navigateFileTree(currentPath);
        terminalPath.innerHTML = currentPath;
        return;

    } else if (path === '/') {
        writeToTerminal(`cd ${path}`, '');
        activeDirectory = fileTreebuffer;
        currentPath = activeDirectory.path;
        terminalPath.innerHTML = currentPath;
        return;
    } else {
        let fullPath = activeDirectory.path + '/' + path;
        let checkNode = navigateFileTree(fullPath);
        if (!checkNode) {
            writeToTerminal(`cd ${path}`, 'no such directory');
            return;
        }
        else if (checkNode.type !== 'folder') {
            writeToTerminal(`cd ${path}`, 'no such directory');
            return;
        }
        activeDirectory = checkNode;
        writeToTerminal(`cd ${path}`, '');
        currentPath = activeDirectory.path;
        terminalPath.innerHTML = currentPath;
        return;
    }
}

function cat(path) {
    let file = navigateFileTree(currentPath + '/' + path);
    if (file && file.type === 'file') {
        writeToTerminal(`cat ${path}`, file.data);
    } else {
        writeToTerminal(`cat ${path}`, 'no such file');
    }
}

function ls() {
    let children = activeDirectory.children;
    let childrenString = '';
    for (let child in children) {
        if (activeDirectory.children[child].type === 'folder') {
            childrenString += `<span class="folder">${child}/</span> `
        } else {
            childrenString += `${child} `;
        }
    }
    writeToTerminal(`ls `, childrenString)
}

function tabComplete(command) {
    let children = activeDirectory.children;
    let childrenString = '';
    let partialInput = stdin.value.split(' ')[1];
    if (partialInput[partialInput.length - 1] === '/') {
        let searchNode = navigateFileTree(currentPath + '/' + partialInput);
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
            stdin.value = command + ' ' + partialInput + childrenString
        }
    } else if (partialInput !== '') {
        for (let child in children) {
            if (child.startsWith(partialInput)) {
                if (activeDirectory.children[child].type === 'folder') {
                    stdin.value = command + ' ' + child + '/'
                } else {
                    stdin.value = command + ' ' + child
                }

            }
        }

    } else {
        return;
    }
}

function scrollDown() {
    terminalBody.scrollTop = terminalBody.scrollHeight;
}

function navigateFileTree(path) {
    console.log("navigate", path);
    const pathParts = path.split('/').filter(part => part !== ''); // Split the path and remove empty parts
    let currentNode = fileTreebuffer;

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
