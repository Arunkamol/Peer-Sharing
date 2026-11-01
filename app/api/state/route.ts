import {state,identity,fail} from '@/lib/server';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{return Response.json(await state(identity(req)),{headers:{'Cache-Control':'private, no-store'}})}catch(e){return fail(e)}}
