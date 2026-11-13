import 'server-only';
import {createHash} from 'node:crypto';
import {serviceClient} from './supabase';
export async function rateLimit(scope:string,value:string,max:number,seconds:number){
 const key=scope+':'+createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
 const {data,error}=await serviceClient().rpc('aquaraa_rate_limit',{p_key:key,p_max:max,p_seconds:seconds});
 if(error)throw new Error('Account protection is unavailable');
 return data===true;
}
