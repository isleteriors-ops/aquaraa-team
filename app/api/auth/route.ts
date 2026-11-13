import {z} from 'zod';
import {authClient,serviceClient} from '@/lib/supabase';
import {getUser} from '@/lib/auth';
import {validOrigin,siteOrigin,safeReturnTo} from '@/lib/auth-config';
import {apiJson as json,resolveAccess} from '@/lib/server-access';
import {rateLimit} from '@/lib/rate-limit';
export const dynamic='force-dynamic';
const email=z.string().trim().email().max(200).transform(v=>v.toLowerCase());
const commands=z.discriminatedUnion('action',[
 z.object({action:z.literal('sign-in'),email,password:z.string().min(1).max(128),next:z.string().optional()}),
 z.object({action:z.literal('reset'),email}),
 z.object({action:z.literal('set-password'),password:z.string().min(12,'Use at least 12 characters.').max(128).refine(v=>v.trim().length>=12,'Use at least 12 non-space characters.')}),
 z.object({action:z.literal('sign-out')}),
]);
export async function POST(request:Request){
 try{
  if(!validOrigin(request))return json({error:'Request origin is not allowed'},403);
  const raw=await request.text();if(raw.length>4096)return json({error:'Request is too large'},413);
  let value;try{value=JSON.parse(raw)}catch{return json({error:'Invalid request'},400)}
  const parsed=commands.safeParse(value);if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Check your entries.'},400);
  const cmd=parsed.data,client=await authClient();
  if(cmd.action==='sign-out'){
   const {error}=await client.auth.signOut({scope:'local'});
   return error?json({error:'Unable to sign out. Try again.'},503):json({ok:true});
  }
  if(cmd.action==='sign-in'){
   if(!await rateLimit('login',cmd.email,20,900))return json({error:'Too many sign-in attempts. Try again in 15 minutes.'},429);
   const {data,error}=await client.auth.signInWithPassword({email:cmd.email,password:cmd.password});
   if(error||!data.user?.email_confirmed_at)return json({error:'Unable to sign in. Check your email and password, or contact your administrator.'},401);
   try{await resolveAccess({userId:data.user.id,email:data.user.email!,fullName:null})}
   catch{await client.auth.signOut({scope:'local'});return json({error:'This account does not have active Aquaraa access. Contact your administrator.'},403)}
   return json({ok:true,next:safeReturnTo(cmd.next)});
  }
  if(cmd.action==='reset'){
   if(!await rateLimit('reset',cmd.email,3,3600))return json({ok:true,message:'If this email has an Aquaraa account, a password reset link will arrive shortly.'});
   const {data,error}=await serviceClient().from('aquaraa_members').select('id').eq('email',cmd.email).limit(1);
   if(error)throw error;
   if(cmd.email===process.env.AQUARAA_OWNER_EMAIL?.trim().toLowerCase()||data.length){
    const result=await client.auth.resetPasswordForEmail(cmd.email,{redirectTo:siteOrigin()+'/set-password'});
    if(result.error)console.warn('Aquaraa password-reset delivery failed');
   }
   return json({ok:true,message:'If this email has an Aquaraa account, a password reset link will arrive shortly.'});
  }
  const user=await getUser();if(!user)return json({error:'Open a fresh account setup or password reset link.'},401);
  await resolveAccess(user);
  if(!await rateLimit('password',user.userId,5,3600))return json({error:'Too many password changes. Try again later.'},429);
  const {error}=await client.auth.updateUser({password:cmd.password});
  if(error)return json({error:'Unable to save this password. Use a different strong password or request a fresh reset link.'},400);
  return json({ok:true,next:'/'});
 }catch{return json({error:'The account service is temporarily unavailable. Please try again later.'},503)}
}
