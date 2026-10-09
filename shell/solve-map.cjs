const { SourceMapConsumer } = require('source-map');
const fs = require('fs');
const raw = fs.readFileSync('/tmp/opencode/cv.map', 'utf8');
const buf = raw.startsWith('{"version"') ? raw : Buffer.from(raw, 'base64').toString('utf8');
const m = JSON.parse(buf);
const map = new SourceMapConsumer(m);
for (const col of [23600,23700,23738,23739,23740,23750,23800,23850,23900,24000,24100,24200,24300]) {
  const p = map.originalPositionFor({ line: 1, column: col });
  if (p.source) console.log('gcol', col, '->', p.source.replace(/.*\//,''), 'L'+(p.line||'?')+' C'+(p.column||'?')+(p.name?' name='+p.name:''));
}
// also find the <DomeGeometry> <Canvas> creation in SpaceshipEarth source region
console.log('--- SpaceshipEarth.tsx lines 78-120 ---');
const smcx = m.sourcesContent[19]; // SpaceshipEarth
console.log(smcx.split('\n').slice(77,119).map((l,i)=>i+78+': '+l).join('\n'));
map.close && map.close();
