import {authClient} from '@/lib/supabase';
import {validOrigin,siteOrigin} from '@/lib/auth-config';
import {resolveAccess} from '@/lib/server-access';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const back=(path:string)=>new Response(null,{status:303,headers:{Location:siteOrigin()+path,'Cache-Control':'private, no-store'}});
 try{
  if(!validOrigin(request))return new Response('Request origin is not allowed',{status:403});
  const raw=await request.text();if(raw.length>2048)return new Response('Request is too large',{status:413});
  const form=new URLSearchParams(raw),token_hash=form.get('token_hash'),type=form.get('type');
  if(!token_hash||token_hash.length>512||(type!=='invite'&&type!=='recovery'))return back('/login?error=link');
  const client=await authClient();
  const {data,error}=await client.auth.verifyOtp({token_hash,type});
  if(error||!data.user?.email||!data.user.email_confirmed_at)return back('/login?error=link');
  try{await resolveAccess({userId:data.user.id,email:data.user.email,fullName:null})}catch{await client.auth.signOut({scope:'local'});return back('/login?error=link')}
  return back('/set-password');
 }catch{return back('/login?error=link')}
}
