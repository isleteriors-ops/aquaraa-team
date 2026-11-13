import {AuthShell} from '../access-screen';
import AuthForm from '../auth-form';
export const dynamic='force-dynamic';
export default function ForgotPassword(){
 const emailResetEnabled=process.env.AQUARAA_EMAIL_RESET_ENABLED==='true';
 return <AuthShell><h1>Let’s get you back in.</h1>{emailResetEnabled?<><p>Enter your registered email to receive a password reset link.</p><AuthForm mode="reset" configured={Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SECRET_KEY)}/></>:<><p>Ask your Aquaraa administrator for a private password reset link. They can create one from Staff access.</p><a className="text-button auth-secondary" href="/login">Back to sign in</a></>}</AuthShell>
}
