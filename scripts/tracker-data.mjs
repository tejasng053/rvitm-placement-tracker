// Read/update a PRIVATE tracker through its documented Sites service boundary.
// JSON and service tokens are accepted only over stdin, never command arguments.
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
console.log('Ready for tracker JSON on stdin (input is hidden).');
if(process.stdin.isTTY)process.stdin.setRawMode(true);
const input=await new Promise(resolve=>{let value='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>{value+=chunk;if(value.includes('\n')){process.stdin.pause();if(process.stdin.isTTY)process.stdin.setRawMode(false);resolve(value.slice(0,value.indexOf('\n')));}});});
try{
 const config=JSON.parse(input);
 const url=new URL('/api/tracker',config.url);
 if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw new Error('Use HTTPS for hosted tracker access.');
 const headers={'Content-Type':'application/json'};
 if(config.token)headers['OAI-Sites-Authorization']=`Bearer ${config.token}`;
 let response;
 if(config.action==='read'){
  response=await fetch(url,{headers,redirect:'error'});
 }else if(config.action==='update'){
  const update=JSON.parse(await readFile(config.inputFile,'utf8'));
  if(!Number.isInteger(update.baseVersion))throw new Error('An explicit baseVersion is required. Read the live tracker before editing.');
  response=await fetch(url,{method:'POST',headers,redirect:'error',body:JSON.stringify({...update,requestId:update.requestId??randomUUID()})});
 }else throw new Error('Action must be read or update.');
 const data=await response.json();
 if(!response.ok)throw new Error(data.error??`Request failed (${response.status})`);
 if(config.outputFile)await writeFile(config.outputFile,JSON.stringify(data,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({ok:true,version:data.version,records:data.state.records.length,outputFile:config.outputFile??null}));
}catch(error){console.error(error.message);process.exitCode=1;}
