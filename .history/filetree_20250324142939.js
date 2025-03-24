const fs = require('fs');
const path = require('path');

// Create the file tree structure
const fileTree = {
    name: 'Home',
    type: 'folder',
    path: '/Home',
    children: {
        'about': {
            name: 'about',
            type: 'file',
            data: 'This website serves as my curriculum vitae.\nI\'ve coded it by hand with HTML, CSS, and standard JavaScript as a fun side project.\nSource code : <a href="https://github.com/yuukiflow/TerminalCurriculum">https://github.com/yuukiflow/TerminalCurriculum</a>'
        },
        'CV_FR.pdf': {
            name: 'CV_FR.pdf',
            type: 'file',
            data: 'PDF file containing the curriculum vitae in French'
        },
        'Curriculum': {
            name: 'Curriculum',
            type: 'folder',
            path: '/Home/Curriculum',
            children: {
                'Formation': {
                    name: 'Formation',
                    type: 'folder',
                    path: '/Home/Curriculum/Formation',
                    children: {
                        'education': {
                            name: 'education',
                            type: 'file',
                            data: 'Master\'s Degree in Computer Science\nUniversity of Paris-Saclay\n2020-2022\n\nBachelor\'s Degree in Computer Science\nUniversity of Paris-Saclay\n2017-2020'
                        }
                    }
                },
                'Experience': {
                    name: 'Experience',
                    type: 'folder',
                    path: '/Home/Curriculum/Experience',
                    children: {
                        'work': {
                            name: 'work',
                            type: 'file',
                            data: 'Software Engineer at Company X\n2022-Present\n- Developed and maintained web applications\n- Worked with modern JavaScript frameworks\n\nInternship at Company Y\n2021-2022\n- Assisted in frontend development\n- Participated in code reviews'
                        }
                    }
                },
                'Skills': {
                    name: 'Skills',
                    type: 'folder',
                    path: '/Home/Curriculum/Skills',
                    children: {
                        'technical': {
                            name: 'technical',
                            type: 'file',
                            data: 'Programming Languages:\n- JavaScript/TypeScript\n- Python\n- Java\n\nFrameworks:\n- React\n- Node.js\n- Express\n\nTools:\n- Git\n- Docker\n- AWS'
                        },
                        'languages': {
                            name: 'languages',
                            type: 'file',
                            data: 'French (Native)\nEnglish (Fluent)\nSpanish (Intermediate)'
                        }
                    }
                }
            }
        }
    }
};

// Write the file tree to a JSON file
fs.writeFileSync('fileTree.json', JSON.stringify(fileTree, null, 2));

module.exports = fileTree;

