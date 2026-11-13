import 'server-only';
import {redirect} from 'next/navigation';
import {authClient} from './supabase';
import {safeReturnTo} from './auth-config';
export type AppUser={userId:string;email:string;fullName:string|null};
export async function getUser():Promise<AppUser|null>{
  if(!process.env.SUPABASE_URL||!process.env.SUPABASE_PUBLISHABLE_KEY)return null;
  const client=await authClient();
  // Verify with the authentication server; never trust incoming identity headers
  // or an unverified session-cookie payload.
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user?.email||!user.email_confirmed_at)return null;
  return {userId:user.id,email:user.email.toLowerCase(),fullName:typeof user.user_metadata?.full_name==='string'?user.user_metadata.full_name:null};
}
export async function requireUser(returnTo='/'){
  const user=await getUser();
  if(!user)redirect('/login?next='+encodeURIComponent(safeReturnTo(returnTo)));
  return user;
}
