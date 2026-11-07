import { fromB58 } from '../../../js/modules/utils/base58.js';
import fs from 'fs';
const k = JSON.parse(fs.readFileSync(new URL('../../../static/kiosks/default.json', import.meta.url)));
for (const c of k.collections) for (const r of c.realms) {
  const b = r.url.split('r=')[1];
  console.log(c.title, '|', r.name, '\n ', new TextDecoder().decode(fromB58(b)));
}
