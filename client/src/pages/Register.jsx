import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Input, Card } from '../components/UI';
import logo from '../assets/logo.png';

const Register = () => {
    const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'student' });
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/auth/register', formData);
            alert('Registration Successful. Please Login.');
            navigate('/login');
        } catch (err) {
            alert(err.response?.data?.error || 'Registration Failed');
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

                        <Button type="submit" className="w-full mb-4">Register</Button>
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
