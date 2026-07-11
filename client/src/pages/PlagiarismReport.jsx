import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../axiosConfig';
import { useAuth } from '../context/AuthContext';
import { Card, Button } from '../components/UI';
import logo from '../assets/logo.png';

const PlagiarismReport = () => {
    const { assignmentId } = useParams();
    const { token } = useAuth();
    const navigate = useNavigate();

    const [summary, setSummary] = useState(null);
    const [report, setReport] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchReport();
    }, [assignmentId]);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/teacher/plagiarism/${assignmentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSummary(res.data.summary);
            setReport(res.data.report);
            setError('');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to load plagiarism report');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            'Duplicate': 'bg-red-500/10 text-red-400 border-red-500/20',
            'Very High': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
            'High': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
            'Medium': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            'Safe': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        };
        return badges[status] || badges['Safe'];
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-slate-400 text-sm">Analyzing similarity profiles...</p>
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
                            <h1 className="text-xl font-bold text-white tracking-tight">Similarity Inspector</h1>
                            <p className="text-xs text-slate-400 font-medium">Plagiarism Detection Engine</p>
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

                {summary && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 text-center">
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Assignment</p>
                            <h3 className="text-lg font-bold text-white truncate">{summary.assignmentName}</h3>
                        </div>
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 text-center">
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Submissions</p>
                            <h3 className="text-3xl font-bold text-white">{summary.totalSubmissions}</h3>
                        </div>
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 text-center border-l-4 border-l-red-500">
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Duplicates</p>
                            <h3 className="text-3xl font-bold text-red-400">{summary.duplicateCount}</h3>
                        </div>
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 text-center">
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Avg Similarity</p>
                            <h3 className={`text-3xl font-bold ${summary.averageSimilarity >= 70 ? 'text-red-400' : summary.averageSimilarity >= 40 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                                {summary.averageSimilarity}%
                            </h3>
                        </div>
                    </div>
                )}

                {/* Report Table */}
                <Card>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white">Student Similarity Summary</h2>
                        <span className="text-xs text-slate-500 border border-slate-700 px-2 py-1 rounded">TF-IDF Vector Space Model</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-800/50">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Student Name</th>
                                    <th className="px-4 py-3">Closest Match Peer</th>
                                    <th className="px-4 py-3 text-center">Similarity Score</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Submission Date</th>
                                    <th className="px-4 py-3 rounded-r-lg text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.length > 0 ? report.map((row) => (
                                    <tr key={row.submissionId} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-4 font-semibold text-slate-200">{row.studentName}</td>
                                        <td className="px-4 py-4 text-slate-400">{row.matchedStudentName}</td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-16 bg-slate-700 h-2 rounded-full overflow-hidden hidden sm:block">
                                                    <div className={`h-full ${row.similarityScore >= 90 ? 'bg-red-500' : row.similarityScore >= 70 ? 'bg-orange-500' : row.similarityScore >= 40 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${row.similarityScore}%` }}></div>
                                                </div>
                                                <span className={`font-mono font-bold ${row.similarityScore >= 70 ? 'text-red-400' : row.similarityScore >= 40 ? 'text-yellow-400' : 'text-emerald-400'}`}>{row.similarityScore}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${getStatusBadge(row.status)}`}>
                                                {row.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-slate-500 font-mono text-xs">{new Date(row.submittedAt).toLocaleString()}</td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {row.similarityScore > 0 ? (
                                                    <Button 
                                                        variant="primary" 
                                                        className="text-xs px-3 py-1.5 rounded-lg"
                                                        onClick={() => navigate(`/teacher/compare/${row.submissionId}/${row.submissionId === row.submissionId && row.matchedStudentName !== 'N/A' ? report.find(r => r.studentName === row.matchedStudentName)?.submissionId || row.submissionId : row.submissionId}`)}
                                                    >
                                                        Compare
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-slate-600 font-medium">Safe</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" className="text-center py-8 text-slate-500">
                                            No submissions uploaded yet for this assignment.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default PlagiarismReport;
