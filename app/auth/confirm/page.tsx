import {AuthShell} from '@/app/access-screen';
export const dynamic='force-dynamic';
export default async function Confirm({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const {token_hash,type}=await searchParams;
 if(!token_hash||token_hash.length>512||!['invite','recovery'].includes(type||''))return <AuthShell><h1>Link unavailable.</h1><p>Request a fresh link from your administrator or reset your password.</p><a href="/forgot-password" className="button">Reset password</a></AuthShell>;
 return <AuthShell><h1>Your Aquaraa account.</h1><p>Continue to choose a password and open your team workspace.</p><form action="/api/auth/confirm" method="POST"><input type="hidden" name="token_hash" value={token_hash}/><input type="hidden" name="type" value={type}/><button className="button primary">Continue to set password</button></form><small>Only continue if this account link was intended for you.</small></AuthShell>;
}
