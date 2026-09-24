#!/bin/bash
set -e

DESIGN_CORE_VERSION=$(node -p "require('/home/p31/P31-local-workspace/packages/design-core/package.json').version")
TARBALL="p31-design-core-${DESIGN_CORE_VERSION}.tgz"
CHECKSUM_FILE="${TARBALL}.sha256"

echo "Packing design-core workspace v${DESIGN_CORE_VERSION}..."

cd /home/p31/P31-local-workspace/packages/design-core
pnpm pack --pack-destination /home/p31/production/portals/qpj/scripts/pack-tmp/ 2>/dev/null || true
mkdir -p /home/p31/production/portals/qpj/scripts/pack-tmp/
cd /home/p31/P31-local-workspace/packages/design-core
pnpm pack --pack-destination /home/p31/production/portals/qpj/scripts/pack-tmp/

cp /home/p31/production/portals/qpj/scripts/pack-tmp/${TARBALL} /home/p31/production/portals/qpj/vendor/ 2>/dev/null || true

CHECKSUM=$(shasum -a 256 /home/p31/production/portals/qpj/scripts/pack-tmp/${TARBALL} | awk '{print $1}')
echo "$CHECKSUM" > /home/p31/production/portals/qpj/scripts/pack-tmp/${CHECKSUM_FILE}

echo "Packing ${TARBALL} to all portals..."

for portal in /home/p31/production/portals/*/; do
  PORTAL_NAME=$(basename "$portal")
  [ "$PORTAL_NAME" = "template" ] && continue
  [ "$PORTAL_NAME" = "qpj" ] && continue

  VENDOR_DIR="${portal}vendor"
  mkdir -p "$VENDOR_DIR"
  cp /home/p31/production/portals/qpj/scripts/pack-tmp/${TARBALL} "$VENDOR_DIR/" 2>/dev/null || true
  cp /home/p31/production/portals/qpj/scripts/pack-tmp/${CHECKSUM_FILE} "$VENDOR_DIR/" 2>/dev/null || true
  echo "✓ Packed to ${PORTAL_NAME}/vendor/"
done

rm -rf /home/p31/production/portals/qpj/scripts/pack-tmp/

echo "✓ Design-core vendored across all portals"