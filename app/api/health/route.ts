import {serviceClient} from '@/lib/supabase';
export const dynamic='force-dynamic';
export async function GET(){
  try{
    const {error}=await serviceClient().from('aquaraa_admin').select('id').limit(1);
    if(error)throw error;
    return Response.json({status:'ok'},{headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({status:'setup-required'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
