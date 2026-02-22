import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../axiosConfig';
import { Button, Card, Input } from '../components/UI';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

const Dashboard = () => {
    const { user, token, logout, login } = useAuth();
    // ...
    const [mfaSetup, setMfaSetup] = useState(null);
    const [mfaToken, setMfaToken] = useState('');
    const [users, setUsers] = useState([]);
    const [assignments, setAssignments] = useState([]);

    useEffect(() => {
        fetchAssignments();
        if (user?.role === 'admin') fetchUsers();
    }, [user]);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/api/auth/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const deleteUser = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await api.delete(`/api/auth/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchUsers();
        } catch (error) {
            alert('Failed to delete user');
        }
    };

    const fetchAssignments = async () => {
        try {
            const res = await api.get('/api/assignments', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAssignments(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteAssignment = async (id) => {
        if (!window.confirm('Delete this assignment? This will also delete all student submissions for this assignment.')) return;
        try {
            await api.delete(`/api/assignments/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAssignments(assignments.filter(a => a.id !== id));
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to delete assignment');
        }
    };

    // ... (MFA functions remain same)

    const setupMFA = async () => {
        const res = await api.post('/api/auth/mfa/setup');
        setMfaSetup(res.data);
    };

    const enableMFA = async () => {
        try {
            const res = await api.post('/api/auth/mfa/enable', {
                userId: user.id,
                secret: mfaSetup.secret,
                token: mfaToken
            });
            alert('MFA Enabled Successfully! YOU ARE SECURED.');
            if (res.data.token) {
                login(res.data.token); // Update session immediately
            }
            setMfaSetup(null);
        } catch (error) {
            console.error(error);
            alert('Invalid Code. Please try again.');
        }
    };

    // FORCE MFA CHECK
    // If we are logged in, but MFA is NOT enabled, we block the dashboard.
    // Note: 'user' object comes from the decoded token.
    if (user && !user.mfa_enabled) {
        return (
            <div className="min-h-screen bg-slate-900 text-slate-100 p-8 flex items-center justify-center">
                <div className="max-w-md w-full">
                    <header className="flex justify-center items-center mb-8 gap-4">
                        <img src={logo} alt="EduLock" className="h-16" />
                        <h1 className="text-3xl font-bold text-white">EduLock</h1>
                    </header>
                    <Card title="Mandatory Security Setup" className="border-red-500/50 shadow-red-900/20">
                        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg mb-6 flex items-start gap-3">
                            <div className="mt-1">🛡️</div>
                            <div>
                                <h3 className="font-semibold text-blue-400">Action Required</h3>
                                <p className="text-sm text-slate-400">To ensure the security of the assignment system, all users (Admin, Teacher, Student) must enable Two-Factor Authentication.</p>
                            </div>
                        </div>

                        {!mfaSetup ? (
                            <Button onClick={setupMFA} className="w-full py-3 text-lg bg-blue-600 hover:bg-blue-500">Begin Setup</Button>
                        ) : (
                            <div className="bg-slate-900 p-6 rounded-xl border border-slate-700">
                                <p className="mb-4 text-center text-sm font-medium">1. Scan this QR Code</p>
                                <div className="bg-white p-2 rounded-lg w-fit mx-auto mb-6">
                                    <img src={mfaSetup.qrCode} alt="QR Code" className="w-48 h-48" />
                                </div>
                                <p className="mb-2 text-center text-sm font-medium">2. Enter the 6-digit Code</p>
                                <Input label="" value={mfaToken} onChange={e => setMfaToken(e.target.value)} placeholder="000 000" className="text-center text-xl tracking-widest mb-4" />
                                <Button onClick={enableMFA} className="w-full bg-emerald-600 hover:bg-emerald-500">Verify & Activate</Button>
                            </div>
                        )}
                        <div className="mt-6 text-center">
                            <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-400">Logout</button>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-10 p-5 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl sticky top-4 z-50 shadow-xl shadow-black/20">
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <div className="absolute -inset-2 bg-blue-500 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                            <img src={logo} alt="EduLock" className="h-10 relative z-10" />
                        </div>
                        <div className="hidden md:block">
                            <h1 className="text-xl font-bold text-white tracking-tight">EduLock</h1>
                            <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                <span className="text-xs text-slate-400 font-medium">System Online</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                            <p className="text-white font-medium text-sm">{user?.username}</p>
                            <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${user?.role === 'admin' ? 'bg-purple-900/40 border-purple-500 text-purple-400' : user?.role === 'teacher' ? 'bg-blue-900/40 border-blue-500 text-blue-400' : 'bg-emerald-900/40 border-emerald-500 text-emerald-400'}`}>
                                    {user?.role}
                                </span>
                                <span className="text-[9px] text-slate-500 font-mono border border-slate-700 px-1 rounded" title="Role-Based Access Control Enforced">RBAC Active</span>
                            </div>
                        </div>
                        <div className="h-8 w-[1px] bg-slate-700 hidden sm:block"></div>
                        <Button onClick={logout} variant="ghost" className="text-sm px-4 py-2 hover:bg-red-500/10 hover:text-red-400">
                            Sign Out
                        </Button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Security & Admin */}
                    <div className="space-y-8">
                        <Card title="Security" className="h-fit">
                            <p className="text-slate-400 mb-6 text-sm text-center">Protect your account with two-factor authentication.</p>
                            {!mfaSetup ? (
                                <Button onClick={setupMFA} className="w-full">Enable 2FA</Button>
                            ) : (
                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                                    <p className="mb-4 text-center text-sm font-medium">Scan with Authenticator App</p>
                                    <div className="bg-white p-2 rounded-lg w-fit mx-auto mb-4">
                                        <img src={mfaSetup.qrCode} alt="QR Code" className="w-32 h-32" />
                                    </div>
                                    <div className="bg-slate-800 p-2 rounded text-center mb-4">
                                        <p className="text-xs text-slate-500 break-all font-mono">{mfaSetup.secret}</p>
                                    </div>
                                    <Input label="Verification Code" value={mfaToken} onChange={e => setMfaToken(e.target.value)} placeholder="000 000" className="text-center" />
                                    <Button onClick={enableMFA} className="w-full mt-2">Activate 2FA</Button>
                                </div>
                            )}
                        </Card>

                        {user?.role === 'admin' && (
                            <Card title="User Management" className="h-fit">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-500 uppercase bg-slate-800/50">
                                            <tr>
                                                <th className="px-4 py-3 rounded-l-lg">User</th>
                                                <th className="px-4 py-3">Role</th>
                                                <th className="px-4 py-3 rounded-r-lg text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Array.isArray(users) && users.length > 0 ? users.map(u => (
                                                <tr key={u.id} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-slate-300">{u.username}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-xs px-2 py-1 rounded-full border ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : u.role === 'teacher' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-slate-700 text-slate-400 border-slate-600'}`}>
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button onClick={() => deleteUser(u.id)} className="text-red-400 hover:text-red-300 transition-colors">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan="3" className="text-center py-4 text-slate-500">No users found</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* Right Column: Assignments */}
                    <div className="lg:col-span-2">
                        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-8 h-full">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-bold text-white">Assignments</h2>
                                {user?.role === 'teacher' && (
                                    <Link to="/assignments/new">
                                        <Button className="bg-cyan-600 hover:bg-cyan-700">+ New Assignment</Button>
                                    </Link>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {Array.isArray(assignments) && assignments.length > 0 ? (
                                    assignments.map(a => (
                                        <div key={a.id} className="group bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 relative">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors pr-8">{a.title}</h3>
                                                {a.deadline && (
                                                    <span className={`text-xs font-mono px-2 py-1 rounded ${new Date(a.deadline) < new Date() ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                                        {new Date(a.deadline).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-slate-400 text-sm mb-4 line-clamp-2">{a.description}</p>
                                            <div className="flex justify-between items-center mt-4">
                                                {/* Show Trash Icon ONLY if current user is the Creator */}
                                                {a.creator_id === user.id ? (
                                                    <button
                                                        onClick={() => handleDeleteAssignment(a.id)}
                                                        className="text-gray-500 hover:text-red-400 text-sm flex items-center gap-1 transition-colors"
                                                        title="Delete Assignment"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                                        <span className="sr-only">Delete</span>
                                                    </button>
                                                ) : <div></div>}

                                                <Link to={`/assignments/${a.id}`} className="text-sm font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 group/link ml-auto">
                                                    {user?.role === 'student' ? 'Submit Work' : 'View Submissions'}
                                                    <span className="group-hover/link:translate-x-1 transition-transform">→</span>
                                                </Link>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
                                        <p>No assignments found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
