/**
 * template.cjs — the canonical codemod starting point.
 *
 * Copy this into `codemods/<from>-to-<to>/transform.cjs` and replace the two
 * MAPPING objects. A codemod is a jscodeshift transform: it walks the consumer
 * AST and rewrites old API to new, deterministically — no model, no guesses.
 *
 * Run:
 *   npx jscodeshift -t codemods/<from>-to-<to>/transform.cjs \
 *     --parser=tsx --extensions=tsx,ts /path/to/consumer/src
 */

/** Old → new import specifier (e.g. 'LegacyBadge' → 'Badge'). */
const IMPORT_RENAME = {
  // LegacyBadge: 'Badge',
};

/** Old → new prop name on a component (e.g. 'size' → 'scale'). */
const PROP_RENAME = {
  // size: 'scale',
};

/** The component names this transform touches (safe-guard). */
const TARGET_COMPONENTS = new Set(Object.keys(PROP_RENAME));

module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  let changed = false;

  // 1. Rename import specifiers.
  if (Object.keys(IMPORT_RENAME).length > 0) {
    root.find(j.ImportSpecifier).forEach((path) => {
      const imported = path.node.imported.name;
      if (IMPORT_RENAME[imported]) {
        path.node.imported.name = IMPORT_RENAME[imported];
        changed = true;
      }
    });
  }

  // 2. Rename props on target components.
  if (TARGET_COMPONENTS.size > 0) {
    root.find(j.JSXElement).forEach((path) => {
      const tag = path.node.openingElement.name;
      const name = tag && (tag.name || tag);
      if (!name || !TARGET_COMPONENTS.has(name)) return;
      path.node.openingElement.attributes.forEach((attr) => {
        if (attr.type === 'JSXAttribute' && attr.name && PROP_RENAME[attr.name.name]) {
          attr.name.name = PROP_RENAME[attr.name.name];
          changed = true;
        }
      });
    });
  }

  return changed ? root.toSource({ quote: 'single' }) : null;
};