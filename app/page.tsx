import PeerApp from './peer-app';
import {liveEnabled} from '@/lib/live-backend';
export const dynamic='force-dynamic';
export default function Home(){return <PeerApp liveMode={liveEnabled()}/>;}
