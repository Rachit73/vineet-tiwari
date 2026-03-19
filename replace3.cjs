const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace bg-white/10 with bg-black/10 dark:bg-white/10
content = content.replace(/bg-white\/10/g, 'bg-black/10 dark:bg-white/10');

fs.writeFileSync('src/App.tsx', content);
console.log('Done replacing classes');
