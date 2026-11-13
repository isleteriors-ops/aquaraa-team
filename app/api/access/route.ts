import {getUser} from '@/lib/auth';
import {serviceClient} from '@/lib/supabase';
import {apiJson as json,listMembers,readWorkspace,resolveAccess,validOrigin} from '@/lib/server-access';
import {siteOrigin} from '@/lib/auth-config';
import {AccessError} from '@/lib/access-policy';
import {rateLimit} from '@/lib/rate-limit';
import {z,ZodError} from 'zod';
export const dynamic='force-dynamic';
export async function GET(){try{const user=await getUser();if(!user)return json({error:'Please sign in'},401);const access=await resolveAccess(user);if(access.role!=='owner')throw new AccessError('Only the administrator can manage staff access.');return json({members:await listMembers(access.ownerId)});}catch(e){return json({error:e instanceof AccessError?e.message:'Unable to load staff access'},e instanceof AccessError?e.status:503);}}
const command=z.discriminatedUnion('action',[
 z.object({action:z.literal('register'),employeeId:z.string().min(1).max(80),email:z.string().trim().email().max(200),role:z.enum(['staff','manager'])}),
 z.object({action:z.literal('revoke'),id:z.string().min(1).max(80)}),
 z.object({action:z.literal('setup-link'),id:z.string().min(1).max(80)}),
]);
export async function POST(request:Request){try{
 const user=await getUser();if(!user)return json({error:'Please sign in'},401);if(!validOrigin(request))throw new AccessError('Request origin is not allowed.');
 const access=await resolveAccess(user);if(access.role!=='owner')throw new AccessError('Only the administrator can manage staff access.');
 const raw=await request.text();if(raw.length>5000)return json({error:'Request is too large'},413);let parsed;try{parsed=JSON.parse(raw)}catch{return json({error:'Invalid request'},400)}const cmd=command.parse(parsed),db=serviceClient();
 if(cmd.action==='register'){
  const {data}=await readWorkspace(access.ownerId),employee=data.employees.find(e=>e.id===cmd.employeeId);if(!employee||employee.status!=='Active')return json({error:'Choose an active employee. Add their employee profile first.'},400);
  const email=cmd.email.toLowerCase();if(email===user.email||email===process.env.AQUARAA_OWNER_EMAIL?.trim().toLowerCase())return json({error:'This email is reserved for administrator access.'},400);
  const found=await db.from('aquaraa_members').select('id,email').eq('owner_id',access.ownerId).eq('employee_id',cmd.employeeId).maybeSingle();if(found.error)throw found.error;
  const result=found.data?await db.from('aquaraa_members').update({email,role:cmd.role,...(found.data.email!==email?{user_id:null}:{})}).eq('id',found.data.id).eq('owner_id',access.ownerId):await db.from('aquaraa_members').insert({id:crypto.randomUUID(),owner_id:access.ownerId,employee_id:cmd.employeeId,email,role:cmd.role});
  if(result.error?.code==='23505')return json({error:'This email is already registered to another employee.'},409);
  if(result.error)throw result.error;
 }else if(cmd.action==='revoke'){
  const {error}=await db.from('aquaraa_members').delete().eq('owner_id',access.ownerId).eq('id',cmd.id);if(error)throw error;
 }else{
  const result=await db.from('aquaraa_members').select('email,employee_id').eq('owner_id',access.ownerId).eq('id',cmd.id).single();if(result.error||!result.data)return json({error:'Account registration not found.'},404);
  const {data}=await readWorkspace(access.ownerId);if(!data.employees.some(e=>e.id===result.data.employee_id&&e.status==='Active'))return json({error:'This employee is inactive.'},403);
  if(!await rateLimit('setup',cmd.id,5,3600))return json({error:'Too many setup links. Try again later.'},429);
  // Links are shown only to the owner for private delivery, never emailed or stored.
  let link=await db.auth.admin.generateLink({type:'invite',email:result.data.email});
  if(link.error&&(link.error.code==='email_exists'||link.error.code==='user_already_exists'))link=await db.auth.admin.generateLink({type:'recovery',email:result.data.email});
  if(link.error||!link.data.properties?.hashed_token)return json({error:'Unable to generate a setup link. Please try again.'},503);
  const url=new URL('/auth/confirm',siteOrigin());url.searchParams.set('token_hash',link.data.properties.hashed_token);url.searchParams.set('type',link.data.properties.verification_type);
  return json({members:await listMembers(access.ownerId),setupLink:url.href,email:result.data.email});
 }
 return json({members:await listMembers(access.ownerId)});
}catch(e){if(e instanceof AccessError)return json({error:e.message},e.status);if(e instanceof ZodError)return json({error:e.issues[0]?.message||'Check your entries'},400);return json({error:'Unable to update access. Refresh and try again.'},503);}}
