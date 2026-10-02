import { z } from 'zod';
const count = z.number().int().min(0).max(10000000);
export const recordSchema = z.object({
  id:z.string().min(1).max(120), name:z.string().trim().min(1).max(120),
  usn:z.string().trim().max(30), branch:z.enum(['CSE','ISE','ECE','Unknown']),
  company:z.string().trim().min(1).max(100), kind:z.enum(['fulltime','internship','internship_fte','internship_ppo','internship_unspecified','training','waitlist']),
  date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => !Number.isNaN(Date.parse(s)),'Enter a valid date.'),
  source:z.string().max(600), note:z.string().max(1500),
});
export const stateSchema = z.object({
  batchName:z.string().trim().min(1).max(100), total:count,
  eligible:count.nullable(), branchTotals:z.object({CSE:count.nullable(),ISE:count.nullable(),ECE:count.nullable()}),
  includeInternships:z.boolean(), records:z.array(recordSchema).max(10000),
  sourceThrough:z.string().max(30),
}).superRefine((s,ctx)=>{
  const add=(message:string)=>ctx.addIssue({code:'custom',message});
  if(s.eligible!==null&&s.eligible>s.total)add('Eligible students cannot exceed total students.');
  const totals=Object.values(s.branchTotals);
  if(totals.reduce<number>((a,b)=>a+(b??0),0)>s.total)add('Branch totals cannot exceed the batch total.');
  if(totals.every(v=>v!==null)&&totals.reduce<number>((a,b)=>a+(b??0),0)!==s.total)add('When all branch totals are known, they must add up to the batch total.');
  if(new Set(s.records.map(r=>r.id)).size!==s.records.length)add('Duplicate record identifiers were found.');
  const confirmed=s.records.filter(r=>isConfirmed(r));
  if(uniqueStudents(confirmed).length>s.total)add('Confirmed students cannot exceed the batch total.');
  const included=confirmed.filter(r=>hasFullTime(r)||s.includeInternships);
  if(s.eligible!==null&&uniqueStudents(included).length>s.eligible)add('Eligible count cannot be smaller than the selected student count.');
  for(const b of ['CSE','ISE','ECE'] as const){
    if(s.branchTotals[b]!==null&&uniqueStudents(confirmed.filter(r=>r.branch===b)).length>s.branchTotals[b]!)add(`${b} total is smaller than its confirmed student count.`);
  }
});
export type RecordEntry=z.infer<typeof recordSchema>;
export type TrackerState=z.infer<typeof stateSchema>;
export type Revision={id:number;summary:string;createdAt:string};
export type TrackerResponse={version:number;state:TrackerState;history:Revision[]};
export const emptyState:TrackerState={batchName:'RVITM · Class of 2027',total:400,eligible:null,branchTotals:{CSE:null,ISE:null,ECE:null},includeInternships:true,records:[],sourceThrough:'',};
export function studentKey(r:RecordEntry){return r.usn?r.usn.toUpperCase().replace(/\s/g,''):r.name.toLowerCase().replace(/[^a-z0-9]/g,'');}
export function uniqueStudents(records:RecordEntry[]){return [...new Map(records.map(r=>[studentKey(r),r])).values()];}
export function isConfirmed(r:RecordEntry){return r.kind!=='training'&&r.kind!=='waitlist';}
export function hasFullTime(r:RecordEntry){return r.kind==='fulltime'||r.kind==='internship_fte';}
export function includedRecords(state:TrackerState){return state.records.filter(r=>hasFullTime(r)||(state.includeInternships&&isConfirmed(r)));}
export function studentBuckets(records:RecordEntry[]){
 const priority={fulltime:5,internship_fte:4,internship_ppo:3,internship_unspecified:2,internship:1,training:0,waitlist:0};
 const students=new Map<string,RecordEntry>();
 for(const r of records.filter(isConfirmed)){const key=studentKey(r),old=students.get(key);if(!old||priority[r.kind]>priority[old.kind])students.set(key,r);}
 return [...students.values()];
}
export function rate(n:number,d:number|null){return d===null||d===0?null:n/d*100;}
export function percent(n:number|null){return n===null?'—':`${Number(n.toFixed(1))}%`;}
export const kindLabels={fulltime:'Direct full-time',internship:'Internship only',internship_fte:'Internship + confirmed FTE',internship_ppo:'Internship + performance-based FTE',internship_unspecified:'Internship + PPO (terms unclear)',training:'Training / fellowship',waitlist:'Waitlisted'};
export const updateSchema=z.object({requestId:z.string().uuid(),baseVersion:z.number().int().min(0),state:stateSchema,summary:z.string().trim().min(1).max(300)});
