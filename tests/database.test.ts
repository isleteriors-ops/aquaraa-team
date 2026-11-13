import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {blankWorkspace} from '../lib/model';
const owner='00000000-0000-4000-8000-000000000001';
const staff='00000000-0000-4000-8000-000000000002';
const attacker='00000000-0000-4000-8000-000000000003';
const migration=await readFile(new URL('../supabase/migrations/001_aquaraa.sql',import.meta.url),'utf8');
async function database(){const db=new PGlite();await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');await db.exec(migration);return db;}
async function access(db:PGlite,id:string,email:string){return (await db.query('select * from aquaraa_resolve_access($1,$2,$3)',[id,email,'hello@aquaraa.com'])).rows as any[];}
test('only designated admin can bootstrap; binding cannot be claimed by same-email second ID',async()=>{
 const db=await database();try{
  assert.deepEqual(await access(db,attacker,'unknown@example.invalid'),[]);
  const a=await access(db,owner,'hello@aquaraa.com');assert.equal(a[0].role,'owner');
  assert.deepEqual(await access(db,attacker,'hello@aquaraa.com'),[]);
  assert.equal((await access(db,owner,'new@example.invalid'))[0].owner_id,a[0].owner_id);
 }finally{await db.close()}
});
test('migration preserves all records and resets provider bindings; overwrite is refused',async()=>{
 const db=await database();try{
  const data=blankWorkspace();data.employees=[{id:'one',name:'One',status:'Active'} as any];data.activity=[{id:'a',text:'Existing data',at:'2026-11-13'}];
  const members=[{id:'member',employee_id:'one',email:'staff@example.invalid',user_id:'old-chatgpt-id',role:'staff',created_at:'2026-11-13T00:00:00Z'}];
  await db.query('select aquaraa_import($1,$2,$3,$4)',['original-owner',JSON.stringify(data),7,JSON.stringify(members)]);
  assert.deepEqual((await db.query('select data,revision from aquaraa_workspaces')).rows,[{data,revision:7}]);
  assert.equal((await access(db,owner,'hello@aquaraa.com'))[0].owner_id,'original-owner');
  assert.equal((await db.query<{user_id:string|null}>('select user_id from aquaraa_members')).rows[0].user_id,null);
  assert.equal((await access(db,staff,'staff@example.invalid'))[0].employee_id,'one');
  assert.deepEqual(await access(db,attacker,'staff@example.invalid'),[]);
  await assert.rejects(()=>db.query('select aquaraa_import($1,$2,$3,$4)',['old',JSON.stringify(data),7,'[]']),/already initialized/);
 }finally{await db.close()}
});
test('inactive and revoked employees lose access immediately; managers keep their role',async()=>{
 const db=await database();try{
  const a=(await access(db,owner,'hello@aquaraa.com'))[0];
  const data=blankWorkspace();data.employees=[{id:'one',name:'One',status:'Active'} as any];
  await db.query('update aquaraa_workspaces set data=$1 where owner_id=$2',[JSON.stringify(data),a.owner_id]);
  await db.query("insert into aquaraa_members(id,owner_id,employee_id,email,role) values('m',$1,'one','staff@example.invalid','manager')",[a.owner_id]);
  assert.equal((await access(db,staff,'staff@example.invalid'))[0].role,'manager');
  data.employees[0].status='Inactive';await db.query('update aquaraa_workspaces set data=$1',[JSON.stringify(data)]);
  assert.deepEqual(await access(db,staff,'staff@example.invalid'),[]);
  data.employees[0].status='Active';await db.query('update aquaraa_workspaces set data=$1',[JSON.stringify(data)]);
  await db.exec('delete from aquaraa_members');assert.deepEqual(await access(db,staff,'staff@example.invalid'),[]);
 }finally{await db.close()}
});
test('browsers cannot query hotel tables or call privileged functions',async()=>{
 const db=await database();try{
  for(const role of ['anon','authenticated']){
   await db.exec('set role '+role);
   for(const table of ['aquaraa_workspaces','aquaraa_members','aquaraa_admin','aquaraa_auth_limits'])await assert.rejects(()=>db.query('select * from '+table),/permission denied/);
   await assert.rejects(()=>access(db,attacker,'hello@aquaraa.com'),/permission denied/);
   await assert.rejects(()=>db.query("select aquaraa_rate_limit('a',1,60)"),/permission denied/);
   await assert.rejects(()=>db.query("select aquaraa_import('a','{}',0,'[]')"),/permission denied/);
   await db.exec('reset role');
  }
 }finally{await db.close()}
});
test('atomic rate limiting and revision comparison prevent excess attempts and lost saves',async()=>{
 const db=await database();try{
  const attempts=[];for(let i=0;i<4;i++)attempts.push((await db.query<{ok:boolean}>("select aquaraa_rate_limit('login:hashed',2,60) as ok")).rows[0].ok);
  assert.deepEqual(attempts,[true,true,false,false]);
  await access(db,owner,'hello@aquaraa.com');
  assert.equal((await db.query('update aquaraa_workspaces set revision=revision+1 where revision=0 returning revision')).rows.length,1);
  assert.equal((await db.query('update aquaraa_workspaces set revision=revision+1 where revision=0 returning revision')).rows.length,0);
 }finally{await db.close()}
});
