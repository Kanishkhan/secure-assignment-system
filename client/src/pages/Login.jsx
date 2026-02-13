import React, { useState } from 'react';
import api from '../axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Input, Card } from '../components/UI';
import logo from '../assets/logo.png';

const Login = () => {
    // ... existing state ...
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [mfaCode, setMfaCode] = useState('');
    const [step, setStep] = useState(1); // 1: Credentials, 2: MFA
    const [userId, setUserId] = useState(null);
    const { login } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        // ...
        e.preventDefault();
        try {
            const res = await api.post('/api/auth/login', { username, password });

            if (res.data.mfaRequired) {
                setUserId(res.data.userId);
                setStep(2);
                setError('');
            } else {
                login(res.data.token);
                navigate('/dashboard');
            }
        } catch (err) {
            console.error("Login Error:", err);
            setError(err.response?.data?.error || 'Login failed. Please try again.');
        }
    };

    // ... handleMfaVerify ...
    const handleMfaVerify = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/api/auth/mfa/verify', { userId, token: mfaCode });
            if (res.data.success) {
                login(res.data.token);
                navigate('/dashboard');
            }
        } catch (err) {
            setError('Invalid MFA Code');
        }
    };

    return (
        <div className="min-h-screen flex bg-slate-900 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>

            {/* Left Side - Branding (Hidden on mobile) */}
            <div className="hidden lg:flex w-1/2 flex-col justify-center items-center relative z-10 p-12">
                <div className="relative group">
                    <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                    <img src={logo} alt="EduLock" className="h-48 relative z-10 drop-shadow-2xl animate-float" />
                </div>
                <h1 className="text-5xl font-bold text-white mt-8 mb-4 tracking-tight">EduLock</h1>
                <p className="text-slate-400 text-lg max-w-md text-center">
                    Secure, encrypted, and monitored assignment submission platform for modern education.
                </p>
                <div className="flex gap-4 mt-8">
                    <div className="px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50 backdrop-blur-sm text-xs text-slate-400 font-mono">
                        AES-256 Encryption
                    </div>
                    <div className="px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50 backdrop-blur-sm text-xs text-slate-400 font-mono">
                        Multi-Factor Auth
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-10">
                <div className="w-full max-w-md">
                    <div className="lg:hidden flex justify-center mb-8">
                        <img src={logo} alt="EduLock" className="h-20" />
                    </div>

                    <Card title={step === 1 ? "Welcome Back" : "Security Check"} subtitle={step === 1 ? "Sign in to access your dashboard" : "Verify your identity"} className="shadow-2xl shadow-blue-900/20 border-slate-700/50">
                        {error && (
                            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3 animate-slide-up">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                <span className="text-red-400 text-sm font-medium">{error}</span>
                            </div>
                        )}

                        {step === 1 ? (
                            <form onSubmit={handleLogin} className="space-y-2 animate-fade-in">
                                <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="Enter your username" />
                                <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
                                <div className="pt-2">
                                    <Button type="submit" className="w-full py-3.5 text-lg shadow-blue-500/25">Sign In</Button>
                                </div>
                                <p className="mt-6 text-center text-slate-400 text-sm">
                                    Don't have an account? <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors hover:underline">Create Account</Link>
                                </p>
                            </form>
                        ) : (
                            <form onSubmit={handleMfaVerify} className="animate-slide-up">
                                <div className="flex justify-center mb-8">
                                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                    </div>
                                </div>
                                <p className="mb-8 text-center text-slate-400 text-sm">
                                    Please enter the 6-digit code from your <br />authenticator app to continue.
                                </p>
                                <Input label="Authentication Code" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} required placeholder="000 000" className="text-center tracking-[0.5em] text-2xl font-mono" />
                                <Button type="submit" className="w-full py-3.5 mt-4">Verify Identity</Button>
                                <button type="button" onClick={() => setStep(1)} className="w-full text-center mt-6 text-sm text-slate-500 hover:text-slate-400 transition-colors">
                                    ← Back to Login
                                </button>
                            </form>
                        )}
                    </Card>

                    <div className="mt-8 text-center space-y-2">
                        <p className="text-slate-600 text-xs">© 2026 EduLock Secure Systems. All rights reserved.</p>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-900/20 border border-emerald-900/30 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600">Secure Hashed Login</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
