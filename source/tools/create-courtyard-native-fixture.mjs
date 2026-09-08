import fs from 'node:fs/promises';
import {createBlankProject} from '../lib/wulfram.ts';
const p=createBlankProject('Courtyard native source',129);p.terrain.worldWidth=14000;p.terrain.worldHeight=10000;await fs.writeFile('outputs/courtyard-native-source.json',JSON.stringify(p),{flag:'wx'});
