import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='tools/mcp/MapEditerMCP/outputs/',reports=[root+'mcp-native-test-94GMxB/report.json',root+'mcp-native-test-VHD7Ag/report.json',root+'mcp-native-test-u9UXev/report.json',root+'mcp-native-test-u9UXev/courtyard-restart-N2FvIC/courtyard-restart-report.json',root+'mcp-native-test-u9UXev/courtyard-visual-matrix-YS8wAf/courtyard-visual-report.json',root+'mcp-native-test-8lFeFU/report.json'];
const records=[];
for(const file of reports){const bytes=await fs.readFile(file),r=JSON.parse(bytes);assert.equal(r.passed,true,file);assert.equal(createHash('sha256').update(await fs.readFile(r.executable)).digest('hex'),r.executableSha256);records.push({file,sha256:createHash('sha256').update(bytes).digest('hex'),executableSha256:r.executableSha256});}
const matrix=JSON.parse(await fs.readFile('outputs/service-courtyard-review-v0d00T/report.json','utf8'));assert.equal(matrix.cases.length,192);assert.equal(matrix.cases.filter(c=>c.passed).length,144);assert.equal(matrix.cases.filter(c=>!c.passed).length,48);
for(const size of ['small','standard','large','massive'])for(const terrain of ['flat','valley','irregular'])assert.equal(matrix.cases.filter(c=>c.size===size&&c.terrain===terrain&&c.passed).length,12);
const images=JSON.parse(await fs.readFile('outputs/courtyard-visual-v1/report.json','utf8'));assert.equal(images.cases.length,12);for(const c of images.cases)assert.equal(createHash('sha256').update(await fs.readFile(c.file)).digest('hex'),c.sha256);
await fs.writeFile('outputs/courtyard-admission-audit.json',JSON.stringify({passed:true,scope:'Retained native receipts, executable hashes, terrain counts and controlled source hashes; eight-part semantic assessment in docs/SERVICE_COURTYARD_ADMISSION.md',records,terrain:{cases:192,accepted:144,rejected:48},controlledSources:12},null,2));console.log('Courtyard retained evidence audit passed');
