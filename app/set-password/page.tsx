import {AuthShell} from '../access-screen';
import AuthForm from '../auth-form';
import {requireUser} from '@/lib/auth';
import {resolveAccess} from '@/lib/server-access';
export const dynamic='force-dynamic';
export default async function SetPassword(){
 const user=await requireUser('/');
 try{await resolveAccess(user)}catch{return <AuthShell><h1>Account access</h1><p>This account is not registered or is inactive. Please contact your administrator.</p><a href="/login" className="button">Back to sign in</a></AuthShell>}
 return <AuthShell><h1>Make yourself at home.</h1><p>Choose your Aquaraa password for {user.email}.</p><AuthForm mode="set-password"/></AuthShell>;
}
