const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace bg-white/5 with bg-black/5 dark:bg-white/5
content = content.replace(/bg-white\/5/g, 'bg-black/5 dark:bg-white/5');

fs.writeFileSync('src/App.tsx', content);
console.log('Done replacing classes');
