import { getDatabase } from '@/db';
import { emptyState, updateSchema } from '@/lib/tracker';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function readData(){
  const db=getDatabase();
  const latest=await db.prepare('SELECT id,payload FROM revisions ORDER BY id DESC LIMIT 1').first<{id:number;payload:string}>();
  const history=await db.prepare('SELECT id,summary,created_at AS createdAt FROM revisions ORDER BY id DESC LIMIT 30').all();
  return {version:latest?.id??0,state:latest?JSON.parse(latest.payload):emptyState,history:history.results};
}
// Authorization is provided by the owner-private Sites boundary, including its
// OAI-Sites-Authorization service credential. Do not expose publicly without
// adding write authorization. Never store the service token in source.
export async function GET(){try{return json(await readData());}catch(e){console.error(e);return json({error:'Could not load your tracker. Please try again.'},503);}}
export async function POST(request:Request){
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return json({error:'This request is not allowed.'},403);
  if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'Expected a JSON update.'},415);
  let body:unknown;
  try{const text=await request.text();if(text.length>6000000)return json({error:'Update is too large.'},413);body=JSON.parse(text);}catch{return json({error:'The update could not be read.'},400);}
  const parsed=updateSchema.safeParse(body);
  if(!parsed.success)return json({error:parsed.error.issues[0].message},400);
  const v=parsed.data;
  try{
    const db=getDatabase();
    if(await db.prepare('SELECT id FROM revisions WHERE request_id=?').bind(v.requestId).first())return json(await readData());
    const result=await db.prepare('INSERT INTO revisions(request_id,payload,summary,created_at) SELECT ?,?,?,? WHERE COALESCE((SELECT MAX(id) FROM revisions),0)=? ON CONFLICT(request_id) DO NOTHING').bind(v.requestId,JSON.stringify(v.state),v.summary,new Date().toISOString(),v.baseVersion).run();
    if(result.meta.changes===0&&!(await db.prepare('SELECT id FROM revisions WHERE request_id=?').bind(v.requestId).first()))return json({error:'A newer update was saved. Close this form and refresh before trying again.'},409);
    return json(await readData(),201);
  }catch(e){console.error(e);return json({error:'Could not save. Your entries are still here; please try again.'},503);}
}
