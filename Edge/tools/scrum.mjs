import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import { markdownRefusal } from './markdown.ts';

const root = fileURLToPath(new URL('../../scrum/', import.meta.url));
const properties = {
  id: {type:'string', description:'PI-01, S-01-1 or WI-001'},
  kind: {type:'string', enum:['pi','sprint','item']},
  parent: {type:'string'}, title:{type:'string'}, acceptance:{type:'string'},
  effort:{type:'integer',minimum:2,maximum:5,description:'Ef-2 through Ef-5. Split Ef-1.'},
  priority:{type:'integer',minimum:1,maximum:4}, severity:{type:'string'},
  type:{type:'string',enum:['feature','enhancement','bug','enabler','task']},
  status:{type:'string',enum:['proposed','ready','active','review','done']},
  evidence:{type:'string'}, revision:{type:'integer',minimum:0}
};
const tools = [
  {name:'query',description:'Get one record by ID, list children by parent, or list all records. PI-00 is development setup.',inputSchema:{type:'object',properties:{id:properties.id,parent:properties.parent},additionalProperties:false}},
  {name:'save',description:'Create or replace a complete PI, sprint or sized item. Use revision 0 for create or the current revision for update.',inputSchema:{type:'object',properties,required:['id','kind','title','acceptance','status','revision'],additionalProperties:false}}
];
function filename(id) {
  if (typeof id !== 'string' || !/^(PI-\d{2}|S-\d{2}-\d+|WI-\d{3,})$/.test(id)) throw Error('Invalid record ID');
  return path.join(root,id+'.json');
}
function read(id) { return JSON.parse(fs.readFileSync(filename(id),'utf8')); }
function save(r) {
  const file = filename(r.id);
  if (!properties.kind.enum.includes(r.kind)) throw Error('Invalid kind');
  if (!r.id.startsWith({pi:'PI-',sprint:'S-',item:'WI-'}[r.kind])) throw Error('ID and kind disagree');
  for (const key of Object.keys(r)) if (!Object.hasOwn(properties,key)) throw Error('Unknown field '+key);
  for (const key of ['title','acceptance',...(r.evidence !== undefined ? ['evidence'] : [])]) {
    if (typeof r[key] !== 'string' || !r[key].trim() || markdownRefusal(r[key])) throw Error('Invalid '+key);
  }
  if (!properties.status.enum.includes(r.status)) throw Error('Invalid status');
  if (r.kind !== 'pi' && read(r.parent).kind !== (r.kind === 'sprint' ? 'pi':'sprint')) throw Error('Invalid parent kind');
  if (r.kind === 'pi' && r.parent !== undefined) throw Error('PI cannot have a parent');
  if (r.kind === 'item' && (!properties.type.enum.includes(r.type) || ![2,3,4,5].includes(r.effort) || ![1,2,3,4].includes(r.priority))) throw Error('Item requires type, priority and effort');
  if (r.severity !== undefined && r.type !== 'bug') throw Error('Only bugs carry severity');
  if (r.status === 'done' && !r.evidence) throw Error('Acceptance requires evidence');
  const lock=file+'.lockdir';
  fs.mkdirSync(lock);
  const temp=file+'.'+randomUUID()+'.tmp';
  try {
    const previous=fs.existsSync(file)?read(r.id):null;
    const revision=previous?.revision??0;
    if (revision!==r.revision) throw Error('Revision changed. Query the record again.');
    const next={...r, revision:revision+1};
    fs.writeFileSync(temp,JSON.stringify(next,null,2)+'\n',{flag:'wx'});
    fs.renameSync(temp,file);
    return next;
  } finally {fs.rmSync(temp,{force:true}); fs.rmdirSync(lock);}
}
function action(name,args) {
  if (name==='save') return save(args);
  if (name!=='query') throw Error('Unknown tool');
  if (args.id) return read(args.id);
  return fs.readdirSync(root).filter(p=>p.endsWith('.json')).sort().map(p=>read(p.slice(0,-5))).filter(r=>!args.parent || r.parent===args.parent);
}
if (process.argv[2]) {
  const args=process.argv[3]==='-'?fs.readFileSync(0,'utf8'):process.argv[3]??'{}';
  console.log(JSON.stringify(action(process.argv[2],JSON.parse(args)),null,2));
} else {
  for await (const line of createInterface({input:process.stdin})) {
    let msg;
    try {
      msg=JSON.parse(line);
      if (msg.id===undefined) continue;
      let result;
      if(msg.method==='initialize') result={protocolVersion:msg.params.protocolVersion,capabilities:{tools:{}},serverInfo:{name:'foundation-scrum',version:'0.1'}};
      else if(msg.method==='ping') result={};
      else if(msg.method==='tools/list') result={tools};
      else if(msg.method==='tools/call') {
        try {result={content:[{type:'text',text:JSON.stringify(action(msg.params.name,msg.params.arguments??{}))}]};}
        catch(e){result={isError:true,content:[{type:'text',text:e.message}]};}
      } else {console.log(JSON.stringify({jsonrpc:'2.0',id:msg.id,error:{code:-32601,message:'Unknown method'}}));continue;}
      console.log(JSON.stringify({jsonrpc:'2.0',id:msg.id,result}));
    } catch(e){console.log(JSON.stringify({jsonrpc:'2.0',id:msg?.id??null,error:{code:-32600,message:e.message}}));}
  }
}
