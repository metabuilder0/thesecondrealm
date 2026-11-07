import fs from 'fs';
export function load(name){
  const lines = fs.readFileSync(new URL(`../../../static/data/series_blocks_${name}.csv`, import.meta.url),'utf8').split('\n');
  lines.shift(); if (lines[lines.length-1]==='') lines.pop();
  return lines.map(v=>+v);
}
