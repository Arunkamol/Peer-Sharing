import type {Metadata,Viewport} from 'next';
import '@fontsource/noto-sans-thai/400.css';
import '@fontsource/noto-sans-thai/500.css';
import '@fontsource/noto-sans-thai/600.css';
import '@fontsource/noto-sans-thai/700.css';
import './globals.css';
import './liquid-glass.css';
import './tutoring.css';
import './responsive.css';
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',interactiveWidget:'resizes-content',themeColor:'#f8f3f7'};
export const metadata:Metadata={title:'Peer Sharing · เรียนรู้ไปด้วยกัน',description:'ค้นหาคลาสติว แบ่งปันทักษะ สรุปวิชา และส่งต่อหนังสือในชุมชนมหาวิทยาลัย',icons:{icon:'/favicon.svg',shortcut:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="th"><body>{children}</body></html>}
