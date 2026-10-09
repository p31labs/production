import { loadComponents } from '../src/generator/shared.ts';
const defs = await loadComponents();
console.log('keys sample:', Object.keys(defs.components || {}).slice(0, 8));
console.log('has CommandPalette:', !!(defs.components?.['CommandPalette']));
