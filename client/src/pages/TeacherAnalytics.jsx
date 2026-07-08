import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, Button } from '../components/UI';
import logo from '../assets/logo.png';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    PieChart, 
    Pie, 
    Cell, 
    BarChart, 
    Bar, 
    Legend 
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#eab308', '#f97316', '#ef4444'];

const TeacherAnalytics = () => {
    const { token } = useAuth();
    
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:5000/api/teacher/analytics', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAnalytics(res.data);
            setError('');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-slate-400 text-sm">Aggregating platform submission metrics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <header className="flex justify-between items-center mb-10 p-5 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl sticky top-4 z-50 shadow-xl shadow-black/20">
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard">
                            <img src={logo} alt="EduLock" className="h-10 cursor-pointer" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight">Academic Analytics</h1>
                            <p className="text-xs text-slate-400 font-medium">Teacher Insight Center</p>
                        </div>
                    </div>
                    <Link to="/dashboard">
                        <Button variant="ghost" className="text-sm px-4 py-2 hover:bg-slate-800">
                            ← Dashboard
                        </Button>
                    </Link>
                </header>

                {error && (
                    <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                        <span className="text-red-400 text-sm font-medium">{error}</span>
                    </div>
                )}

                {analytics && (
                    <div className="space-y-8">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                            <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl text-center">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Assignments</p>
                                <p className="text-2xl font-bold text-white">{analytics.cards.totalAssignments}</p>
                            </div>
                            <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl text-center">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Students</p>
                                <p className="text-2xl font-bold text-white">{analytics.cards.totalStudents}</p>
                            </div>
                            <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl text-center">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Submissions</p>
                                <p className="text-2xl font-bold text-white">{analytics.cards.totalSubmissions}</p>
                            </div>
                            <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl text-center border-l-4 border-l-red-500">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Duplicates</p>
                                <p className="text-2xl font-bold text-red-400">{analytics.cards.duplicateSubmissions}</p>
                            </div>
                            <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl text-center border-l-4 border-l-orange-500">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Late Files</p>
                                <p className="text-2xl font-bold text-orange-400">{analytics.cards.lateSubmissions}</p>
                            </div>
                            <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl text-center">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Pending Eval</p>
                                <p className="text-2xl font-bold text-white">{analytics.cards.pendingEvaluation}</p>
                            </div>
                            <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl text-center">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Avg Similarity</p>
                                <p className={`text-2xl font-bold ${analytics.cards.averageSimilarity >= 70 ? 'text-red-400' : analytics.cards.averageSimilarity >= 40 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                                    {analytics.cards.averageSimilarity}%
                                </p>
                            </div>
                        </div>

                        {/* Automatic Insights Banner */}
                        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                            <h3 className="font-bold text-white text-md mb-4 flex items-center gap-2">
                                <span>✨</span> Automated System Insights
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {analytics.insights.length > 0 ? analytics.insights.map((insight, i) => (
                                    <div key={i} className="flex items-center gap-2 bg-slate-900/40 p-3 rounded-lg border border-slate-800 text-sm text-slate-300 font-medium">
                                        {insight}
                                    </div>
                                )) : (
                                    <div className="col-span-2 text-center text-slate-500 text-sm py-4">No active insights generated yet.</div>
                                )}
                            </div>
                        </div>

                        {/* Chart Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Submission Timeline */}
                            <Card>
                                <h3 className="text-md font-bold text-white mb-6">Submission Upload History (Daily)</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={analytics.timeline}>
                                            <defs>
                                                <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                            <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: 10 }} />
                                            <YAxis stroke="#64748b" style={{ fontSize: 10 }} />
                                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }} />
                                            <Area type="monotone" dataKey="uploads" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUploads)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>

                            {/* Plagiarism Similarity distribution */}
                            <Card>
                                <h3 className="text-md font-bold text-white mb-6">Similarity Distribution</h3>
                                <div className="h-64 flex flex-col md:flex-row justify-center items-center gap-6">
                                    <div className="w-48 h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={analytics.similarityDistribution}
                                                    innerRadius={50}
                                                    outerRadius={75}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {analytics.similarityDistribution.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {analytics.similarityDistribution.map((entry, index) => (
                                            <div key={index} className="flex items-center gap-2 text-xs">
                                                <span className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[index] }}></span>
                                                <span className="text-slate-400 font-medium">{entry.name}:</span>
                                                <span className="font-bold text-white">{entry.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Card>

                            {/* Assignment Completion Rates */}
                            <Card>
                                <h3 className="text-md font-bold text-white mb-6">Submission Completion Rate (%)</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics.completionRate}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                            <XAxis dataKey="title" stroke="#64748b" style={{ fontSize: 10 }} />
                                            <YAxis stroke="#64748b" style={{ fontSize: 10 }} />
                                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                                            <Bar dataKey="rate" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>

                            {/* Top Active Students */}
                            <Card>
                                <h3 className="text-md font-bold text-white mb-6">Most Active Students (Submissions Count)</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics.activeStudents} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                            <XAxis type="number" stroke="#64748b" style={{ fontSize: 10 }} />
                                            <YAxis dataKey="name" type="category" stroke="#64748b" style={{ fontSize: 10 }} />
                                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                                            <Bar dataKey="submissions" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherAnalytics;
