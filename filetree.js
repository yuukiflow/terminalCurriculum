const fs = require('fs');
const path = require('path');

function buildFileTree(directory) {
    const stats = fs.statSync(directory);
    if (!stats.isDirectory()) {
        throw new Error(`${directory} is not a directory`);
    }

    const node = {
        name: path.basename(directory),
        type: 'folder',
        children: {}
    };

    const files = fs.readdirSync(directory);
    files.forEach(file => {
        const filePath = path.join(directory, file);
        const fileStats = fs.statSync(filePath);

        if (fileStats.isDirectory()) {
            node.children[file] = buildFileTree(filePath);
        } else {
            node.children[file] = {
                name: file,
                type: 'file',
                content: fs.readFileSync(filePath, 'utf8'),
                executable: isExecutable(fileStats) // Check if the file is executable
            };
        }
    });

    return node;
}

// Helper function to check if a file is executable
function isExecutable(stats) {
    console.log(`Checking mode for file: ${stats.mode.toString(8)}`);
    return (stats.mode & 0o111) !== 0; // 0o111 checks for execute permissions for owner, group, and others
}

// Example usage: Build file tree from the 'Home' directory
const fileTree = buildFileTree('./Home');
module.exports = fileTree;

