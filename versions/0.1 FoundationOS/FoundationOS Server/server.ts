import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { open, readFile, readdir, rename, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const version = '0.1';
const data = path.resolve(process.env.FOUNDATIONOS_DATA || path.join(process.env.LOCALAPPDATA || homedir(), 'FoundationOS', 'development', version));
mkdirSync(data, {recursive:true, mode:0o700});
const root = realpathSync.native(data);
const db = new DatabaseSync(path.join(root,'accounts.sqlite'));
db.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS profiles(id TEXT PRIMARY KEY, name TEXT UNIQUE, digest TEXT UNIQUE)');
const digest = (token:string) => createHash('sha256').update(token).digest('hex');

function directory(directoryPath:string) {
  if (!lstatSync(directoryPath).isDirectory() || realpathSync.native(directoryPath) !== directoryPath) throw new Error('Workspace directory unavailable');
  return directoryPath;
}
const homesPath = path.join(root, 'homes');
mkdirSync(homesPath,{recursive:true,mode:0o700});
function home(id:string) {return directory(path.join(directory(homesPath),id));}

function provision(name:string) {
  if (!/^[a-z][a-z0-9_-]{1,38}$/.test(name)) throw Error('Use a lowercase profile name of 2 to 39 characters.');
  const id=randomUUID();
  const token=randomBytes(32).toString('base64url');
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT INTO profiles VALUES (?,?,?)').run(id,name,digest(token));
    mkdirSync(path.join(directory(homesPath),id),{mode:0o700});
    writeFileSync(path.join(home(id),'profile.json'),JSON.stringify({id,name},null,2),{flag:'wx',mode:0o600});
    mkdirSync(path.join(home(id),'files'),{mode:0o700});
    db.exec('COMMIT');
  } finally {if(db.isTransaction) db.exec('ROLLBACK');}
  console.log(JSON.stringify({id,name,token}));
}
function reply(res:ServerResponse,code:number,value:unknown) {
  res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(value));
}
function regular(file:string) {
  const stat=lstatSync(file);
  return stat.isFile() && stat.nlink===1 && realpathSync.native(file)===file;
}
async function handle(req:IncomingMessage,res:ServerResponse) {
  const route=req.url || '';
  if (route==='/status' && req.method==='GET') return reply(res,200,{version,status:'ready'});
  const auth=/^Bearer ([\w-]{43})$/.exec(req.headers.authorization || '');
  const account=auth && db.prepare('SELECT id,name FROM profiles WHERE digest=?').get(digest(auth[1]));
  if (!account) return reply(res,401,{error:'Sign in with a profile key'});
  if (route==='/profile' && req.method==='GET') return reply(res,200,account);
  const folder=directory(path.join(home(String(account.id)),'files'));
  if(route==='/files' && req.method==='GET'){
    const entries=await readdir(folder,{withFileTypes:true});
    return reply(res,200,entries.filter(e=>e.isFile() && validName(e.name) && regular(path.join(folder,e.name))).map(e=>e.name));
  }
  const leaf=route.startsWith('/files/')?route.slice(7):'';
  if (!validName(leaf)) return reply(res,404,{error:'Unknown file'});
  const file=path.join(folder,leaf);
  if (existsSync(file) && !regular(file)) return reply(res,404,{error:'Unknown file'});
  if (req.method==='GET') {
    if(!existsSync(file)) return reply(res,404,{error:'Unknown file'});
    return reply(res,200,{text:await readFile(file,'utf8')});
  }
  if(req.method!=='PUT') return reply(res,405,{error:'Use GET or PUT'});
  const chunks:Buffer[]=[];
  let bytes=0;
  for await(const chunk of req){
    bytes+=chunk.length;
    if(bytes>65536) return reply(res,413,{error:'Text file exceeds 64 KiB'});
    chunks.push(chunk);
  }
  const temp=path.join(folder,'.'+randomUUID()+'.tmp');
  const handle=await open(temp,'wx',0o600);
  try {
    try {await handle.writeFile(Buffer.concat(chunks));} finally {await handle.close();}
    await rename(temp,file);
    return reply(res,200,{name:leaf});
  } finally {await rm(temp,{force:true});}
}
function validName(name:string) {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(name) && !name.endsWith('.') &&
    !/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\.|$)/i.test(name);
}
if(process.argv[2]==='create-user') {
  provision(process.argv[3]||'');
  db.close();
} else if(!process.argv[2]){
  const server=createServer((req,res)=>{handle(req,res).catch(()=>reply(res,503,{error:'Workspace unavailable'}));});
  server.listen(Number(process.env.FOUNDATIONOS_PORT||0),'127.0.0.1',()=>{
    const addr=server.address();
    if(addr && typeof addr!=='string') console.log('FoundationOS '+version+' ready at http://127.0.0.1:'+addr.port+'/status');
  });
} else {throw Error('Use Start.cmd or Start.cmd create-user NAME');}
