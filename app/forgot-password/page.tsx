import {AuthShell} from '../access-screen';
import AuthForm from '../auth-form';
export const dynamic='force-dynamic';
export default function ForgotPassword(){return <AuthShell><h1>Let’s get you back in.</h1><p>Enter your registered email to receive a password reset link.</p><AuthForm mode="reset" configured={Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SECRET_KEY)}/></AuthShell>}
