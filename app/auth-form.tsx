'use client';
import {useState,type FormEvent} from 'react';
import {Eye,EyeOff,LockKeyhole,ArrowRight} from 'lucide-react';
export default function AuthForm({mode,next='/',initialError='',configured=true}:{mode:'sign-in'|'reset'|'set-password';next?:string;initialError?:string;configured?:boolean}){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(initialError),[message,setMessage]=useState('');
 async function submit(event:FormEvent){
  event.preventDefault();setError('');setMessage('');
  if(mode==='set-password'&&password!==confirm){setError('The passwords do not match.');return;}
  setBusy(true);
  try{
   const response=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:mode,email,password,next})});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'Unable to continue.');
   if(mode==='reset'){setMessage(result.message);setBusy(false);return;}
   window.location.assign(result.next||'/');
  }catch(e){setError(e instanceof Error?e.message:'Unable to continue. Please try again.');setBusy(false)}
 }
 return <form className="auth-form" onSubmit={submit}>
  {!configured&&<p className="auth-notice" role="status">Sign-in is being prepared. Please contact your administrator for access.</p>}
  {error&&<p className="auth-error" role="alert">{error}</p>}{message&&<p className="auth-success" role="status">{message}</p>}
  {mode!=='set-password'&&<label className="field"><span>Email address</span><input autoComplete="username" type="email" required maxLength={200} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" disabled={busy||!configured}/></label>}
  {mode!=='reset'&&<><label className="field"><span>{mode==='set-password'?'New password':'Password'}</span><div className="password-input"><input type={show?'text':'password'} autoComplete={mode==='set-password'?'new-password':'current-password'} required minLength={mode==='set-password'?12:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy||!configured}/><button type="button" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(!show)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>{mode==='set-password'&&<><label className="field"><span>Confirm new password</span><input type={show?'text':'password'} autoComplete="new-password" required minLength={12} maxLength={128} value={confirm} onChange={e=>setConfirm(e.target.value)} disabled={busy||!configured}/></label><small>Use at least 12 characters. A few memorable words work well.</small></>}</>}
  <button className="button primary" disabled={busy||!configured}>{busy?'Please wait…':mode==='reset'?'Send reset link':mode==='set-password'?'Save password':'Sign in'}<ArrowRight size={17}/></button>
  {mode==='sign-in'?<><a className="text-button auth-secondary" href="/forgot-password">Forgot your password?</a><small><LockKeyhole size={13}/> Your administrator registers your account. Use their setup link for your first sign-in.</small></>:<a className="text-button auth-secondary" href="/login">Back to sign in</a>}
 </form>;
}
