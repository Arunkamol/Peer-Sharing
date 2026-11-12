import {withAuth} from '@/lib/supabase-auth';
import {state,identity,fail} from '@/lib/server';
import {readDemoOrders} from '@/lib/demo-checkout-server';
export const dynamic='force-dynamic';
async function handleGET(req:Request){try{const actor=await identity(req);const [current,demoOrders]=await Promise.all([state(actor),readDemoOrders(actor)]);return Response.json({...current,demoOrders},{headers:{'Cache-Control':'private, no-store'}})}catch(e){return fail(e)}}

export const GET=withAuth(handleGET);
