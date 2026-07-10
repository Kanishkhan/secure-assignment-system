import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../axiosConfig';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Card, Button } from '../components/UI';
import logo from '../assets/logo.png';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const AnalyticsHub = () => {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const reportRef = useRef(null);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await api.get('/api/analytics/dashboard');
            setData(res.data);
            setLoading(false);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load analytics');
            setLoading(false);
        }
    };

    const downloadPDF = async () => {
        if (!reportRef.current) return;
        const button = document.getElementById('download-btn');
        const backBtn = document.getElementById('back-btn');
        if (button) button.style.display = 'none'; // hide button from PDF
        if (backBtn) backBtn.style.display = 'none';
        
        try {
            const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#0f172a' });
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`EduLock_Analytics_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err) {
            console.error('PDF Generation Failed', err);
            alert('Failed to generate PDF report.');
        } finally {
            if (button) button.style.display = 'flex';
            if (backBtn) backBtn.style.display = 'block';
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-blue-400">Loading Analytics Hub...</div>;
    if (error) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-red-400">{error}</div>;

    const stats = data?.stats || {};
    const chartData = data?.charts?.submissionsPerAssignment || [];

    // Transform pie chart data for Admin
    const pieData = data?.role === 'admin' ? [
        { name: 'Teachers', value: stats.totalTeachers || 0 },
        { name: 'Students', value: stats.totalStudents || 0 }
    ] : [];

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-8" ref={reportRef}>
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-10 p-5 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl shadow-black/20">
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard">
                            <img src={logo} alt="EduLock" className="h-10 hover:opacity-80 transition-opacity" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight">Analytics Hub</h1>
                            <span className="text-xs text-blue-400 font-medium uppercase tracking-wider">{data?.role} View</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button id="download-btn" onClick={downloadPDF} className="bg-emerald-600 hover:bg-emerald-500 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Export PDF
                        </Button>
                        <Link id="back-btn" to="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">Back to Dashboard</Link>
                    </div>
                </header>

                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">Platform Overview</h2>
                    <p className="text-slate-400 text-sm">Generated on {new Date().toLocaleString()}</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                    {data?.role === 'admin' ? (
                        <>
                            <Card className="text-center p-6 border-blue-500/20 bg-blue-500/5">
                                <h3 className="text-slate-400 text-sm font-medium uppercase mb-1">Total Users</h3>
                                <p className="text-4xl font-bold text-blue-400">{stats.totalUsers}</p>
                            </Card>
                            <Card className="text-center p-6 border-purple-500/20 bg-purple-500/5">
                                <h3 className="text-slate-400 text-sm font-medium uppercase mb-1">Teachers</h3>
                                <p className="text-4xl font-bold text-purple-400">{stats.totalTeachers}</p>
                            </Card>
                            <Card className="text-center p-6 border-emerald-500/20 bg-emerald-500/5">
                                <h3 className="text-slate-400 text-sm font-medium uppercase mb-1">Assignments</h3>
                                <p className="text-4xl font-bold text-emerald-400">{stats.totalAssignments}</p>
                            </Card>
                            <Card className="text-center p-6 border-amber-500/20 bg-amber-500/5">
                                <h3 className="text-slate-400 text-sm font-medium uppercase mb-1">Submissions</h3>
                                <p className="text-4xl font-bold text-amber-400">{stats.totalSubmissions}</p>
                            </Card>
                        </>
                    ) : (
                        <>
                            <Card className="text-center p-6 border-purple-500/20 bg-purple-500/5">
                                <h3 className="text-slate-400 text-sm font-medium uppercase mb-1">My Assignments</h3>
                                <p className="text-4xl font-bold text-purple-400">{stats.totalAssignments}</p>
                            </Card>
                            <Card className="text-center p-6 border-emerald-500/20 bg-emerald-500/5">
                                <h3 className="text-slate-400 text-sm font-medium uppercase mb-1">Total Submissions</h3>
                                <p className="text-4xl font-bold text-emerald-400">{stats.totalSubmissions}</p>
                            </Card>
                            <Card className="text-center p-6 border-blue-500/20 bg-blue-500/5">
                                <h3 className="text-slate-400 text-sm font-medium uppercase mb-1">Students Engaged</h3>
                                <p className="text-4xl font-bold text-blue-400">{stats.studentsEngaged}</p>
                            </Card>
                            <Card className="text-center p-6 border-slate-700 bg-slate-800">
                                <h3 className="text-slate-400 text-sm font-medium uppercase mb-1">Avg per Assignment</h3>
                                <p className="text-4xl font-bold text-slate-300">
                                    {stats.totalAssignments > 0 ? (stats.totalSubmissions / stats.totalAssignments).toFixed(1) : 0}
                                </p>
                            </Card>
                        </>
                    )}
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-2 p-6 h-[400px]" title="Submissions per Assignment">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <XAxis dataKey="title" stroke="#64748b" fontSize={12} tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val} />
                                    <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9', borderRadius: '8px' }}
                                        cursor={{ fill: '#334155', opacity: 0.4 }}
                                    />
                                    <Bar dataKey="submissions" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-500">No submission data available</div>
                        )}
                    </Card>

                    {data?.role === 'admin' ? (
                        <Card className="p-6 h-[400px]" title="User Distribution">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        <Cell fill="#8b5cf6" />
                                        <Cell fill="#3b82f6" />
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>
                    ) : (
                        <Card className="p-6 h-[400px] flex flex-col justify-center items-center text-center" title="Similarity Watch">
                            <div className="w-32 h-32 rounded-full border-4 border-red-500/20 flex items-center justify-center mb-4 relative">
                                <div className="absolute inset-0 rounded-full border-t-4 border-red-500 animate-spin opacity-50"></div>
                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><line x1="12" y1="22" x2="12" y2="12"></line></svg>
                            </div>
                            <h3 className="text-white font-bold mb-2">Check Plagiarism</h3>
                            <p className="text-sm text-slate-400 mb-4">Run Similarity Reports from your Dashboard for detailed analysis of student submissions.</p>
                            <Link to="/dashboard">
                                <Button variant="outline" className="text-sm border-red-500/50 text-red-400 hover:bg-red-500/10">Go to Assignments</Button>
                            </Link>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsHub;
