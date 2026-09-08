import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {planTerrainAccents} from '../lib/accent-pattern-generator.ts';
import {Client} from './mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import {StdioClientTransport} from './mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
const [input,seed,out,sessionId]=process.argv.slice(2);
if(!input||!seed||!out)throw Error('Usage: node --experimental-strip-types tools/generate-terrain-accents.mjs INPUT.json SEED NEW-OUTPUT-DIR [MCP-SESSION-ID]');
const bytes=await fs.readFile(input),project=JSON.parse(bytes),plan=planTerrainAccents(project,seed);
await fs.mkdir(out,{recursive:true});
await fs.writeFile(path.join(out,'accent-plan.json'),JSON.stringify({...plan,input:path.resolve(input),inputSha256:createHash('sha256').update(bytes).digest('hex')},null,2),{flag:'wx'});
console.log(JSON.stringify({features:plan.features,before:plan.before,after:plan.after,brushes:plan.brushes.length}));
if(sessionId){
 const client=new Client({name:'seeded-terrain-accent-generator',version:'1'});
 await client.connect(new StdioClientTransport({command:process.execPath,args:['--experimental-strip-types',path.resolve('tools/mcp/server.mjs')],stderr:'pipe'}));
 const call=async(name,args)=>{const r=await client.callTool({name,arguments:args});if(r.isError)throw Error(r.content[0].text);return JSON.parse(r.content[0].text)};
 let applied=0,revision;
 try{
   const state=await call('get_editor_state',{sessionId});revision=state.revision;
   const saved=await call('save_copy',{sessionId,expectedRevision:revision,name:`accent-before-${Date.now()}`});
   const live=JSON.parse(await fs.readFile(saved.path));
   if(JSON.stringify(live.terrain)!==JSON.stringify(project.terrain)||JSON.stringify(live.entities)!==JSON.stringify(project.entities))throw Error('Live terrain or entities differ from the plan input. Re-plan; no brushes sent.');
   for(const brush of plan.brushes){const r=await call('edit_terrain',{sessionId,expectedRevision:revision,brush});revision=r.revision;applied++;if(applied%100===0)console.log(`Applied ${applied}/${plan.brushes.length}`);}
   const validation=await call('validate_map',{sessionId});
   await fs.writeFile(path.join(out,'receipt.json'),JSON.stringify({applied,revision,validation},null,2));
 }catch(e){await fs.writeFile(path.join(out,'interrupted.json'),JSON.stringify({applied,revision,error:String(e)},null,2));throw e;}
 finally{await client.close();}
}
