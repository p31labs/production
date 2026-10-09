const { SourceMapConsumer } = require('source-map');
const fs = require('fs');
const raw = fs.readFileSync('/tmp/opencode/vr.map','utf8');
const m = JSON.parse(raw.startsWith('{"version"')?raw:Buffer.from(raw,'base64').toString('utf8'));
SourceMapConsumer.with ? null : null;
const sm = new SourceMapConsumer(m);
for (const [gline,gcol,name] of [[40,27667,'Fr'],[40,27240,'er'],[40,53072,'Uh'],[40,52901,'Lh'],[40,93072,'ta'],[40,108351,'Wd']]) {
  const p = sm.originalPositionFor({line:gline, column:gcol-1});
  console.log(name, 'g@'+gline+':'+(gcol-1), '->', p.source.replace(/^.*\//,'').slice(0,30), 'L'+(p.line||'?')+':'+p.column, p.name?' '+p.name:'');
}
// find the throwOnInvalidElementType / element type invalid code
const src=fs.readFileSync('/tmp/opencode/vr.map','utf8');
if(m.sourcesContent){
  for(const [i,s] of m.sourcesContent.entries()){
    if(/throwOnInvalidElementType|invalid element type|Element type is invalid/i.test(s||'')){
      const idx=s.search(/Element type is invalid[\s\S]{0,400}/);
      console.log('=== throw msg in', m.sources[i].replace(/^.*\//,''), '===');
      console.log((s.slice(idx, idx+500)));
    }
  }
}
