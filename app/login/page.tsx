'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import { safeReturnPath } from '@/lib/auth-paths';
import './login.css';

function GoogleMark() {
  return <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.04 46.98 31.89 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.85 23.85 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>;
}

export default function Login() {
  const [en, setEn] = useState(false);
  const [next, setNext] = useState('/');
  const [google, setGoogle] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const t = (th: string, english: string) => en ? english : th;
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setNext(safeReturnPath(params.get('next')));
    setError(params.get('error') || '');
    setEn(localStorage.getItem('peer-language') === 'en');
    const controller = new AbortController();
    fetch('/api/auth/options', { cache: 'no-store', signal: controller.signal }).then(r => r.ok ? r.json() as Promise<{ google?: boolean }> : { google: false }).then(d => setGoogle(d.google === true)).catch(() => { if (!controller.signal.aborted) setGoogle(false); });
    return () => controller.abort();
  }, []);
  return <main className="peer-login">
    <div className="login-top"><a href="/" className="login-back"><ArrowLeft size={17}/>{t('กลับไปสำรวจ','Back to explore')}</a><button className="btn btn-plain" onClick={() => { setEn(!en); localStorage.setItem('peer-language', en ? 'th' : 'en'); }} aria-label="Change language">{en ? 'TH' : 'EN'}</button></div>
    <section className="login-card" aria-labelledby="login-title">
      <a href="/" className="login-brand"><img src="/favicon.svg" alt="" width="38" height="38"/>peer sharing<span>.</span></a>
      <span className="login-symbol"><BookOpen size={28}/></span>
      <p className="login-eyebrow">GROW TOGETHER</p>
      <h1 id="login-title">{t('ยินดีต้อนรับกลับมา','Welcome to your community')}</h1>
      <p className="login-intro">{t('เรียนรู้ แบ่งปัน และเก่งขึ้นไปด้วยกัน','Learn something new. Share what you know.')}</p>
      {error && <p className="login-error" role="alert">{error === 'cancelled' ? t('คุณยกเลิกการเข้าสู่ระบบ ลองอีกครั้งได้เมื่อพร้อม','Sign-in was cancelled. Try again when you’re ready.') : error === 'unavailable' ? t('ขณะนี้ไม่สามารถเข้าสู่ระบบด้วย Google ได้ กรุณาลองอีกครั้งภายหลัง','Google sign-in is currently unavailable. Please try again later.') : t('เข้าสู่ระบบไม่สำเร็จ กรุณาเริ่มใหม่อีกครั้ง','We couldn’t finish signing you in. Please start again.')}</p>}
      <div className="login-options">
        {google ? <a className="login-provider login-google" href={'/auth/google?next=' + encodeURIComponent(next)} target="_top"><GoogleMark/><span>{t('ดำเนินการต่อด้วย Google','Continue with Google')}</span><ArrowRight size={17}/></a> : <button className="login-provider login-google" disabled aria-describedby="google-status"><GoogleMark/><span>{t('ดำเนินการต่อด้วย Google','Continue with Google')}</span></button>}
        {!google && <p id="google-status" className="login-provider-note" aria-live="polite">{google === null ? t('กำลังตรวจสอบ…','Checking availability…') : t('Google ยังไม่พร้อมใช้งาน กรุณาลองอีกครั้งภายหลัง','Google sign-in is unavailable. Please try again later.')}</p>}
      </div>
      <p className="login-footnote">{t('เข้าสู่ระบบด้วยบัญชี Google เพื่อเข้าถึงโปรไฟล์และรายการของคุณ','Sign in with your Google account to access your profile and bookings.')}</p>
      <a className="login-browse" href="/">{t('สำรวจโดยไม่เข้าสู่ระบบ','Keep exploring without signing in')}<ArrowRight size={15}/></a>
    </section>
    <p className="login-bottom">{t('พื้นที่เล็ก ๆ สำหรับการเรียนรู้ที่ยิ่งใหญ่','A little space for big possibilities.')}</p>
  </main>;
}
