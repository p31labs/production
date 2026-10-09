import('@p31ca/shell-chrome').then(m => {
  console.log('canon exports keys:', Object.keys(m).slice(0,40));
  console.log('DomeGeometry:', typeof m.DomeGeometry, m.DomeGeometry && m.DomeGeometry.name);
  console.log('StarfieldBackground:', typeof m.StarfieldBackground);
  console.log('sourceToNode:', typeof m.sourceToNode);
  console.log('domeState:', typeof m.domeState);
  console.log('DomeHero:', typeof m.DomeHero);
  console.log('CosmosFX:', typeof m.CosmosFX);
}).catch(e => { console.error('IMPORT FAIL:', e.message); });
