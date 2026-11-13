import {getUser} from '@/lib/auth';
import {resolveAccess} from '@/lib/server-access';
import {AccessError} from '@/lib/access-policy';
import TeamApp from './team-app';
import StaffApp from './staff-app';
import SignOut from './sign-out';
export function AuthShell({children}:{children:React.ReactNode}){
 return <main className="login-page"><a href="/" className="login-brand"><img src="/aquaraa-logo.svg" alt="Aquaraa" width="109" height="120"/><span>PEOPLE & HOSPITALITY</span></a><section className="login-card"><span className="eyebrow">AQUARAA TEAM</span>{children}</section><p className="login-foot">Great stays start with a great team.</p></main>;
}
export function AccessScreen({message,title='Your team. One place.',signedIn=false}:{message?:string;title?:string;signedIn?:boolean}){
 return <AuthShell><h1>{title}</h1><p>{message||'Your shifts, leave and pay, together in a private workspace for the people behind every stay.'}</p>{signedIn?<><a className="button primary" href="/">Try again</a><div className="auth-signout"><SignOut/><span>Sign out to use another account</span></div></>:<><a className="button primary" href="/login?next=/staff">Staff sign in <span>↗</span></a><a className="button" href="/login?next=/admin">Administrator / manager sign in</a><small>Use the email registered by your administrator and your Aquaraa password.</small></>}</AuthShell>;
}
export async function WorkspaceScreen(){
 const user=await getUser();if(!user)return <AccessScreen/>;
 try{const access=await resolveAccess(user);return access.role==='staff'?<StaffApp displayName={user.fullName||'Team member'}/>:<TeamApp displayName={user.fullName||'Aquaraa manager'} role={access.role}/>;}
 catch(e){return <AccessScreen signedIn title="Account access" message={e instanceof AccessError?e.message:'We could not open your workspace. Please try again shortly.'}/>;}
}
