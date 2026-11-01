import {liveEnabled,liveCall} from '@/lib/live-backend';
import {owner,rows,fail} from '@/lib/server';
import {getConversation} from '@/lib/chat-server';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{
  const user=owner(req),id=new URL(req.url).searchParams.get('id')||'';
  if(liveEnabled()){const result=await liveCall('chat_get',user,{id});return Response.json(result,{status:result.error?result.status||400:200,headers:{'Cache-Control':'private, no-store'}})}
  const conversation=await getConversation(id,user);
  if(!conversation)return Response.json({error:'Conversation not found'},{status:404});
  const messages=await rows('SELECT id,role,body,created FROM chat_messages WHERE owner=? AND conversation=? ORDER BY created DESC LIMIT 200',user,id);
  return Response.json({conversation:{...conversation,slotDate:conversation.slot_date},messages:messages.reverse()},{headers:{'Cache-Control':'private, no-store'}});
}catch(e){return fail(e)}}
