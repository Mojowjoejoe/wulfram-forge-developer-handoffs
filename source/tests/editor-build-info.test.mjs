import test from 'node:test';
import assert from 'node:assert/strict';
import {getEditorBuildInfo} from '../lib/map-repository-client.ts';

await test('Build information uses native host identity and does not invent a browser or failed-host version',async()=>{
  assert.equal(await getEditorBuildInfo(),undefined);
  let listener,response={ok:true,result:{version:'0.7.0-test.1+fixture',runtimeVersion:'123.4'}};
  globalThis.window={chrome:{webview:{addEventListener(type,fn){assert.equal(type,'message');listener=fn;},postMessage(request){assert.equal(request.action,'app-info');queueMicrotask(()=>listener({data:{id:request.id,...response}}));}}}};
  try{
    assert.deepEqual(await getEditorBuildInfo(),response.result);
    response={ok:true,result:{version:'old-host'}};await assert.rejects(getEditorBuildInfo(),/invalid build information/);
    response={ok:false,error:'Unknown native repository operation: app-info'};await assert.rejects(getEditorBuildInfo(),/Unknown native/);
  }finally{delete globalThis.window;}
});
