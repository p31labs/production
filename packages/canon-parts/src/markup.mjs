/**
 * @p31ca/canon-parts — markup.mjs
 *
 * The SINGLE source of canon-v2 component markup (fix-plan
 * p31ca-phase2-wrappers-2026-10-13 §2.1, "shared class-recipe core").
 * Both wrapper worlds render from these trees:
 *
 *   - @p31ca/canon-astro  — .astro frontmatter: tree → renderHtml() → set:html
 *   - @p31ca/canon-react  — React elements from the same trees (createElement)
 *
 * Same tree, same attribute order, same attribute values ⇒ the two worlds
 * emit byte-identical HTML for identical semantic props (the parity gate,
 * packages/canon-parts/scripts/parity.mjs, asserts exactly that).
 *
 * Tree node shape:
 *   { tag: string, attrs: [name, value][], children: Child[] }
 *   Child = Node | { raw: string } (pre-rendered HTML) | string | number
 *   { passthrough } is added by the React wrapper for ReactNode props.
 *
 * renderHtml() emulates react-dom/server renderToStaticMarkup byte-for-byte
 * (react-dom@19.3.0 cjs react-dom-server.node.production.js):
 *   - per-tag attribute capture/reorder (input/button form-action set)
 *   - boolean attributes → name="" | omitted
 *   - class="" kept; href/src="" omitted
 *   - void elements self-closed (input only in this set)
 *   - text/attr escaping: & < > " '
 *   - style object → hyphenated inline style (React unitless list)
 */

