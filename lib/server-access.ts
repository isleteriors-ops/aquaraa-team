import 'server-only';
import {type AppUser} from './auth';
import {type Workspace} from './model';
import {AccessError,type Access} from './access-policy';
import {serviceClient} from './supabase';
export {validOrigin} from './auth-config';
export const apiJson=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});

export async function resolveAccess(user:AppUser):Promise<Access>{
 const expected=process.env.AQUARAA_OWNER_EMAIL?.trim().toLowerCase();
 if(!expected)throw new AccessError('Administrator sign-in is not configured yet.',503);
 const {data,error}=await serviceClient().rpc('aquaraa_resolve_access',{p_user_id:user.userId,p_email:user.email,p_admin_email:expected});
 if(error)throw new Error('Access lookup failed');
 const row=data?.[0];
 if(!row||!['owner','manager','staff'].includes(row.role))throw new AccessError();
 return {role:row.role,ownerId:row.owner_id,employeeId:row.employee_id};
}
export async function readWorkspace(ownerId:string){
 const {data,error}=await serviceClient().from('aquaraa_workspaces').select('data,revision').eq('owner_id',ownerId).single();
 if(error||!data)throw new Error('Workspace is unavailable');
 return {data:data.data as Workspace,revision:data.revision as number};
}
export async function saveWorkspace(ownerId:string,revision:number,data:Workspace){
 const result=await serviceClient().from('aquaraa_workspaces').update({data,revision:revision+1}).eq('owner_id',ownerId).eq('revision',revision).select('revision');
 if(result.error)throw new Error('Workspace save failed');
 return result.data.length===1;
}
export async function listMembers(ownerId:string){
 const {data,error}=await serviceClient().from('aquaraa_members').select('id,employee_id,email,user_id,role,created_at').eq('owner_id',ownerId).order('created_at',{ascending:false});
 if(error)throw new Error('Unable to load staff access');
 return data.map(m=>({id:m.id,employeeId:m.employee_id,email:m.email,role:m.role,createdAt:m.created_at,linked:m.user_id?1:0}));
}
