import { copyFile, mkdir, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await copyFile('src/index.js', 'dist/index.js');
await copyFile('src/parser-evidence.js', 'dist/parser-evidence.js');
await copyFile('src/safe-merge-parser-evidence.js', 'dist/safe-merge-parser-evidence.js');
await copyFile('src/semantic-merge.js', 'dist/semantic-merge.js');
await copyFile('src/semantic-merge-structure.js', 'dist/semantic-merge-structure.js');
await copyFile('src/index.d.ts', 'dist/index.d.ts');
