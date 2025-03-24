const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'src')));
app.get('/fileTree.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json'); // Set the Content-Type header
  res.sendFile(path.join(__dirname, 'fileTree.json'));
});

const fileTreePath = path.join(__dirname + "/src", 'fileTree.json');

function buildFileTree(directory, currentPath = '/Home') {
    const stats = fs.statSync(directory);
    if (!stats.isDirectory()) {
        throw new Error(`${directory} is not a directory`);
    }

    const node = {
        name: path.basename(directory),
        type: 'folder',
        path: currentPath,
        children: {},
        childrenNames: []
    };

    const files = fs.readdirSync(directory);
    if (files.length === 0) {
        node.childrenNames.push(""); // Indicate that the folder is empty
        return node;
    }

    files.forEach(file => {
        const filePath = path.join(directory, file);
        const fileStats = fs.statSync(filePath);
        if (fileStats.isDirectory()) {
            const childPath = path.join(currentPath, file); // Update current path for directories
            const childNode = buildFileTree(filePath, childPath);
            node.children[file] = childNode; // Include subfolder node directly
            node.childrenNames.push(file);
        } else {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            node.children[file] = {
                name: file,
                type: 'file',
                path: path.join(currentPath, file), // Set path for files
                executable: isExecutable(fileStats),
                data: fileContent // Include file content in the data field
            };
            node.childrenNames.push(file);
        }
    });

    return node;
}
function isExecutable(stats) {
    console.log(`Checking mode for file: ${stats.mode.toString(8)}`);
    return (stats.mode & 0o111) !== 0;
}


const fileTree = buildFileTree('./src/Home');
fs.writeFileSync(fileTreePath, JSON.stringify(fileTree, null, 2));
// Example usage: Build file tree from the 'src' directory

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

