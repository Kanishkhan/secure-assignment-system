import React, { useState } from 'react';
import api from '../axiosConfig';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Input, Card } from '../components/UI';
import logo from '../assets/logo.png';

const Register = () => {
    const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'student' });
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/api/auth/register', formData);
            setSuccess('Registration successful! Redirecting to login...');
            setTimeout(() => navigate('/login'), 1500);
        } catch (err) {
            if (!err.response) {
                setError('Cannot connect to server. Please make sure the backend is running.');
            } else {
                setError(err.response?.data?.error || 'Registration Failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[100px]"></div>
                <div className="absolute top-[60%] -left-[10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="flex justify-center mb-8">
                    <img src={logo} alt="EduLock" className="h-24" />
                </div>
                <Card title="Create Account">
                    <p className="text-gray-400 text-center mb-6 -mt-4">
                        Join the secure platform <br />
                        <span className="text-xs text-blue-500/80 font-mono">(Passwords are Bcrypt Hashed & Salted)</span>
                    </p>

                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 shrink-0"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                <span className="text-red-400 text-sm">{error}</span>
                            </div>
                        )}
                        {success && (
                            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                <span className="text-emerald-400 text-sm">{success}</span>
                            </div>
                        )}
                        <Input label="Username" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} placeholder="Choose a username" required />
                        <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="name@example.com" required />
                        <Input label="Password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Create a strong password" required />

                        <div className="mb-6">
                            <label className="block text-gray-300 text-sm font-semibold mb-2">I am a...</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, role: 'student' })}
                                    className={`py-2 px-4 rounded-lg border transition-all ${formData.role === 'student' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-700 text-gray-400 hover:border-slate-600'}`}
                                >
                                    Student
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, role: 'teacher' })}
                                    className={`py-2 px-4 rounded-lg border transition-all ${formData.role === 'teacher' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-700 text-gray-400 hover:border-slate-600'}`}
                                >
                                    Teacher
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, role: 'admin' })}
                                    className={`py-2 px-4 rounded-lg border transition-all ${formData.role === 'admin' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-900 border-slate-700 text-gray-400 hover:border-slate-600'} col-span-2`}
                                >
                                    Admin (System Manager)
                                </button>
                            </div>
                        </div>

                        <Button type="submit" disabled={loading} className="w-full mb-4 disabled:opacity-60 disabled:cursor-not-allowed">
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                                    Creating Account...
                                </span>
                            ) : 'Register'}
                        </Button>
                        <p className="mt-4 text-center text-gray-400 text-sm">
                            Already have an account? <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Sign In</Link>
                        </p>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default Register;
