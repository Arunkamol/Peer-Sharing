import {withAuth} from '@/lib/supabase-auth';
import {state,identity,fail} from '@/lib/server';
export const dynamic='force-dynamic';
async function handleGET(req:Request){try{return Response.json(await state(await identity(req)),{headers:{'Cache-Control':'private, no-store'}})}catch(e){return fail(e)}}

export const GET=withAuth(handleGET);
