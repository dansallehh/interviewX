import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
const DEST_DIR = join(ROOT, 'public');
const DEST = join(DEST_DIR, 'sql-wasm.wasm');

mkdirSync(DEST_DIR, { recursive: true });
copyFileSync(SRC, DEST);
console.log('Copied sql-wasm.wasm -> public/sql-wasm.wasm');
