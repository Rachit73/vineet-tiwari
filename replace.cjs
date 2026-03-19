const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace classes
content = content.replace(/bg-bg-dark/g, 'bg-zinc-50 dark:bg-bg-dark');
content = content.replace(/text-white/g, 'text-zinc-900 dark:text-white');
content = content.replace(/bg-zinc-900/g, 'bg-white dark:bg-zinc-900');
content = content.replace(/bg-zinc-800/g, 'bg-zinc-100 dark:bg-zinc-800');
content = content.replace(/bg-zinc-950\/50/g, 'bg-zinc-100/50 dark:bg-zinc-950/50');
content = content.replace(/border-white\/10/g, 'border-black/10 dark:border-white/10');
content = content.replace(/border-white\/5/g, 'border-black/5 dark:border-white/5');
content = content.replace(/text-gray-400/g, 'text-gray-600 dark:text-gray-400');
content = content.replace(/text-gray-200/g, 'text-gray-800 dark:text-gray-200');
content = content.replace(/bg-black\/40/g, 'bg-black/5 dark:bg-black/40');
content = content.replace(/bg-black\/50/g, 'bg-black/5 dark:bg-black/50');
content = content.replace(/text-white\/70/g, 'text-zinc-900/70 dark:text-white/70');

// Fix some specific cases that might have been messed up
// e.g., if there are buttons that should always have white text
content = content.replace(/bg-purple-600 text-zinc-900 dark:text-white/g, 'bg-purple-600 text-white');
content = content.replace(/bg-red-500 text-zinc-900 dark:text-white/g, 'bg-red-500 text-white');

fs.writeFileSync('src/App.tsx', content);
console.log('Done replacing classes');
