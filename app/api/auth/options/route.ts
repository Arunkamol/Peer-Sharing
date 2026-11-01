import { googleEnabled } from '@/lib/supabase-auth';
export const dynamic = 'force-dynamic';
export async function GET() {
  return Response.json({ google: await googleEnabled() }, { headers: { 'Cache-Control': 'private, no-store' } });
}
