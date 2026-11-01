import publicKey from './public-key.json' with {type:'json'};

// Authenticated server-to-server boundary. This is not a public database proxy.
const key=crypto.subtle.importKey('jwk',publicKey,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
const operations=new Set(['state','listing_get','file_access','download_complete','register_file','profile','mark','request','close_request','listing','listing_visibility','start_chat','chat_get','chat_message','chat_slot','notifications_read','book','cancel','checkin','complete','handover','review','message','dispute','report','offer']);
Deno.serve(async(req:Request)=>{
  const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
  if(req.method!=='POST')return reply({error:'Method not allowed'},405);
  const timestamp=req.headers.get('X-Peer-Timestamp')||'',signature=req.headers.get('X-Peer-Signature')||'';
  if(!/^\d{13}$/.test(timestamp)||Math.abs(Date.now()-Number(timestamp))>60000||signature.length>150)return reply({error:'Unauthorized'},401);
  try{
    const reader=req.body?.getReader();if(!reader)return reply({error:'Missing body'},400);
    const chunks:Uint8Array[]=[];let length=0;
    while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>64000){await reader.cancel();return reply({error:'Request too large'},413)}chunks.push(value)}
    const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
    const body=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
    const valid=await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},await key,Uint8Array.from(atob(signature),c=>c.charCodeAt(0)),new TextEncoder().encode(timestamp+'.'+body));
    if(!valid)return reply({error:'Unauthorized'},401);
    const request=JSON.parse(body);
    if(!operations.has(request.op)||(request.actor!==null&&(typeof request.actor!=='string'||request.actor.length>200)))return reply({error:'Invalid request'},400);
    const serviceKey=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!serviceKey)return reply({error:'Backend not configured'},503);
    const headers:Record<string,string>={'Content-Type':'application/json',apikey:serviceKey};
    if(!serviceKey.startsWith('sb_secret_'))headers.Authorization='Bearer '+serviceKey;
    const response=await fetch(Deno.env.get('SUPABASE_URL')+'/rest/v1/rpc/peer_gateway',{method:'POST',headers,body:JSON.stringify({request}),signal:AbortSignal.timeout(12000)});
    const result=await response.json();
    if(!response.ok){console.error('peer_gateway failed',response.status,result.code);return reply({error:'Unable to complete this request'},503)}
    return reply(result);
  }catch{return reply({error:'Invalid request'},400)}
});
