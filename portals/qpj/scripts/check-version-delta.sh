#!/bin/bash
set -e

echo "=== Design-core 2.2.0 → 2.3.0 Delta Audit ==="
echo ""

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

cd "$TMPDIR"

echo "Extracting design-core 2.2.0 (children portal)..."
tar xzf /home/p31/production/portals/children/vendor/p31-design-core-2.2.0.tgz
mkdir -p v220 && cp -r package/* v220/ && rm -rf package

echo "Extracting design-core 2.3.0 (QPJ portal)..."
tar xzf /home/p31/production/portals/qpj/vendor/p31-design-core-2.3.0.tgz
mkdir -p v230 && cp -r package/* v230/ && rm -rf package

echo ""
echo "=== CSS Changes (all.css) ==="
if diff -u v220/src/css/all.css v230/src/css/all.css > /tmp/diff-all.css 2>&1; then
  echo "✓ No changes in all.css"
else
  echo "CHANGES DETECTED — $(wc -l < /tmp/diff-all.css) lines of diff:"
  cat /tmp/diff-all.css
fi

echo ""
echo "=== CSS Changes (container.css) ==="
if diff -u v220/src/css/container.css v230/src/css/container.css > /tmp/diff-container.css 2>&1; then
  echo "✓ No changes in container.css"
else
  echo "CHANGES DETECTED — $(wc -l < /tmp/diff-container.css) lines of diff:"
  cat /tmp/diff-container.css
fi

echo ""
echo "=== Package.json Export Changes ==="
if diff -u v220/package.json v230/package.json > /tmp/diff-pkg.json 2>&1; then
  echo "✓ No changes in package.json exports"
else
  echo "CHANGES DETECTED:"
  cat /tmp/diff-pkg.json
fi

echo ""
echo "=== File Count Changes ==="
echo "2.2.0 files: $(find v220 -type f | wc -l)"
echo "2.3.0 files: $(find v230 -type f | wc -l)"
echo ""
diff <(cd v220 && find . -type f | sort) <(cd v230 && find . -type f | sort) | head -40 || true

echo ""
echo "=== TypeScript Type Changes ==="
if diff -rq v220/src v230/src > /tmp/diff-src.txt 2>&1; then
  echo "✓ No source file changes"
else
  echo "SOURCE CHANGES DETECTED:"
  cat /tmp/diff-src.txt
fi

echo ""
echo "=== Delta Summary ==="
CSS_DIFF=$(diff v220/src/css/all.css v230/src/css/all.css | wc -l)
PKG_DIFF=$(diff v220/package.json v230/package.json | wc -l)
SRC_DIFF=$(diff -rq v220/src v230/src | wc -l)

echo "CSS all.css diff lines: $CSS_DIFF"
echo "package.json diff lines: $PKG_DIFF"
echo "Source file differences: $SRC_DIFF"

if [ "$CSS_DIFF" -lt 10 ] && [ "$PKG_DIFF" -lt 20 ] && [ "$SRC_DIFF" -eq 0 ]; then
  echo ""
  echo "✓ LOW RISK: Delta is small. Safe to sync children/teen/parent to 2.3.0."
else
  echo ""
  echo "⚠ MEDIUM/HIGH RISK: Review diffs above before syncing."
fi

echo ""
echo "✓ Version delta analysis complete"