#!/usr/bin/env node
/**
 * copy-css.mjs — canon-parts build: ship recipes.css from src.
 * (CSS is source-of-truth in src/; no transform needed.)
 */
import { cpSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
mkdirSync(join(root, 'dist'), { recursive: true });
cpSync(join(root, 'src', 'recipes.css'), join(root, 'dist', 'recipes.css'));
console.log('canon-parts: dist/recipes.css copied from src/recipes.css');