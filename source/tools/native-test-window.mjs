import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// The PowerShell helper verifies both PID and executable before touching a window.
export function activateTestWindow(processId,executable){
  return requestTestWindow(processId,executable,'Activate');
}
export function closeTestWindow(processId,executable){
  return requestTestWindow(processId,executable,'Close');
}
function requestTestWindow(processId,executable,action){
  if(!Number.isInteger(processId)||processId<=0)throw new Error('Invalid test process ID.');
  return new Promise((resolve,reject)=>{
    const helper=spawn('powershell.exe',['-NoProfile','-NonInteractive','-File',fileURLToPath(new URL('./activate-test-window.ps1',import.meta.url)),'-TestProcessId',String(processId),'-ExpectedExecutable',executable,'-Action',action],{windowsHide:true,stdio:['ignore','pipe','pipe']});
    let output='',error='';
    const timer=setTimeout(()=>{helper.kill();reject(new Error(`Native test window ${action} timed out`));},10000);
    helper.stdout.on('data',data=>{output+=data;});helper.stderr.on('data',data=>{error+=data;});
    helper.on('error',e=>{clearTimeout(timer);reject(e);});
    helper.on('close',code=>{clearTimeout(timer);if(code!==0)reject(new Error(error||'Native window activation failed'));else try{resolve(JSON.parse(output));}catch(e){reject(e);}});
  });
}
