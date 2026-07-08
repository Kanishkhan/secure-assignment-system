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
    Legend,
    LineChart,
    Line,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#eab308', '#f97316', '#ef4444'];
const DUP_COLORS = ['#ef4444', '#f97316', '#eab308', '#10b981'];

const TeacherAnalytics = () => {
    const { token } = useAuth();
    
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview'); // overview, health, students, duplicates, audit

    // Table Filters & Sorters
    const [healthSearch, setHealthSearch] = useState('');
    const [healthRiskFilter, setHealthRiskFilter] = useState('All');
    
    const [studentSearch, setStudentSearch] = useState('');
    const [studentStatusFilter, setStudentStatusFilter] = useState('All');
    const [studentSortKey, setStudentSortKey] = useState('username');
    const [studentSortOrder, setStudentSortOrder] = useState('asc');

    const [dupSearch, setDupSearch] = useState('');
    const [dupRecFilter, setDupRecFilter] = useState('All');

    // Audit logs pagination & filter
    const [auditSearch, setAuditSearch] = useState('');
    const [auditActionFilter, setAuditActionFilter] = useState('All');
    const [auditStatusFilter, setAuditStatusFilter] = useState('All');
    const [auditPage, setAuditPage] = useState(1);
    const auditLimit = 10;

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

    const handleReviewStatusUpdate = async (subId, newStatus) => {
        try {
            await axios.post(`http://localhost:5000/api/teacher/review/${subId}`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Reload analytics to keep dashboard in sync
            fetchAnalytics();
        } catch (err) {
            console.error('Failed to update review status:', err);
            alert('Failed to update submission status');
        }
    };

    // CSV & Excel Exporter Utility
    const exportToCSV = (data, headers, filename) => {
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Add headers
        csvContent += headers.join(",") + "\n";
        
        // Add rows
        data.forEach(row => {
            const rowStr = headers.map(header => {
                const val = row[header];
                // Escape quotes and commas
                if (val === undefined || val === null) return '';
                const cleanVal = String(val).replace(/"/g, '""');
                return cleanVal.includes(',') || cleanVal.includes('\n') || cleanVal.includes('"') 
                    ? `"${cleanVal}"` 
                    : cleanVal;
            }).join(",");
            csvContent += rowStr + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrintPDF = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-8">
                <div className="text-center space-y-4">
                    <div className="relative w-16 h-16 mx-auto">
                        <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-white font-bold text-sm">Aggregating platform submission metrics...</p>
                        <p className="text-slate-500 text-xs font-mono">Running secure cryptographic & similarity analytics engines</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!analytics) return null;

    // Filter Logic
    const filteredHealth = analytics.assignmentHealth.filter(a => {
        const matchesSearch = a.title.toLowerCase().includes(healthSearch.toLowerCase());
        const matchesRisk = healthRiskFilter === 'All' || a.riskStatus === healthRiskFilter;
        return matchesSearch && matchesRisk;
    });

    const filteredStudents = analytics.studentMatrix.filter(s => {
        const matchesSearch = s.username.toLowerCase().includes(studentSearch.toLowerCase());
        const matchesStatus = studentStatusFilter === 'All' || s.status === studentStatusFilter;
        return matchesSearch && matchesStatus;
    }).sort((a, b) => {
        let valA = a[studentSortKey];
        let valB = b[studentSortKey];
        
        if (typeof valA === 'string') {
            return studentSortOrder === 'asc' 
                ? valA.localeCompare(valB) 
                : valB.localeCompare(valA);
        } else {
            return studentSortOrder === 'asc' ? valA - valB : valB - valA;
        }
    });

    const filteredDups = analytics.duplicatePairs.filter(d => {
        const matchesSearch = d.studentName.toLowerCase().includes(dupSearch.toLowerCase()) || 
                             d.matchedStudentName.toLowerCase().includes(dupSearch.toLowerCase()) ||
                             d.assignmentTitle.toLowerCase().includes(dupSearch.toLowerCase());
        const matchesRec = dupRecFilter === 'All' || d.recommendation === dupRecFilter;
        return matchesSearch && matchesRec;
    });

    // Audit Log filtering & pagination
    const filteredAudit = analytics.timeline.filter(e => {
        const matchesSearch = e.username.toLowerCase().includes(auditSearch.toLowerCase()) ||
                             e.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
                             e.details.toLowerCase().includes(auditSearch.toLowerCase());
        const matchesAction = auditActionFilter === 'All' || e.action === auditActionFilter;
        const matchesStatus = auditStatusFilter === 'All' || e.status === auditStatusFilter;
        return matchesSearch && matchesAction && matchesStatus;
    });

    const totalAuditPages = Math.ceil(filteredAudit.length / auditLimit) || 1;
    const paginatedAudit = filteredAudit.slice((auditPage - 1) * auditLimit, auditPage * auditLimit);

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-8 print:bg-white print:text-black">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 bg-slate-800/40 backdrop-blur-xl border border-slate-800 rounded-2xl sticky top-4 z-40 shadow-xl shadow-black/20 print:hidden">
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard">
                            <img src={logo} alt="EduLock" className="h-10 cursor-pointer" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight">Teacher Analytics & Audit Center</h1>
                            <p className="text-xs text-slate-400 font-medium">Enterprise Security & Performance Insights</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 self-stretch md:self-auto">
                        <Link to="/dashboard" className="flex-1 md:flex-none">
                            <Button variant="ghost" className="w-full text-xs px-4 py-2 hover:bg-slate-800 border border-slate-800 rounded-lg">
                                ← Dashboard
                            </Button>
                        </Link>
                        
                        <div className="relative group flex-1 md:flex-none">
                            <Button className="w-full text-xs px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center gap-2">
                                📥 Export Report
                            </Button>
                            <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl hidden group-hover:block hover:block z-50 overflow-hidden">
                                <button 
                                    onClick={handlePrintPDF}
                                    className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-700 transition-colors border-b border-slate-750"
                                >
                                    📄 Print / PDF Report
                                </button>
                                <button 
                                    onClick={() => exportToCSV(analytics.assignmentHealth, ['title', 'totalStudents', 'submitted', 'pending', 'late', 'averageSimilarity', 'riskStatus'], 'assignment_health.csv')}
                                    className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-700 transition-colors border-b border-slate-750"
                                >
                                    📊 CSV: Assignment Health
                                </button>
                                <button 
                                    onClick={() => exportToCSV(analytics.studentMatrix, ['username', 'submittedCount', 'pendingCount', 'lateCount', 'duplicateCount', 'averageSimilarity', 'status'], 'student_matrix.csv')}
                                    className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-700 transition-colors border-b border-slate-750"
                                >
                                    👥 CSV: Student Performance
                                </button>
                                <button 
                                    onClick={() => exportToCSV(analytics.timeline, ['timestamp', 'username', 'role', 'action', 'status', 'details'], 'audit_trail.csv')}
                                    className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-700 transition-colors"
                                >
                                    🛡️ CSV: Complete Audit Log
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 print:hidden">
                        <span className="text-red-400 text-sm font-medium">{error}</span>
                    </div>
                )}

                {/* Tabs Selector */}
                <div className="flex border-b border-slate-800 gap-6 overflow-x-auto pb-px shrink-0 scrollbar-none print:hidden">
                    {[
                        { id: 'overview', label: '📊 Dashboard Overview' },
                        { id: 'health', label: '📖 Assignment Health' },
                        { id: 'students', label: '🎓 Student Matrix' },
                        { id: 'duplicates', label: '🔍 Plagiarism Pairs' },
                        { id: 'audit', label: '🛡️ Security & Audit' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-4 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-all duration-200 ${
                                activeTab === tab.id 
                                    ? 'border-blue-500 text-white' 
                                    : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* MAIN CONTENT SECTION */}

                {/* TAB 1: OVERVIEW */}
                {activeTab === 'overview' && (
                    <div className="space-y-8 animate-fadeIn">
                        
                        {/* KPI Cards Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                            {[
                                { label: 'Total Assignments', val: analytics.cards.totalAssignments, border: 'border-l-blue-500' },
                                { label: 'Total Students', val: analytics.cards.totalStudents, border: 'border-l-violet-500' },
                                { label: 'Total Submissions', val: analytics.cards.totalSubmissions, border: 'border-l-indigo-500' },
                                { label: 'Submission Rate', val: `${analytics.cards.submissionRate}%`, border: 'border-l-teal-500' },
                                { label: 'Avg Submit Time', val: `${analytics.cards.averageSubmissionTime} days`, border: 'border-l-emerald-500' },
                                { label: 'Avg Similarity', val: `${analytics.cards.averageSimilarity}%`, border: 'border-l-yellow-500', isSim: true },
                                { label: 'Duplicate Files', val: analytics.cards.duplicateFiles, border: 'border-l-red-500', isDup: true },
                                { label: 'Late Uploads', val: analytics.cards.lateSubmissions, border: 'border-l-orange-500', isLate: true },
                                { label: 'Pending Eval', val: analytics.cards.pendingEvaluations, border: 'border-l-pink-500' },
                                { label: 'Reviews Done', val: analytics.cards.teacherReviewsCompleted, border: 'border-l-sky-500' },
                                { label: 'Integrity Fails', val: analytics.cards.integrityFailures, border: 'border-l-red-600', isFail: true },
                                { label: 'Downloads Count', val: analytics.cards.downloadedAssignments, border: 'border-l-slate-400' },
                                { label: 'Encryption Success', val: `${analytics.cards.encryptionSuccessRate}%`, border: 'border-l-green-500' },
                                { label: 'Auth Success Rate', val: `${analytics.cards.authenticationSuccessRate}%`, border: 'border-l-cyan-500' },
                                { label: "Today's Uploads", val: analytics.cards.todayUploads, border: 'border-l-purple-500' },
                                { label: 'Weekly Uploads', val: analytics.cards.weekUploads, border: 'border-l-fuchsia-500' }
                            ].map((card, i) => (
                                <div key={i} className={`bg-slate-850/40 border border-slate-800 p-4 rounded-xl text-center border-l-4 ${card.border} shadow-lg shadow-black/10`}>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1.5">{card.label}</p>
                                    <p className={`text-xl font-extrabold ${
                                        card.isDup && card.val > 0 ? 'text-red-400' :
                                        card.isLate && card.val > 0 ? 'text-orange-400' :
                                        card.isFail && card.val > 0 ? 'text-red-500 font-black animate-pulse' :
                                        card.isSim && card.val >= 70 ? 'text-red-400' :
                                        card.isSim && card.val >= 40 ? 'text-yellow-400' :
                                        card.isSim ? 'text-emerald-400' : 'text-white'
                                    }`}>
                                        {card.val}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* AI Insights & Circular Health Gauge */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* Circular Health Gauge */}
                            <div className="bg-slate-850/40 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-lg shadow-black/10">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Class Security & Health index</h3>
                                <div className="relative w-40 h-40 flex items-center justify-center">
                                    {/* Radial background ring */}
                                    <svg className="absolute w-full h-full -rotate-90">
                                        <circle cx="80" cy="80" r="70" stroke="#1e293b" strokeWidth="12" fill="transparent" />
                                        <circle 
                                            cx="80" 
                                            cy="80" 
                                            r="70" 
                                            stroke={analytics.charts.healthGauge >= 80 ? '#10b981' : analytics.charts.healthGauge >= 50 ? '#f59e0b' : '#ef4444'} 
                                            strokeWidth="12" 
                                            fill="transparent"
                                            strokeDasharray="440"
                                            strokeDashoffset={440 - (440 * analytics.charts.healthGauge) / 100}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000 ease-out"
                                        />
                                    </svg>
                                    <div>
                                        <p className="text-4xl font-extrabold text-white">{analytics.charts.healthGauge}%</p>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">Healthy Score</p>
                                    </div>
                                </div>
                                <p className="text-slate-400 text-xs mt-6 leading-relaxed max-w-xs">
                                    Overall health computed based on absence of duplication, low similarity vectors, and on-time submissions.
                                </p>
                            </div>

                            {/* AI Insights Panel */}
                            <div className="col-span-2 bg-slate-850/40 border border-slate-800 rounded-2xl p-6 flex flex-col shadow-lg shadow-black/10">
                                <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                                    <span className="text-blue-400">✨</span> Real-Time AI Diagnostics
                                </h3>
                                <div className="space-y-3 flex-1 overflow-y-auto max-h-56 pr-2 scrollbar-thin">
                                    {analytics.insights.map((insight, i) => (
                                        <div key={i} className="flex items-start gap-3 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed font-medium">
                                            <span className="mt-0.5 text-blue-400">•</span>
                                            <p>{insight}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Visual Charts Center */}
                        <div className="space-y-6">
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Enterprise Performance Graphs</h2>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Chart 1: Submission Trend (14 days) */}
                                <Card className="bg-slate-850/30 border-slate-800">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Submission Upload History (14 Days)</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={analytics.charts.submissionTrend}>
                                                <defs>
                                                    <linearGradient id="colorUploadsUp" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: 9 }} />
                                                <YAxis stroke="#64748b" style={{ fontSize: 9 }} />
                                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }} />
                                                <Legend wrapperStyle={{ fontSize: 10 }} />
                                                <Area name="Total Submissions" type="monotone" dataKey="uploads" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUploadsUp)" />
                                                <Area name="Late Submissions" type="monotone" dataKey="lates" stroke="#f97316" fillOpacity={0} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                {/* Chart 2: Hourly Uploads Distribution */}
                                <Card className="bg-slate-850/30 border-slate-800">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Submission Hour Distribution</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analytics.charts.submissionTimeDistribution}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                                <XAxis dataKey="hour" stroke="#64748b" style={{ fontSize: 9 }} />
                                                <YAxis stroke="#64748b" style={{ fontSize: 9 }} />
                                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                                                <Bar name="Uploads Count" dataKey="submissions" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                {/* Chart 3: Similarity Distribution */}
                                <Card className="bg-slate-850/30 border-slate-800">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Similarity Distribution</h3>
                                    <div className="h-64 flex flex-col md:flex-row justify-center items-center gap-8">
                                        <div className="w-44 h-44">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={analytics.charts.similarityDistribution}
                                                        innerRadius={45}
                                                        outerRadius={65}
                                                        paddingAngle={4}
                                                        dataKey="value"
                                                    >
                                                        {analytics.charts.similarityDistribution.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="flex flex-col gap-2.5">
                                            {analytics.charts.similarityDistribution.map((entry, index) => (
                                                <div key={index} className="flex items-center gap-2 text-xs">
                                                    <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: COLORS[index] }}></span>
                                                    <span className="text-slate-400 font-medium">{entry.name}:</span>
                                                    <span className="font-extrabold text-white">{entry.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Card>

                                {/* Chart 4: Copy Severity Distribution */}
                                <Card className="bg-slate-850/30 border-slate-800">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Duplicate Risk Segment Distribution</h3>
                                    <div className="h-64 flex flex-col md:flex-row justify-center items-center gap-8">
                                        <div className="w-44 h-44">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={analytics.charts.duplicateDistribution}
                                                        innerRadius={45}
                                                        outerRadius={65}
                                                        paddingAngle={4}
                                                        dataKey="value"
                                                    >
                                                        {analytics.charts.duplicateDistribution.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={DUP_COLORS[index % DUP_COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="flex flex-col gap-2.5">
                                            {analytics.charts.duplicateDistribution.map((entry, index) => (
                                                <div key={index} className="flex items-center gap-2 text-xs">
                                                    <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: DUP_COLORS[index] }}></span>
                                                    <span className="text-slate-400 font-medium">{entry.name}:</span>
                                                    <span className="font-extrabold text-white">{entry.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Card>

                                {/* Chart 5: Funnel Completion Rate */}
                                <Card className="bg-slate-850/30 border-slate-800">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Assignment Completion funnel</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analytics.charts.completionFunnel}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                                <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 9 }} />
                                                <YAxis stroke="#64748b" style={{ fontSize: 9 }} />
                                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                                                <Legend wrapperStyle={{ fontSize: 10 }} />
                                                <Bar name="Students Enrolled" dataKey="students" fill="#475569" radius={[3, 3, 0, 0]} />
                                                <Bar name="Submissions Received" dataKey="submitted" fill="#10b981" radius={[3, 3, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                {/* Chart 6: Class Performance Radar */}
                                <Card className="bg-slate-850/30 border-slate-800">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Assignment Multi-Metric Radar</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={analytics.charts.radarChart}>
                                                <PolarGrid stroke="#334155" />
                                                <PolarAngleAxis dataKey="subject" stroke="#64748b" style={{ fontSize: 9 }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" style={{ fontSize: 8 }} />
                                                <Radar name="Completion Rate %" dataKey="Completion %" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
                                                <Radar name="Avg Similarity %" dataKey="Avg Similarity %" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                                                <Legend wrapperStyle={{ fontSize: 10 }} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                {/* Chart 7: Heatmap Grid */}
                                <Card className="bg-slate-850/30 border-slate-800">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Submission Temporal Heatmap</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analytics.charts.submissionHeatmap}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                                <XAxis dataKey="day" stroke="#64748b" style={{ fontSize: 9 }} />
                                                <YAxis stroke="#64748b" style={{ fontSize: 9 }} />
                                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                                                <Legend wrapperStyle={{ fontSize: 10 }} />
                                                <Bar name="Night (0-6)" dataKey="Night (0-6)" fill="#1e1b4b" stackId="a" />
                                                <Bar name="Morning (6-12)" dataKey="Morning (6-12)" fill="#3b82f6" stackId="a" />
                                                <Bar name="Afternoon (12-18)" dataKey="Afternoon (12-18)" fill="#eab308" stackId="a" />
                                                <Bar name="Evening (18-24)" dataKey="Evening (18-24)" fill="#f97316" stackId="a" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                {/* Chart 8: Top Risk Assignments */}
                                <Card className="bg-slate-850/30 border-slate-800">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Top Risk Assignments Index</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analytics.charts.topRiskAssignments} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                                <XAxis type="number" stroke="#64748b" style={{ fontSize: 9 }} />
                                                <YAxis dataKey="name" type="category" stroke="#64748b" style={{ fontSize: 9 }} width={120} />
                                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                                                <Bar name="Risk Factor Value" dataKey="riskIndex" fill="#f43f5e" radius={[0, 3, 3, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: ASSIGNMENT HEALTH GRID */}
                {activeTab === 'health' && (
                    <div className="space-y-6 animate-fadeIn">
                        
                        {/* Table Filters */}
                        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-slate-850/40 p-4 border border-slate-800 rounded-2xl print:hidden">
                            <div className="flex-1 flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="🔍 Search assignment name..."
                                    value={healthSearch}
                                    onChange={(e) => setHealthSearch(e.target.value)}
                                    className="w-full max-w-sm px-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200"
                                />
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-slate-400 font-bold uppercase">Risk Filter:</span>
                                <select 
                                    value={healthRiskFilter}
                                    onChange={(e) => setHealthRiskFilter(e.target.value)}
                                    className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                                >
                                    <option value="All">All Risks</option>
                                    <option value="Healthy">Healthy</option>
                                    <option value="Warning">Warning</option>
                                    <option value="Critical">Critical</option>
                                </select>
                            </div>
                        </div>

                        {/* Health Table */}
                        <div className="bg-slate-850/40 border border-slate-800 rounded-2xl overflow-hidden shadow-lg shadow-black/10">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-800/40 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                                            <th className="p-4">Assignment Name</th>
                                            <th className="p-4">Created Date</th>
                                            <th className="p-4">Deadline</th>
                                            <th className="p-4 text-center">Submitted</th>
                                            <th className="p-4 text-center">Pending</th>
                                            <th className="p-4 text-center">Late Count</th>
                                            <th className="p-4 text-center">Avg Similarity</th>
                                            <th className="p-4 text-center">Max Similarity</th>
                                            <th className="p-4 text-center">Duplicates</th>
                                            <th className="p-4 text-center">Reviewed</th>
                                            <th className="p-4">Completion %</th>
                                            <th className="p-4">Risk Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                                        {filteredHealth.length > 0 ? filteredHealth.map((a, i) => (
                                            <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                                                <td className="p-4 font-bold text-white">{a.title}</td>
                                                <td className="p-4 font-mono text-slate-400">{new Date(a.created_at).toLocaleDateString()}</td>
                                                <td className="p-4 font-mono text-slate-400">{a.deadline ? new Date(a.deadline).toLocaleDateString() : 'N/A'}</td>
                                                <td className="p-4 text-center font-bold text-slate-200">{a.submitted}</td>
                                                <td className="p-4 text-center text-slate-400">{a.pending}</td>
                                                <td className="p-4 text-center text-orange-400 font-bold">{a.late}</td>
                                                <td className="p-4 text-center font-semibold">{a.averageSimilarity}%</td>
                                                <td className="p-4 text-center font-bold text-red-400">{a.highestSimilarity}%</td>
                                                <td className="p-4 text-center text-red-500 font-bold">{a.duplicateCount}</td>
                                                <td className="p-4 text-center text-slate-400">{a.teacherReviewed}</td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden shrink-0">
                                                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${a.completionRate}%` }}></div>
                                                        </div>
                                                        <span className="font-bold">{a.completionRate}%</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                        a.riskStatus === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                        a.riskStatus === 'Warning' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    }`}>
                                                        {a.riskStatus}
                                                    </span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="12" className="text-center p-8 text-slate-500 font-medium">No assignments found matching filters.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: STUDENT MATRIX */}
                {activeTab === 'students' && (
                    <div className="space-y-6 animate-fadeIn">
                        
                        {/* Filters Bar */}
                        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-slate-850/40 p-4 border border-slate-800 rounded-2xl print:hidden">
                            <div className="flex-1 flex flex-wrap gap-3">
                                <input 
                                    type="text" 
                                    placeholder="🔍 Search student name..."
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                    className="w-full max-w-sm px-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200"
                                />
                                <select
                                    value={studentSortKey}
                                    onChange={(e) => setStudentSortKey(e.target.value)}
                                    className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                                >
                                    <option value="username">Sort by Name</option>
                                    <option value="submittedCount">Sort by Submissions</option>
                                    <option value="lateCount">Sort by Lates</option>
                                    <option value="duplicateCount">Sort by Duplicates</option>
                                    <option value="averageSimilarity">Sort by Avg Similarity</option>
                                    <option value="status">Sort by Status</option>
                                </select>
                                <button
                                    onClick={() => setStudentSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                    className="px-3 py-1 text-xs border border-slate-800 bg-slate-900 rounded-lg text-slate-400 font-bold hover:text-white"
                                >
                                    {studentSortOrder === 'asc' ? 'ASC ▲' : 'DESC ▼'}
                                </button>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-slate-400 font-bold uppercase">Status Filter:</span>
                                <select 
                                    value={studentStatusFilter}
                                    onChange={(e) => setStudentStatusFilter(e.target.value)}
                                    className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Active">Active</option>
                                    <option value="Warning">Warning</option>
                                    <option value="Critical">Critical</option>
                                </select>
                            </div>
                        </div>

                        {/* Student Matrix Table */}
                        <div className="bg-slate-850/40 border border-slate-800 rounded-2xl overflow-hidden shadow-lg shadow-black/10">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-800/40 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                                            <th className="p-4">Student Name</th>
                                            <th className="p-4 text-center">Submitted Assignments</th>
                                            <th className="p-4 text-center">Pending Assignments</th>
                                            <th className="p-4 text-center">Late Submissions</th>
                                            <th className="p-4 text-center">Duplicate Detections</th>
                                            <th className="p-4 text-center">Avg Similarity Score</th>
                                            <th className="p-4 text-center">Avg Submission Offset</th>
                                            <th className="p-4">Last Activity Time</th>
                                            <th className="p-4">Academic Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                                        {filteredStudents.length > 0 ? filteredStudents.map((s, i) => (
                                            <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                                                <td className="p-4 font-bold text-white">{s.username}</td>
                                                <td className="p-4 text-center font-bold text-slate-200">{s.submittedCount}</td>
                                                <td className="p-4 text-center text-slate-400">{s.pendingCount}</td>
                                                <td className="p-4 text-center text-orange-400 font-bold">{s.lateCount}</td>
                                                <td className="p-4 text-center text-red-500 font-bold">{s.duplicateCount}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`font-bold ${s.averageSimilarity >= 70 ? 'text-red-400' : s.averageSimilarity >= 40 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                                                        {s.averageSimilarity}%
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center font-mono text-slate-400">{s.averageSubmissionTime} days</td>
                                                <td className="p-4 font-mono text-slate-400">{s.lastSubmission ? new Date(s.lastSubmission).toLocaleString() : 'Never'}</td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                        s.status === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                        s.status === 'Warning' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    }`}>
                                                        {s.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="9" className="text-center p-8 text-slate-500 font-medium">No students found matching filters.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 4: PLAGIARISM & DUPLICATE INVESTIGATION CENTER */}
                {activeTab === 'duplicates' && (
                    <div className="space-y-6 animate-fadeIn">
                        
                        {/* Duplicate filters */}
                        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-slate-850/40 p-4 border border-slate-800 rounded-2xl print:hidden">
                            <div className="flex-1 flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="🔍 Filter by student, file, or assignment title..."
                                    value={dupSearch}
                                    onChange={(e) => setDupSearch(e.target.value)}
                                    className="w-full max-w-sm px-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200"
                                />
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-slate-400 font-bold uppercase">Classification:</span>
                                <select 
                                    value={dupRecFilter}
                                    onChange={(e) => setDupRecFilter(e.target.value)}
                                    className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                                >
                                    <option value="All">All Verdicts</option>
                                    <option value="Possible Copy">Possible Copy</option>
                                    <option value="Needs Review">Needs Review</option>
                                    <option value="False Positive">False Positive</option>
                                </select>
                            </div>
                        </div>

                        {/* Pairs Table */}
                        <div className="bg-slate-850/40 border border-slate-800 rounded-2xl overflow-hidden shadow-lg shadow-black/10">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-800/40 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                                            <th className="p-4">Assignment</th>
                                            <th className="p-4">Submission A</th>
                                            <th className="p-4">Filename A</th>
                                            <th className="p-4">Matched Submission B</th>
                                            <th className="p-4">Filename B</th>
                                            <th className="p-4 text-center">Similarity %</th>
                                            <th className="p-4 text-center">Submit Interval</th>
                                            <th className="p-4">System Tag</th>
                                            <th className="p-4">Override Classification</th>
                                            <th className="p-4 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                                        {filteredDups.length > 0 ? filteredDups.map((d, i) => (
                                            <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                                                <td className="p-4 font-bold text-white">{d.assignmentTitle}</td>
                                                <td className="p-4 font-semibold text-slate-200">{d.studentName}</td>
                                                <td className="p-4 font-mono text-slate-400">{d.filename}</td>
                                                <td className="p-4 font-semibold text-slate-200">{d.matchedStudentName}</td>
                                                <td className="p-4 font-mono text-slate-400">{d.matchedFilename}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`text-sm font-extrabold ${d.similarityScore === 100 ? 'text-red-500 font-black' : d.similarityScore >= 70 ? 'text-red-400' : 'text-yellow-500'}`}>
                                                        {d.similarityScore}%
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center font-mono text-slate-400">{d.timeDifference}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                                        d.recommendation === 'Possible Copy' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                        d.recommendation === 'Needs Review' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                                        'bg-slate-500/10 text-slate-400 border border-slate-700'
                                                    }`}>
                                                        {d.recommendation}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <select
                                                        onChange={(e) => handleReviewStatusUpdate(d.id, e.target.value)}
                                                        className="px-2 py-1 text-xs bg-slate-900 border border-slate-800 rounded text-slate-300 focus:outline-none"
                                                    >
                                                        <option value="">Select Action...</option>
                                                        <option value="Flagged">⚠️ Flag Copy</option>
                                                        <option value="Reviewed">✅ False Positive</option>
                                                    </select>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {d.matchedSubmissionId ? (
                                                        <Link to={`/compare/${d.id}/${d.matchedSubmissionId}`}>
                                                            <Button className="text-[10px] px-3 py-1 bg-slate-800 hover:bg-slate-750 text-white rounded">
                                                                Compare Files
                                                            </Button>
                                                        </Link>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-500">Compare Unavailable</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="10" className="text-center p-8 text-slate-500 font-medium">No duplicated files or similarity pairs found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 5: SECURITY MONITORING & AUDIT LOGS */}
                {activeTab === 'audit' && (
                    <div className="space-y-8 animate-fadeIn">
                        
                        {/* Audit Indicators */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                            {[
                                { label: 'Files Encrypted', val: analytics.securityAudit.filesEncrypted, color: 'text-emerald-400' },
                                { label: 'Files Decrypted', val: analytics.securityAudit.filesDecrypted, color: 'text-blue-400' },
                                { label: 'Integrity Passed', val: analytics.securityAudit.integrityPassed, color: 'text-green-500' },
                                { label: 'Integrity Failed', val: analytics.securityAudit.integrityFailed, color: 'text-red-500' },
                                { label: 'SHA-256 Verified', val: analytics.securityAudit.hashSuccess, color: 'text-teal-400' },
                                { label: 'AES Encryption', val: analytics.securityAudit.aesSuccess, color: 'text-emerald-400' },
                                { label: 'Tamper Alerts', val: analytics.securityAudit.tamperAttempts, color: 'text-red-500' },
                                { label: 'Downloads Blocked', val: analytics.securityAudit.blockedDownloads, color: 'text-red-400' }
                            ].map((stat, i) => (
                                <div key={i} className="bg-slate-850/40 border border-slate-800 p-4 rounded-xl text-center shadow-lg shadow-black/10">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1.5">{stat.label}</p>
                                    <p className={`text-lg font-extrabold ${stat.color}`}>{stat.val}</p>
                                </div>
                            ))}
                        </div>

                        {/* Interactive Audit Trail Log search */}
                        <div className="space-y-4">
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Cryptographic Log Trail</h2>

                            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-slate-850/40 p-4 border border-slate-800 rounded-2xl print:hidden">
                                <div className="flex-1 flex flex-wrap gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="🔍 Search audit log trails..."
                                        value={auditSearch}
                                        onChange={(e) => { setAuditSearch(e.target.value); setAuditPage(1); }}
                                        className="w-full max-w-sm px-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200"
                                    />
                                    
                                    <select 
                                        value={auditActionFilter}
                                        onChange={(e) => { setAuditActionFilter(e.target.value); setAuditPage(1); }}
                                        className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                                    >
                                        <option value="All">All Actions</option>
                                        <option value="LOGIN">LOGIN</option>
                                        <option value="LOGOUT">LOGOUT</option>
                                        <option value="ASSIGNMENT_CREATED">ASSIGNMENT_CREATED</option>
                                        <option value="ASSIGNMENT_DELETED">ASSIGNMENT_DELETED</option>
                                        <option value="SUBMISSION_UPLOADED">SUBMISSION_UPLOADED</option>
                                        <option value="SUBMISSION_DOWNLOADED">SUBMISSION_DOWNLOADED</option>
                                        <option value="INTEGRITY_VERIFIED">INTEGRITY_VERIFIED</option>
                                        <option value="TEACHER_VIEWED_SUBMISSION">TEACHER_VIEWED_SUBMISSION</option>
                                        <option value="EVALUATION_COMPLETED">EVALUATION_COMPLETED</option>
                                    </select>

                                    <select 
                                        value={auditStatusFilter}
                                        onChange={(e) => { setAuditStatusFilter(e.target.value); setAuditPage(1); }}
                                        className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                                    >
                                        <option value="All">All Outcomes</option>
                                        <option value="Success">Success</option>
                                        <option value="Failed">Failed</option>
                                        <option value="Flagged">Flagged</option>
                                    </select>
                                </div>
                            </div>

                            {/* Trail Grid */}
                            <div className="bg-slate-850/40 border border-slate-800 rounded-2xl overflow-hidden shadow-lg shadow-black/10">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-slate-800/40 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                                                <th className="p-4">Timestamp</th>
                                                <th className="p-4">User</th>
                                                <th className="p-4">Role</th>
                                                <th className="p-4">IP Address</th>
                                                <th className="p-4">Action</th>
                                                <th className="p-4">Status</th>
                                                <th className="p-4">Details</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/80 text-slate-350">
                                            {paginatedAudit.length > 0 ? paginatedAudit.map((e, idx) => (
                                                <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                                                    <td className="p-4 font-mono text-slate-400">{new Date(e.timestamp).toLocaleString()}</td>
                                                    <td className="p-4 font-bold text-white">{e.username}</td>
                                                    <td className="p-4">
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                                                            {e.role}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-mono text-slate-400">{e.ipAddress}</td>
                                                    <td className="p-4 font-bold">{e.action}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                                            e.status === 'Success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                            e.status === 'Failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse' :
                                                            'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                                        }`}>
                                                            {e.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-slate-300 font-medium">{e.details}</td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="7" className="text-center p-8 text-slate-500 font-medium">No audit events logged matching the options.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination controls */}
                                <div className="p-4 bg-slate-800/20 border-t border-slate-800 flex justify-between items-center print:hidden">
                                    <span className="text-xs text-slate-400">
                                        Page <strong className="text-white">{auditPage}</strong> of <strong className="text-white">{totalAuditPages}</strong> ({filteredAudit.length} total events)
                                    </span>
                                    <div className="flex gap-1">
                                        <button 
                                            disabled={auditPage === 1}
                                            onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                                            className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-400 font-bold hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                                        >
                                            Prev
                                        </button>
                                        <button 
                                            disabled={auditPage === totalAuditPages}
                                            onClick={() => setAuditPage(p => Math.min(totalAuditPages, p + 1))}
                                            className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-400 font-bold hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherAnalytics;
