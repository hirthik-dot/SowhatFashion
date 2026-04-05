'use client';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { X, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, setUser, redirectUrl, setRedirectUrl } = useAuthStore();
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpSent && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, timer]);

  if (!isAuthModalOpen) return null;

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    
    if (!email) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'login' })
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
        setTimer(60);
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (otpValue: string) => {
    setError('');
    setLoading(true);
    try {
      const payload = { email, otp: otpValue, purpose: 'login' };
      console.log('Frontend /api/auth/verify-otp Sending req.body:', payload);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        setUser(data.user);
        closeAuthModal();
        if (redirectUrl) {
          router.push(redirectUrl);
          setRedirectUrl(null);
        }
      } else {
        setError(data.error || 'Invalid OTP');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^[0-9]*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (newOtp.every(digit => digit !== '')) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;

    const newOtp = [...otp];
    pasted.split('').forEach((char, i) => {
      newOtp[i] = char;
    });
    setOtp(newOtp);

    if (pasted.length === 6) {
      inputRefs.current[5]?.focus();
      handleVerifyOtp(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  };

  const handleGoogle = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
    window.location.href = `${apiUrl}/api/auth/google`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-0 md:items-center items-end">
      <div className="relative w-full max-w-[420px] bg-white sm:rounded-xl rounded-t-xl rounded-b-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
           <h2 className="text-[20px] font-['Playfair_Display'] text-black text-center flex-1 ml-6">Login with Sowaat Mens Wear</h2>
           <button onClick={closeAuthModal} className="text-gray-400 hover:text-black">
             <X size={20} />
           </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && <div className="text-red-500 text-sm mb-4 text-center">{error}</div>}

          {!otpSent ? (
            <div className="flex flex-col gap-5">
              <button 
                onClick={handleGoogle}
                className="flex items-center justify-center gap-3 w-full h-[48px] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
              >
                <div className="w-5 h-5 relative flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                </div>
                Continue with Google
              </button>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-[1px] bg-gray-200"></div>
                <span className="text-gray-400 text-sm font-medium">OR</span>
                <div className="flex-1 h-[1px] bg-gray-200"></div>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-4">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-[48px] px-4 border border-gray-200 rounded-lg focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] transition-colors bg-white"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[50px] bg-[#C9A84C] hover:bg-[#B59640] text-black font-bold uppercase rounded-lg tracking-wider transition-colors disabled:opacity-50"
                >
                  {loading ? 'WAIT...' : 'PROCEED'}
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <p className="text-gray-600 mb-6 flex items-center gap-2">
                ✉ OTP sent to {email.replace(/(.{3})(.*)(?=@)/, '$1***')}
              </p>

              <div className="flex justify-between w-full gap-2 mb-6" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-11 h-13 sm:w-12 sm:h-14 border border-gray-300 rounded-lg text-center text-xl font-bold focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] transition-colors bg-white p-0"
                  />
                ))}
              </div>

              <div className="mb-6 mb-8 text-sm">
                {timer > 0 ? (
                  <span className="text-gray-400">Resend OTP in 0:{timer.toString().padStart(2, '0')}</span>
                ) : (
                  <button onClick={() => handleSendOtp()} className="text-[#C9A84C] font-semibold hover:underline border-none bg-transparent cursor-pointer">
                    Resend OTP
                  </button>
                )}
              </div>

              <button
                onClick={() => handleVerifyOtp(otp.join(''))}
                disabled={loading || otp.some(d => !d)}
                className="w-full h-[50px] bg-[#C9A84C] hover:bg-[#B59640] text-black font-bold uppercase rounded-lg tracking-wider transition-colors disabled:opacity-50 mb-4"
              >
                {loading ? 'VERIFYING...' : 'VERIFY OTP'}
              </button>

              <button 
                onClick={() => { setOtpSent(false); setOtp(['', '', '', '', '', '']); setError(''); }}
                className="text-gray-500 font-medium flex items-center justify-center gap-2 bg-transparent border-none p-0 cursor-pointer"
              >
                <ArrowLeft size={16} /> Back to email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
