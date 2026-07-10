import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../axiosConfig';
import { Card, Button } from '../components/UI';
import logo from '../assets/logo.png';

const SimilarityReport = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchSimilarityReport();
    }, [id]);

    const fetchSimilarityReport = async () => {
        try {
            const res = await api.get(`/api/similarity/${id}`);
            setReport(res.data);
            setLoading(false);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to generate similarity report.');
            setLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-blue-400">Analyzing submissions... (This may take a moment)</div>;
    if (error) return <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-red-400 gap-4">
        {error}
        <Link to="/dashboard"><Button variant="outline">Back to Dashboard</Button></Link>
    </div>;

    if (!report.comparisons || report.comparisons.length === 0) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-300 gap-4">
                <div className="text-xl">{report.message || 'No similarity data available.'}</div>
                <Link to="/dashboard"><Button variant="outline">Back to Dashboard</Button></Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-10 p-5 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl shadow-black/20">
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard">
                            <img src={logo} alt="EduLock" className="h-10 hover:opacity-80 transition-opacity" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight">Plagiarism & Similarity Report</h1>
                            <span className="text-xs text-blue-400 font-medium">Assignment: {report.assignmentTitle}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">Back to Dashboard</Link>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="text-center p-6 border-slate-700 bg-slate-800">
                        <h3 className="text-slate-400 text-sm font-medium uppercase mb-1">Submissions Analyzed</h3>
                        <p className="text-4xl font-bold text-slate-200">{report.totalSubmissions}</p>
                    </Card>
                    <Card className="text-center p-6 border-red-500/30 bg-red-500/10">
                        <h3 className="text-red-400 text-sm font-medium uppercase mb-1">High Risk / Critical Cases</h3>
                        <p className="text-4xl font-bold text-red-500">{report.totalPlagiarismCases}</p>
                    </Card>
                    <Card className="text-center p-6 border-orange-500/30 bg-orange-500/10">
                        <h3 className="text-orange-400 text-sm font-medium uppercase mb-1">Exact File Duplicates</h3>
                        <p className="text-4xl font-bold text-orange-500">{report.exactDuplicates.length}</p>
                    </Card>
                </div>

                {report.exactDuplicates.length > 0 && (
                    <Card className="mb-8 border-orange-500/30 bg-orange-500/5">
                        <h3 className="text-orange-400 font-bold mb-4 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            Exact Duplicate Files Detected
                        </h3>
                        <ul className="list-disc list-inside text-sm text-slate-300 space-y-2">
                            {report.exactDuplicates.map((group, idx) => (
                                <li key={idx}>The following students submitted the exact same file (matching cryptographic hash): <strong className="text-white">{group.join(', ')}</strong></li>
                            ))}
                        </ul>
                    </Card>
                )}

                <Card title="Pairwise Similarity Matrix" className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-800/50">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Student A</th>
                                    <th className="px-4 py-3">Student B</th>
                                    <th className="px-4 py-3">Similarity</th>
                                    <th className="px-4 py-3 text-center">Risk Level</th>
                                    <th className="px-4 py-3 rounded-r-lg text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.comparisons.map((comp, idx) => (
                                    <tr key={idx} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="font-medium text-slate-300">{comp.studentA}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="font-medium text-slate-300">{comp.studentB}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-full bg-slate-700 rounded-full h-2.5 max-w-[100px]">
                                                    <div className="h-2.5 rounded-full" style={{ width: `${comp.percentage}%`, backgroundColor: comp.color }}></div>
                                                </div>
                                                <span className="font-bold" style={{ color: comp.color }}>{comp.percentage}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider" style={{ backgroundColor: `${comp.color}20`, color: comp.color, border: `1px solid ${comp.color}40` }}>
                                                {comp.riskLevel}
                                            </span>
                                            {comp.isDuplicate && (
                                                <div className="text-[10px] text-orange-400 mt-1">Duplicate File</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <Link to={`/similarity/${id}/compare/${comp.studentAId}/${comp.studentBId}`}>
                                                <Button variant="outline" className="text-xs py-1 px-3 bg-slate-800 hover:bg-blue-600 hover:text-white transition-colors border-slate-600">
                                                    Compare
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default SimilarityReport;
