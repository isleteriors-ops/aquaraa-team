import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {z} from 'zod';
import {schemas} from '../lib/validation';
const document=z.object({ownerId:z.string().min(1),revision:z.number().int().min(0),data:z.object({
 employees:z.array(schemas.employees),shifts:z.array(schemas.shifts),attendance:z.array(schemas.attendance),leave:z.array(schemas.leave),adjustments:z.array(schemas.adjustments),pools:z.array(schemas.pools),payroll:z.array(z.object({id:z.string(),period:z.string(),savedAt:z.string(),rows:z.array(z.record(z.unknown())),totalMvr:z.number(),totalUsd:z.number()}).passthrough()),activity:z.array(z.object({id:z.string(),text:z.string(),at:z.string()}).passthrough()),
}).passthrough(),members:z.array(z.object({id:z.string(),employee_id:z.string(),email:z.string().email(),role:z.enum(['staff','manager']),created_at:z.string()}))});
const path=process.argv[2];if(!path)throw new Error('Usage: npx tsx scripts/import-records.ts /private/path/export.json');
const input=document.parse(JSON.parse(await readFile(path,'utf8')));
const employees=new Set(input.data.employees.map(e=>e.id));
if(input.members.some(m=>!employees.has(m.employee_id)))throw new Error('A staff registration does not match an employee.');
if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SECRET_KEY)throw new Error('Configure Supabase server credentials first.');
const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const {error}=await client.rpc('aquaraa_import',{p_owner_id:input.ownerId,p_data:input.data,p_revision:input.revision,p_members:input.members});
if(error)throw new Error('Import failed; destination may already be initialized. No records were overwritten.');
const result=await client.from('aquaraa_workspaces').select('data,revision').eq('owner_id',input.ownerId).single();
if(result.error||result.data.revision!==input.revision)throw new Error('Import verification failed');
// PostgreSQL JSONB orders object keys, so compare content canonically.
const canonical=(value:unknown):string=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}':JSON.stringify(value);
if(canonical(result.data.data)!==canonical(input.data))throw new Error('Imported record comparison failed');
console.log(`Verified ${input.data.employees.length} employees, ${input.data.payroll.length} payroll snapshots and revision ${input.revision}.`);
