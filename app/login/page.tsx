import {AuthShell} from '../access-screen';
import AuthForm from '../auth-form';
import {safeReturnTo} from '@/lib/auth-config';
export const dynamic='force-dynamic';
export default async function Login({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const params=await searchParams;
 return <AuthShell><h1>Welcome back.</h1><p>Sign in to your Aquaraa team workspace.</p><AuthForm mode="sign-in" next={safeReturnTo(params.next)} configured={Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SECRET_KEY)} initialError={params.error?'This link is invalid or expired. Ask your administrator for a new setup link, or reset your password.':''}/></AuthShell>;
}
