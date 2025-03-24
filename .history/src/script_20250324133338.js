let stdout = document.querySelector('.terminal-output');
let stdin = document.querySelector('#terminal-input');
let prompt = document.querySelector('.prompt');
let terminalWindow = document.querySelector('.terminal-window');
let terminalBody = document.querySelector('.terminal-body');
let terminalInput = document.querySelector('#terminal-input');
let terminalOutput = document.querySelector('.terminal-output');
let terminalHeader = document.querySelector('.terminal-header');
let terminalPath = document.querySelector('.path');
let currentPath = '/home';
terminalPath.innerHTML = currentPath;


stdin.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        let command = stdin.value;
        console.log("Command sent")
        parseCommand(command);
    }
});

function parseCommand(commands) {
    let command = commands.split(' ')[0];
    let args = commands.split(' ').slice(1);
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
                switch (args[0]) {
                    case 'Edin':
                        writeToTerminal(commands, 'Edin Scieller');
                        break;
                    default:
                        writeToTerminal(commands, 'no file named ' + args[0]);
                        break;
                }
            }else {
                writeToTerminal(commands, 'no file specified');
            }
            break;
        case 'ls':
            //TODO implement ls using fileTree

        case 'cd':
            if (args[0]) {
            switch (args[0]) {
                case 'Studies':
                    currentPath = '/home/Studies';
                    writeToTerminal(commands, "");
                    break;
                case 'Experiences':
                    currentPath = '/home/Experiences';

                    writeToTerminal(commands, "");
                    break;
                case 'Projects':
                    currentPath = '/home/Projects';

                    writeToTerminal(commands, "");
                    break;
                case 'About':
                    currentPath = '/home/About';

                    writeToTerminal(commands, "");
                    break;
                default:
                    writeToTerminal(commands, 'no file named ' + args[0]);
                    break;
            }
            }
            else {
                currentPath = '/home';

                writeToTerminal(commands, "");
            }
            terminalPath.innerHTML = currentPath;
            break;


        default:
            writeToTerminal(` Command not found: ${command}`);
            break;
    }
    clearInput();
}

function clearInput() {
    stdin.value = '';
}

function writeToTerminal(command, s) {
    stdout.innerHTML += `<p>${currentPath}<span class="green">${prompt.innerHTML}</span> ${command}</p>` + `<p>${s}</p>`;
}

