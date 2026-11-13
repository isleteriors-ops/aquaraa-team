import {getUser} from '@/lib/auth';
import {applyCommand,InputError} from '@/lib/actions';
import {commandSchema} from '@/lib/validation';
import {AccessError,authorizeCommand,visibleWorkspace} from '@/lib/access-policy';
import {apiJson as json,saveWorkspace,readWorkspace,resolveAccess,validOrigin} from '@/lib/server-access';
import {ZodError} from 'zod';
export const dynamic='force-dynamic';
export async function GET(){try{const user=await getUser();if(!user)return json({error:'Please sign in to continue'},401);const access=await resolveAccess(user),current=await readWorkspace(access.ownerId);return json({data:visibleWorkspace(current.data,access),revision:current.revision,access:{role:access.role,employeeId:access.employeeId}});}catch(e){if(e instanceof AccessError)return json({error:e.message},e.status);console.error('Workspace read failed',e);return json({error:'Unable to load saved records. Please try again.'},503);}}
export async function POST(request:Request){
 try{
  const user=await getUser();if(!user)return json({error:'Please sign in to continue'},401);
  if(!validOrigin(request))return json({error:'Request origin is not allowed'},403);
  const access=await resolveAccess(user),raw=await request.text();if(raw.length>100000)return json({error:'Record is too large'},413);
  let body:unknown;try{body=JSON.parse(raw);}catch{return json({error:'Invalid request'},400);}
  const cmd=commandSchema.parse(body),current=await readWorkspace(access.ownerId);authorizeCommand(access,cmd,current.data);
  if(cmd.revision!==current.revision)return json({error:'Records changed in another window. Refresh to get the latest version before saving.'},409);
  const data=applyCommand(current.data,cmd);
  const saved=await saveWorkspace(access.ownerId,current.revision,data);
  if(!saved)return json({error:'Another update was saved first. Refresh and try again.'},409);
  return json({data:visibleWorkspace(data,access),revision:current.revision+1,access:{role:access.role,employeeId:access.employeeId}});
 }catch(e){if(e instanceof AccessError)return json({error:e.message},e.status);if(e instanceof ZodError)return json({error:e.issues[0]?.message||'Check the form fields'},400);if(e instanceof InputError)return json({error:e.message},400);console.error('Workspace write failed',e);return json({error:'The record could not be saved. Please try again.'},503);}
}
