/**
 * negative-control.tsx — D-2 fixture (PLANTED VIOLATIONS).
 *
 * This file deliberately contains one of each violation class the scanner
 * must flag. It is a fixture under V6-D-adoption/, NOT a real surface.
 * Gate expectation: compliance-scan.mjs --fixtures reports
 *   hex >= 1, rgb >= 1, px >= 1  → NEGATIVE CONTROL PASS.
 *
 * Planted (all three must be flagged):
 *   1. raw hex  #AABBCC  (also #ABC and #AABBCCDD if matched)
 *   2. rgba()   rgba(10, 20, 30, 0.5)
 *   3. px on scalable property  font-size: 16px
 */
export const plantedCard = {
  style: {
    backgroundColor: '#AABBCC',
    boxShadow: '0 0 20px rgba(10, 20, 30, 0.5)',
    fontSize: '16px',
  },
}