import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {authConfig} from './auth-config';

export function serviceClient() {
  const {url} = authConfig();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error('Database service is not configured');
  return createClient(url, secret, {auth:{persistSession:false,autoRefreshToken:false}, global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store'})}});
}

export async function authClient() {
  const jar = await cookies(), {url,key} = authConfig();
  return createServerClient(url,key,{
    cookieOptions:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'},
    cookies:{getAll:()=>jar.getAll(),setAll(values){
      // Server Components cannot write cookies. The proxy refreshes them first.
      try { values.forEach(({name,value,options})=>jar.set(name,value,options)); } catch {}
    }},
    global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store'})},
  });
}
