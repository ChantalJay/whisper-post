import { cpSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const generatedAssets = path.join(projectRoot, '.next', 'static');
const standaloneAssets = path.join(projectRoot, '.next', 'standalone', '.next', 'static');

if (!existsSync(generatedAssets)) {
  throw new Error('Next.js static assets are missing. Run `next build` before preparing standalone output.');
}

mkdirSync(path.dirname(standaloneAssets), { recursive: true });
cpSync(generatedAssets, standaloneAssets, { recursive: true });