const VOID = new Set(['input', 'br', 'hr', 'img', 'link', 'meta', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr']);

const BOOLEAN_ATTRS = new Set([
  'inert', 'allowFullScreen', 'async', 'autoPlay', 'controls', 'credentialless',
  'default', 'defer', 'disabled', 'disablePictureInPicture', 'disableRemotePlayback',
  'formNoValidate', 'hidden', 'loop', 'noModule', 'noValidate', 'open', 'playsInline',
  'readOnly', 'required', 'reversed', 'scoped', 'seamless', 'itemScope',
  'autoFocus', 'multiple', 'muted',
]);

const UNITLESS = new Set(('animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp').split(' '));

const ALIASES = new Map([
  ['className', 'class'], ['tabIndex', 'tabindex'],
  ['htmlFor', 'for'], ['acceptCharset', 'accept-charset'], ['httpEquiv', 'http-equiv'],
  ['crossOrigin', 'crossorigin'], ['xlinkHref', 'xlink:href'],
]);

/** React's escapeTextForBrowser: & < > " ' */
export function escapeText(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/** React's hyphenateStyleName (uppercasePattern + msPattern). */
function hyphenate(name) {
  if (name.startsWith('--')) return name;
  return name
    .replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
    .replace(/^ms-/, '-ms-');
}

function styleValue(name, value) {
  if (typeof value !== 'number') return escapeText(String(value).trim());
  if (value === 0 || UNITLESS.has(name)) return String(value);
  return value + 'px';
}

function serializeStyle(style) {
  if (style == null || typeof style !== 'object') return null;
  const parts = [];
  for (const key of Object.keys(style)) {
    const value = style[key];
    if (value == null || typeof value === 'boolean' || value === '') continue;
    parts.push(`${hyphenate(key)}:${styleValue(key, value)}`);
  }
  return parts.length ? parts.join(';') : null;
}

/**
 * Emit one attribute per React's pushAttribute rules.
 * Returns the attribute string or null.
 */
function emitAttr(name, value) {
  if (value == null) return null;
  if (typeof value === 'function' || typeof value === 'symbol') return null;
  name = ALIASES.get(name) || name;
  if (name === 'style') {
    const css = serializeStyle(value);
    return css == null ? null : `style="${escapeText(css)}"`;
  }
  if (name === 'href' || name === 'src') {
    if (value === '') return null;
    return `${name}="${escapeText(String(value))}"`;
  }
  if (BOOLEAN_ATTRS.has(name)) {
    if (name === 'autoFocus') name = 'autofocus';
    return value ? `${name}=""` : null;
  }
  if (typeof value === 'boolean') value = String(value);
  return `${name}="${escapeText(String(value))}"`;
}

const FORM_GROUP = ['name', 'formAction', 'formEncType', 'formMethod', 'formTarget'];

/**
 * Serialize a tree node to HTML, emulating renderToStaticMarkup.
 * @param {object} node { tag, attrs: [name, value][], children }
 * @returns {string}
 */
export function renderHtml(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return escapeText(node);
  if (node.raw !== undefined) return node.raw;
  const { tag, attrs = [], children = [] } = node;

  // ── per-tag attribute capture/reorder (React's server renderer) ──────
  let inline = attrs;
  if (tag === 'input') {
    const captured = { name: null, formAction: null, formEncType: null, formMethod: null, formTarget: null, defaultChecked: null, defaultValue: null, checked: null, value: null };
    inline = [];
    for (const [k, v] of attrs) {
      if (k in captured) captured[k] = v;
      else inline.push([k, v]);
    }
    const out = [...inline];
    for (const k of FORM_GROUP) if (captured[k] != null) out.push([k, captured[k]]);
    const checked = captured.checked ?? captured.defaultChecked;
    if (checked != null) out.push(['checked', checked]);
    const value = captured.value ?? captured.defaultValue;
    if (value != null) out.push(['value', value]);
    inline = out;
  } else if (tag === 'button') {
    const captured = { name: null, formAction: null, formEncType: null, formMethod: null, formTarget: null };
    inline = [];
    for (const [k, v] of attrs) {
      if (k in captured) captured[k] = v;
      else inline.push([k, v]);
    }
    const out = [...inline];
    for (const k of FORM_GROUP) if (captured[k] != null) out.push([k, captured[k]]);
    inline = out;
  } else if (tag === 'select') {
    inline = attrs.filter(([k]) => k !== 'value' && k !== 'defaultValue');
  }

  const attrStr = inline.map(([k, v]) => emitAttr(k, v)).filter(Boolean).join(' ');
  const open = `<${tag}${attrStr ? ' ' + attrStr : ''}${VOID.has(tag) ? '/>' : '>'}`;
  if (VOID.has(tag)) return open;
  const inner = children.map((c) => renderHtml(c)).join('');
  return `${open}${inner}</${tag}>`;
}

/** Attr pair helper: [name, value][] filtered to non-null values. */
function attrs(pairs) {
  return pairs.filter(([, v]) => v !== undefined && v !== null);
}

/** Simple node helper. */
function el(tag, attributes, children = []) {
  return { tag, attrs: attributes, children };
}

/* ══════════════════════════════════════════════════════════════════════
 * Component trees — the canon-v2 set (seed: design-core
 * src/compositions/canon-v2/*). Same names, same prop shapes, same
 * data-p31 markup. Attribute order = seed JSX order.
 * ══════════════════════════════════════════════════════════════════════ */

/** Shell — app frame: topbar / sidebar / main + skip link. */
export function shellTree({ topbar = null, sidebar = null, children = null, mainId, skipLabel = 'Skip to content', className = '', style } = {}) {
  const id = mainId ?? 'p31-main';
  const hasSidebar = Boolean(sidebar);
  const kids = [
    el('a', attrs([['data-p31', 'skip-link'], ['href', `#${id}`]]), [skipLabel]),
  ];
  if (topbar) kids.push(el('div', [['data-p31', 'shell-topbar']], [topbar]));
  if (sidebar) kids.push(el('aside', [['data-p31', 'shell-sidebar']], [sidebar]));
  kids.push(el('main', attrs([['data-p31', 'shell-main'], ['id', id]]), [children]));
  return el('div', attrs([['data-p31', 'shell'], ['data-has-sidebar', hasSidebar ? '' : undefined], ['className', className], ['style', style]]), kids);
}

/** Page — flow / fill / panel-scroll / fit. */
export function pageTree({ mode = 'flow', children = null, className = '', style } = {}) {
  return el('div', attrs([['data-p31', 'page'], ['data-mode', mode], ['className', className], ['style', style]]), [children]);
}

/** PagePanel — the single scrolling panel of a panel-scroll page. */
export function pagePanelTree({ children = null, className = '', style } = {}) {
  return el('div', attrs([['data-p31', 'page-panel'], ['className', className], ['style', style]]), [children]);
}

/** PageHeader / PageHeaderV2. */
export function pageHeaderTree({ title = null, subtitle = null, actions = null, className = '', style } = {}) {
  const textKids = [el('h1', [['data-p31', 'page-header-title']], [title])];
  if (subtitle) textKids.push(el('p', [['data-p31', 'page-header-subtitle']], [subtitle]));
  const kids = [el('div', [['data-p31', 'page-header-text']], textKids)];
  if (actions) kids.push(el('div', [['data-p31', 'page-header-actions']], [actions]));
  return el('header', attrs([['data-p31', 'page-header'], ['className', className], ['style', style]]), kids);
}

/** Stack — one-axis flex. */
export function stackTree({ dir = 'column', gap = 'md', align, justify, children = null, className = '', style } = {}) {
  return el('div', attrs([['data-p31', 'stack'], ['data-dir', dir], ['data-gap', gap], ['data-align', align], ['data-justify', justify], ['className', className], ['style', style]]), [children]);
}

/** Grid — auto-fill minmax card grid. */
export function gridTree({ min = 'md', children = null, className = '', style } = {}) {
  return el('div', attrs([['data-p31', 'grid'], ['data-min', min], ['className', className], ['style', style]]), [children]);
}

/**
 * Split — two panes + handle. Static description: the caller resolves
 * ratio / collapsed / dragging (React wrapper owns the interaction; the
 * Astro wrapper renders the initial state).
 */
export function splitTree({ a = null, b = null, ratio = 0.5, collapsed = false, collapsible = false, dragging = false, ariaLabelA, ariaLabelB, className = '', style } = {}) {
  const isCollapsed = Boolean(collapsed);
  const handleShown = !isCollapsed || collapsible;
  const kids = [
    el('section', attrs([['data-p31', 'split-pane'], ['data-side', 'a'], ['aria-label', ariaLabelA]]), [a]),
  ];
  if (handleShown) {
    kids.push(el('div', attrs([
      ['data-p31', 'split-handle'],
      ['data-collapsible', collapsible ? '' : undefined],
      ['data-dragging', dragging ? '' : undefined],
      ['role', 'separator'],
      ['aria-orientation', 'vertical'],
      ['aria-valuemin', Math.round(0.2 * 100)],
      ['aria-valuemax', Math.round(0.8 * 100)],
      ['aria-valuenow', Math.round((isCollapsed ? 0.8 : ratio) * 100)],
      ['aria-valuetext', isCollapsed ? 'pane B collapsed' : undefined],
      ['tabIndex', 0],
    ])));
  }
  kids.push(el('section', attrs([['data-p31', 'split-pane'], ['data-side', 'b'], ['aria-label', ariaLabelB]]), [b]));
  const splitStyle = { '--_split-a': `${ratio}fr`, '--_split-b': `${1 - ratio}fr`, ...(style ?? {}) };
  return el('div', attrs([['data-p31', 'split'], ['data-collapsed', isCollapsed ? '' : undefined], ['className', className], ['style', splitStyle]]), kids);
}

/** Field — label / control / hint / error as one attribute-scoped grid. */
export function fieldTree({ label = null, hideLabel = false, hint, error, width = 'full', controlId = 'p31-field', control = null, className = '', style } = {}) {
  const kids = [];
  if (label) {
    kids.push(el('label', attrs([['data-p31', hideLabel ? 'sr-only' : 'field-label'], ['htmlFor', controlId]]), [label]));
  }
  if (control) kids.push(control);
  if (error) {
    kids.push(el('p', attrs([['data-p31', 'field-error'], ['id', `${controlId}-error`], ['role', 'alert']]), [error]));
  } else if (hint) {
    kids.push(el('p', attrs([['data-p31', 'field-hint'], ['id', `${controlId}-hint`]]), [hint]));
  }
  return el('div', attrs([['data-p31', 'field'], ['data-width', width === 'form' ? 'form' : undefined], ['className', className], ['style', style]]), kids);
}

/** Input — control wrapped in Field. `rest` = extra native attrs (name, type, placeholder, value, …). */
export function inputTree({ label, hideLabel = false, hint, error, width, id, className = '', rest = {} } = {}) {
  const controlId = id ?? 'p31-input';
  const describedBy = error ? `${controlId}-error` : hint ? `${controlId}-hint` : undefined;
  const inputAttrs = [
    ['data-p31-control', 'input'],
    ['id', controlId],
    ['aria-invalid', error ? true : undefined],
    ['aria-describedby', describedBy],
    ...Object.entries(rest),
  ];
  const control = el('input', inputAttrs);
  return fieldTree({ label, hideLabel, hint, error, width, controlId, control, className });
}

/** Textarea — control wrapped in Field. */
export function textareaTree({ label, hideLabel = false, hint, error, width, id, className = '', rows = 3, rest = {} } = {}) {
  const controlId = id ?? 'p31-textarea';
  const describedBy = error ? `${controlId}-error` : hint ? `${controlId}-hint` : undefined;
  const control = el('textarea', [
    ['data-p31-control', 'textarea'],
    ['id', controlId],
    ['rows', rows],
    ['aria-invalid', error ? true : undefined],
    ['aria-describedby', describedBy],
    ...Object.entries(rest),
  ]);
  return fieldTree({ label, hideLabel, hint, error, width, controlId, control, className });
}

/** Select — control wrapped in Field; options from {value,label}[]. */
export function selectTree({ label, hideLabel = false, hint, error, width, id, className = '', options = [], rest = {} } = {}) {
  const controlId = id ?? 'p31-select';
  const describedBy = error ? `${controlId}-error` : hint ? `${controlId}-hint` : undefined;
  const control = el('select', [
    ['data-p31-control', 'select'],
    ['id', controlId],
    ['aria-invalid', error ? true : undefined],
    ['aria-describedby', describedBy],
    ...Object.entries(rest),
  ], options.map((o) => el('option', [['value', o.value]], [o.label])));
  return fieldTree({ label, hideLabel, hint, error, width, controlId, control, className });
}

/** Tabs — roving-tabindex tablist. */
export function tabsTree({ items = [], activeId, ariaLabel = 'Tabs', className = '', style } = {}) {
  return el('div', attrs([['data-p31', 'tabs'], ['role', 'tablist'], ['aria-label', ariaLabel], ['className', className], ['style', style]]),
    items.map((item) => el('button', [
      ['data-p31', 'tab'],
      ['type', 'button'],
      ['role', 'tab'],
      ['aria-selected', item.id === activeId],
      ['tabIndex', item.id === activeId ? 0 : -1],
    ], [item.label])));
}

/** Menu — vertical action list (role=menu/menuitem). */
export function menuTree({ items = [], ariaLabel, className = '', style } = {}) {
  return el('div', attrs([['data-p31', 'menu'], ['role', 'menu'], ['aria-label', ariaLabel], ['className', className], ['style', style]]),
    items.map((item) => el('button', [
      ['data-p31', 'menu-item'],
      ['type', 'button'],
      ['role', 'menuitem'],
    ], item.icon ? [item.icon, item.label] : [item.label])));
}

/** Dialog — open gate, panel + title. */
export function dialogTree({ open = false, title = null, children = null, labelledBy, className = '', style } = {}) {
  if (!open) return null;
  const titleId = labelledBy ?? 'p31-dialog-title';
  return el('div', attrs([['data-p31', 'dialog'], ['className', className], ['style', style]]), [
    el('div', [['data-p31', 'dialog-panel'], ['role', 'dialog'], ['aria-modal', true], ['aria-labelledby', titleId], ['tabIndex', -1]], [
      el('h2', [['data-p31', 'dialog-title'], ['id', titleId]], [title]),
      ...(children != null ? [children] : []),
    ]),
  ]);
}

/** Sheet — side panel (start/end). */
export function sheetTree({ open = false, title = null, children = null, side = 'end', labelledBy, className = '', style } = {}) {
  if (!open) return null;
  const titleId = labelledBy ?? 'p31-sheet-title';
  return el('div', attrs([['data-p31', 'sheet'], ['data-side', side], ['role', 'dialog'], ['aria-modal', true], ['aria-labelledby', titleId], ['className', className], ['style', style]]), [
    el('h2', [['data-p31', 'dialog-title'], ['id', titleId]], [title]),
    el('div', [['tabIndex', -1]], children != null ? [children] : []),
  ]);
}

/** EmptyState — dashed "nothing here" state. */
export function emptyStateTree({ title = null, description = null, action = null, className = '', style } = {}) {
  const kids = [el('h2', [['data-p31', 'state-title']], [title])];
  if (description) kids.push(el('p', [['data-p31', 'state-description']], [description]));
  if (action) kids.push(action);
  return el('div', attrs([['data-p31', 'empty-state'], ['className', className], ['style', style]]), kids);
}

/** ErrorState — role=alert variant of EmptyState. */
export function errorStateTree({ title = null, description = null, action = null, className = '', style } = {}) {
  const kids = [el('h2', [['data-p31', 'state-title']], [title])];
  if (description) kids.push(el('p', [['data-p31', 'state-description']], [description]));
  if (action) kids.push(action);
  return el('div', attrs([['data-p31', 'error-state'], ['role', 'alert'], ['className', className], ['style', style]]), kids);
}

/** SkeletonBar — one shimmer bar. */
export function skeletonBarTree({ shape = 'bar', className = '', style } = {}) {
  return el('div', attrs([['data-p31', 'skeleton-bar'], ['data-shape', shape], ['aria-hidden', true], ['className', className], ['style', style]]));
}

/** Skeleton — loading placeholder stack. */
export function skeletonTree({ lines = 3, block = false, className = '', style } = {}) {
  return el('div', attrs([['data-p31', 'skeleton'], ['aria-hidden', true], ['className', className], ['style', style]]),
    Array.from({ length: lines }, (_, i) => skeletonBarTree({ shape: block && i === lines - 1 ? 'block' : 'bar' })));
}

/** ListingShell — controls + grid + empty state. */
export function listingShellTree({ controls = null, children = null, empty = null, emptyTitle = 'Nothing here yet', emptyDescription, className = '', style } = {}) {
  const isEmpty = children == null || (Array.isArray(children) && children.length === 0);
  const kids = [];
  if (controls) kids.push(el('div', [['data-p31', 'listing-controls']], [controls]));
  kids.push(isEmpty
    ? (empty ?? emptyStateTree({ title: emptyTitle, description: emptyDescription }))
    : el('div', [['data-p31', 'listing-grid']], Array.isArray(children) ? children : [children]));
  return el('div', attrs([['data-p31', 'listing-shell'], ['className', className], ['style', style]]), kids);
}

/** DetailShell — summary / actions / focus. */
export function detailShellTree({ summary = null, focus = null, actions = null, className = '', style } = {}) {
  const kids = [el('section', [['data-p31', 'detail-summary']], [summary])];
  if (actions) kids.push(el('div', [['data-p31', 'detail-actions']], [actions]));
  kids.push(el('section', [['data-p31', 'detail-focus']], [focus]));
  return el('div', attrs([['data-p31', 'detail-shell'], ['className', className], ['style', style]]), kids);
}

/**
 * Wizard — step indicator + one question group + back/next (finish).
 * Actions compose the canon-parts button recipe (.p31-btn + data attrs)
 * — the Phase 2 recipe core replaces the legacy design-core Button classes
 * used by the seed (documented deviation, fix-plan §4).
 */
export function wizardTree({ steps = [], activeIndex = 0, children = null, backLabel = 'Back', nextLabel = 'Next', finishLabel = 'Finish', className = '', style } = {}) {
  const step = steps[Math.min(activeIndex, steps.length - 1)];
  const isLast = activeIndex >= steps.length - 1;
  const actionBtns = [
    el('button', [
      ['type', 'button'],
      ['class', 'p31-btn'],
      ['data-variant', 'secondary'],
      ['data-size', 'md'],
      ['disabled', activeIndex === 0],
    ], [backLabel]),
    isLast
      ? el('button', [
          ['type', 'button'],
          ['class', 'p31-btn'],
          ['data-variant', 'primary'],
          ['data-size', 'md'],
        ], [finishLabel])
      : el('button', [
          ['type', 'button'],
          ['class', 'p31-btn'],
          ['data-variant', 'primary'],
          ['data-size', 'md'],
        ], [nextLabel]),
  ];
  return el('div', attrs([['data-p31', 'wizard'], ['className', className], ['style', style]]), [
    el('p', [['data-p31', 'wizard-indicator'], ['aria-live', 'polite']], [`Step ${activeIndex + 1} of ${steps.length}`]),
    el('section', [['data-p31', 'wizard-step'], ['role', 'group'], ['aria-label', step?.title]], [children]),
    el('div', [['data-p31', 'wizard-actions']], actionBtns),
  ]);
}

export const canonV2 = {
  shellTree, pageTree, pagePanelTree, pageHeaderTree, stackTree, gridTree,
  splitTree, fieldTree, inputTree, textareaTree, selectTree, tabsTree,
  menuTree, dialogTree, sheetTree, emptyStateTree, errorStateTree,
  skeletonTree, skeletonBarTree, listingShellTree, detailShellTree, wizardTree,
};