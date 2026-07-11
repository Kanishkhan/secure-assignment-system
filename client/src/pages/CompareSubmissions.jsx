import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../axiosConfig';
import { Card, Button, Input } from '../components/UI';
import { Download, AlertTriangle, FileText, CheckCircle, Search, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import logo from '../assets/logo.png';
import jsPDF from 'jspdf';

const CompareSubmissions = () => {
    const { id, studentA, studentB } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [exporting, setExporting] = useState(false);
    
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

    const normalizePdfText = (value) => String(value || '')
        .replace(/[\u201c\u201d]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();

    const safeFilenamePart = (value) => normalizePdfText(value)
        .replace(/[<>:"/\\|?*]+/g, '_')
        .replace(/\s+/g, '_')
        .slice(0, 60) || 'report';

    const downloadPDF = async () => {
        setExporting(true);
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 14;
            const lineHeight = 6;
            let y = 18;

            const addPageIfNeeded = (height = lineHeight) => {
                if (y + height > pageHeight - margin) {
                    pdf.addPage();
                    y = margin;
                }
            };

            const addText = (text, options = {}) => {
                const {
                    size = 10,
                    style = 'normal',
                    color = [30, 41, 59],
                    indent = 0,
                    gap = 2
                } = options;
                pdf.setFont('helvetica', style);
                pdf.setFontSize(size);
                pdf.setTextColor(...color);
                const lines = pdf.splitTextToSize(normalizePdfText(text), pageWidth - (margin * 2) - indent);
                lines.forEach((line) => {
                    addPageIfNeeded(lineHeight);
                    pdf.text(line, margin + indent, y);
                    y += lineHeight;
                });
                y += gap;
            };

            const addMetric = (label, value) => {
                pdf.setFillColor(241, 245, 249);
                pdf.roundedRect(margin, y, pageWidth - margin * 2, 12, 2, 2, 'F');
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(10);
                pdf.setTextColor(71, 85, 105);
                pdf.text(label, margin + 4, y + 7.5);
                pdf.setTextColor(15, 23, 42);
                pdf.text(String(value), pageWidth - margin - 4, y + 7.5, { align: 'right' });
                y += 16;
            };

            const { analysis, studentA: aData, studentB: bData } = data;

            pdf.setFillColor(15, 23, 42);
            pdf.rect(0, 0, pageWidth, 34, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(18);
            pdf.text('Similarity Analysis Report', margin, 17);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, 25);
            y = 44;

            addText(`Assignment ID: ${id}`, { size: 9, color: [100, 116, 139] });
            addText(`${aData.name} (${aData.filename}) vs ${bData.name} (${bData.filename})`, { size: 12, style: 'bold', color: [15, 23, 42], gap: 6 });

            addMetric('Overall Similarity', `${analysis.overallSimilarity}%`);
            addMetric('Risk Level', analysis.riskLevel);
            addMetric('Matched Sentences', analysis.matchedSentencesCount);
            addMetric('Unique Content', `${analysis.uniqueContentPercentage}%`);

            addText('Document Statistics', { size: 13, style: 'bold', color: [37, 99, 235], gap: 3 });
            addText(`${aData.name}: ${analysis.stats.totalWordsA} words`, { indent: 4 });
            addText(`${bData.name}: ${analysis.stats.totalWordsB} words`, { indent: 4, gap: 6 });

            addText('Detailed Sentence Matches', { size: 13, style: 'bold', color: [220, 38, 38], gap: 3 });

            if (!analysis.matchedSentencesList.length) {
                addText('No highly similar sentences found.', { indent: 4 });
            } else {
                analysis.matchedSentencesList.forEach((match, index) => {
                    addPageIfNeeded(28);
                    addText(`Match #${index + 1} - ${match.similarity}% similar`, { size: 11, style: 'bold', color: [15, 23, 42], gap: 1 });
                    addText(`${aData.name}: ${match.textA}`, { indent: 4, color: [30, 64, 175], gap: 1 });
                    addText(`${bData.name}: ${match.textB}`, { indent: 4, color: [126, 34, 206], gap: 4 });
                });
            }

            pdf.save(`Plagiarism_Report_${safeFilenamePart(aData.name)}_vs_${safeFilenamePart(bData.name)}.pdf`);
        } catch (err) {
            console.error('PDF Generation Failed', err);
            alert('Failed to generate PDF report.');
        } finally {
            setExporting(false);
        }
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
                    <Link to="/dashboard" className="flex items-center gap-4 hover:opacity-90 transition-opacity">
                        <img src={logo} alt="EduLock" className="w-10 h-10 object-contain" />
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Similarity Analysis</h1>
                            <p className="text-slate-400 text-sm">Sentence-level Plagiarism Detection</p>
                        </div>
                    </Link>
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
                        <Button variant="outline" onClick={downloadPDF} disabled={exporting} className="flex items-center gap-2">
                            <Download className="w-4 h-4" /> {exporting ? 'Preparing PDF...' : 'Download Report'}
                        </Button>
                        <Link to={`/similarity/${id}`}>
                            <Button variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-300">Back to Report</Button>
                        </Link>
                        <Link to="/dashboard">
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white">Dashboard</Button>
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
