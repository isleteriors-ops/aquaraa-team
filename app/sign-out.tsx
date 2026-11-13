'use client';
import {useState} from 'react';
import {LogOut} from 'lucide-react';
export default function SignOut(){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 return <><button className="icon-button" disabled={busy} aria-label="Sign out" onClick={async()=>{
  setBusy(true);setError('');
  try{const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'sign-out'})});if(!r.ok)throw new Error();window.location.assign('/login');}
  catch{setError('Sign-out failed. Try again.');setBusy(false)}
 }}><LogOut size={17}/></button>{error&&<small role="alert">{error}</small>}</>;
}
