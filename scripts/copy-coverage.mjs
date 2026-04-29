import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, 'coverage', 'minolingo-frontend', 'lcov.info');
const target = join(root, 'coverage', 'lcov.info');

if (!existsSync(source)) {
  throw new Error(`Coverage file not found: ${source}`);
}

copyFileSync(source, target);
console.log(`Copied LCOV report to ${target}`);
