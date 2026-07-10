import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../axiosConfig';
import { Card, Button, Input } from '../components/UI';
import { Download, AlertTriangle, FileText, CheckCircle, Search, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import logo from '../assets/logo.png';

const CompareSubmissions = () => {
    const { id, studentA, studentB } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Sync scrolling
    const paneARef = useRef(null);
    const paneBRef = useRef(null);
    
    const handleScrollA = (e) => {
        if (paneBRef.current) {
            paneBRef.current.scrollTop = e.target.scrollTop;
        }
    };
    
    const handleScrollB = (e) => {
        if (paneARef.current) {
            paneARef.current.scrollTop = e.target.scrollTop;
        }
    };

    useEffect(() => {
        const fetchComparison = async () => {
            try {
                const res = await api.get(`/api/similarity/compare/${id}?studentA=${studentA}&studentB=${studentB}`);
                setData(res.data);
                setLoading(false);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to fetch comparison report.');
                setLoading(false);
            }
        };
        fetchComparison();
    }, [id, studentA, studentB]);

    const downloadPDF = () => {
        const reportElement = document.getElementById('report-content');
        if (!reportElement) return;
        
        html2canvas(reportElement, { scale: 2 }).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Plagiarism_Report_${data.studentA.name}_vs_${data.studentB.name}.pdf`);
        });
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-blue-400">Analyzing sentences... (This may take a moment)</div>;
    if (error) return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-red-400 gap-4">
            {error}
            <Link to={`/similarity/${id}`}><Button variant="outline">Back to Report</Button></Link>
        </div>
    );

    const { analysis, studentA: aData, studentB: bData } = data;
    const { riskLevel, overallSimilarity, matchedSentencesCount, uniqueContentPercentage, stats } = analysis;

    let riskColor = 'text-emerald-400';
    let riskBg = 'bg-emerald-400/10 border-emerald-400/20';
    if (overallSimilarity > 20) { riskColor = 'text-yellow-400'; riskBg = 'bg-yellow-400/10 border-yellow-400/20'; }
    if (overallSimilarity > 50) { riskColor = 'text-orange-400'; riskBg = 'bg-orange-400/10 border-orange-400/20'; }
    if (overallSimilarity > 70) { riskColor = 'text-red-400'; riskBg = 'bg-red-400/10 border-red-400/20'; }

    const highlightText = (text, isMatch, simScore) => {
        if (!text) return null;
        let content = text;
        
        // Search Highlighting
        if (searchQuery && text.toLowerCase().includes(searchQuery.toLowerCase())) {
            const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
            content = parts.map((part, i) => 
                part.toLowerCase() === searchQuery.toLowerCase() ? <mark key={i} className="bg-blue-400 text-white rounded px-1">{part}</mark> : part
            );
        }

        if (isMatch) {
            return (
                <span className="bg-yellow-400/20 text-yellow-100 font-medium px-1 rounded mx-0.5 border border-yellow-400/30" title={`Similarity: ${simScore}%`}>
                    {content}
                </span>
            );
        }
        return <span className="text-slate-300">{content} </span>;
    };

    return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Header Actions */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <img src={logo} alt="EduLock" className="w-10 h-10 object-contain" />
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Similarity Analysis</h1>
                            <p className="text-slate-400 text-sm">Sentence-level Plagiarism Detection</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input 
                                type="text"
                                placeholder="Search document..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none w-64 transition-all"
                            />
                        </div>
                        <Button variant="outline" onClick={downloadPDF} className="flex items-center gap-2">
                            <Download className="w-4 h-4" /> Download Report
                        </Button>
                        <Link to={`/similarity/${id}`}>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white">Back to Dashboard</Button>
                        </Link>
                    </div>
                </div>

                <div id="report-content" className="space-y-6">
                    {/* Summary Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="p-6 bg-slate-900 border-slate-800 flex items-center gap-4">
                            <div className={`p-4 rounded-full ${riskBg}`}>
                                <Activity className={`w-8 h-8 ${riskColor}`} />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm font-medium">Overall Similarity</p>
                                <p className="text-3xl font-bold text-white">{overallSimilarity}%</p>
                            </div>
                        </Card>
                        <Card className="p-6 bg-slate-900 border-slate-800 flex items-center gap-4">
                            <div className="p-4 rounded-full bg-blue-500/10 border border-blue-500/20">
                                <AlertTriangle className="w-8 h-8 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm font-medium">Risk Level</p>
                                <p className={`text-xl font-bold ${riskColor}`}>{riskLevel}</p>
                            </div>
                        </Card>
                        <Card className="p-6 bg-slate-900 border-slate-800 flex items-center gap-4">
                            <div className="p-4 rounded-full bg-yellow-400/10 border border-yellow-400/20">
                                <FileText className="w-8 h-8 text-yellow-400" />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm font-medium">Matched Sentences</p>
                                <p className="text-2xl font-bold text-white">{matchedSentencesCount}</p>
                            </div>
                        </Card>
                        <Card className="p-6 bg-slate-900 border-slate-800 flex items-center gap-4">
                            <div className="p-4 rounded-full bg-emerald-400/10 border border-emerald-400/20">
                                <CheckCircle className="w-8 h-8 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm font-medium">Unique Content</p>
                                <p className="text-2xl font-bold text-white">{uniqueContentPercentage}%</p>
                            </div>
                        </Card>
                    </div>

                    {/* Side-by-Side Documents */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[600px]">
                        <Card className="flex flex-col bg-slate-900 border-slate-800 overflow-hidden">
                            <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                                <div>
                                    <h3 className="font-semibold text-blue-400">{aData.name}</h3>
                                    <p className="text-xs text-slate-500">{aData.filename} ({stats.totalWordsA} words)</p>
                                </div>
                            </div>
                            <div className="p-6 overflow-y-auto flex-1 leading-relaxed whitespace-pre-wrap text-[15px]" ref={paneARef} onScroll={handleScrollA}>
                                {analysis.sentencesA.map((s, i) => (
                                    <React.Fragment key={i}>
                                        {highlightText(s.text, s.isMatch, s.similarity)}
                                    </React.Fragment>
                                ))}
                            </div>
                        </Card>

                        <Card className="flex flex-col bg-slate-900 border-slate-800 overflow-hidden">
                            <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                                <div>
                                    <h3 className="font-semibold text-purple-400">{bData.name}</h3>
                                    <p className="text-xs text-slate-500">{bData.filename} ({stats.totalWordsB} words)</p>
                                </div>
                            </div>
                            <div className="p-6 overflow-y-auto flex-1 leading-relaxed whitespace-pre-wrap text-[15px]" ref={paneBRef} onScroll={handleScrollB}>
                                {analysis.sentencesB.map((s, i) => (
                                    <React.Fragment key={i}>
                                        {highlightText(s.text, s.isMatch, s.similarity)}
                                    </React.Fragment>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Matching Sentences Panel */}
                    <Card className="p-6 bg-slate-900 border-slate-800">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-yellow-400" />
                            Detailed Sentence Matches
                        </h2>
                        {analysis.matchedSentencesList.length === 0 ? (
                            <p className="text-slate-400">No highly similar sentences found.</p>
                        ) : (
                            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                {analysis.matchedSentencesList.map((match, idx) => (
                                    <div key={idx} className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-slate-400">Match #{idx + 1}</span>
                                            <span className="px-2 py-1 rounded bg-yellow-400/10 text-yellow-400 text-xs font-bold border border-yellow-400/20">
                                                {match.similarity}% Similar
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                                            <div>
                                                <p className="text-xs text-blue-400 mb-1">{aData.name}</p>
                                                <p className="text-slate-300 italic">"{match.textA.trim()}"</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-purple-400 mb-1">{bData.name}</p>
                                                <p className="text-slate-300 italic">"{match.textB.trim()}"</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default CompareSubmissions;
