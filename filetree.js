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
                content: fs.readFileSync(filePath, 'utf8')
            };
        }
    });

    return node;
}

// Example usage: Build file tree from the 'src' directory
const fileTree = buildFileTree('./Home');
module.exports = fileTree;

