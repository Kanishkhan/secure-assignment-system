import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../axiosConfig';
import { useAuth } from '../context/AuthContext';
import { Card, Button } from '../components/UI';
import logo from '../assets/logo.png';

const CompareSubmissions = () => {
    const { sub1, sub2 } = useParams();
    const { token } = useAuth();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [syncScroll, setSyncScroll] = useState(true);
    const [hoveredIdxA, setHoveredIdxA] = useState(null);
    const [hoveredIdxB, setHoveredIdxB] = useState(null);

    const paneARef = useRef(null);
    const paneBRef = useRef(null);
    const activeScrollRef = useRef(null);

    useEffect(() => {
        fetchComparison();
    }, [sub1, sub2]);

    const fetchComparison = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/teacher/compare/${sub1}/${sub2}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data);
            setError('');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to compare submissions');
        } finally {
            setLoading(false);
        }
    };

    // Scroll synchronizer logic
    const handleScroll = (source) => {
        if (!syncScroll) return;

        const primary = source === 'A' ? paneARef.current : paneBRef.current;
        const secondary = source === 'A' ? paneBRef.current : paneARef.current;

        if (!primary || !secondary) return;

        // If the scroll is triggered by the sync process itself, ignore to prevent loop
        if (activeScrollRef.current && activeScrollRef.current !== source) {
            return;
        }

        activeScrollRef.current = source;
        secondary.scrollTop = primary.scrollTop;

        // Clear active source block after a small delay
        setTimeout(() => {
            activeScrollRef.current = null;
        }, 50);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-slate-400 text-sm">Decrypting and comparing file signatures...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-8 flex flex-col h-screen overflow-hidden">
            {/* Header */}
            <header className="flex justify-between items-center mb-6 p-4 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl shadow-black/20 shrink-0">
                <div className="flex items-center gap-4">
                    <img src={logo} alt="EduLock" className="h-8" />
                    <div>
                        <h1 className="text-md font-bold text-white tracking-tight">Side-by-Side Comparison</h1>
                        <p className="text-[10px] text-slate-400 font-medium">Symmetric AES-256 decrypted comparison in-memory</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 px-3 py-1 rounded-xl">
                        <input 
                            type="checkbox" 
                            id="sync-scroll" 
                            checked={syncScroll} 
                            onChange={(e) => setSyncScroll(e.target.checked)}
                            className="rounded bg-slate-900 border-slate-700 text-blue-500 focus:ring-0 cursor-pointer"
                        />
                        <label htmlFor="sync-scroll" className="text-xs font-semibold text-slate-300 cursor-pointer select-none">Sync Scrolling</label>
                    </div>
                    <Button variant="ghost" className="text-xs px-3 py-1.5 hover:bg-slate-800" onClick={() => window.history.back()}>
                        ← Back
                    </Button>
                </div>
            </header>

            {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3 shrink-0 animate-slide-up">
                    <span className="text-red-400 text-sm font-medium">{error}</span>
                </div>
            )}

            {data && (
                <div className="flex flex-col flex-1 min-h-0 gap-6">
                    {/* Metrics Banner */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 bg-slate-800/20 border border-slate-800/50 p-4 rounded-2xl shrink-0">
                        <div className="text-center">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Copied % (Similarity)</p>
                            <p className={`text-xl font-bold ${data.comparison.overallSimilarity >= 70 ? 'text-red-400' : data.comparison.overallSimilarity >= 40 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                                {data.comparison.overallSimilarity}%
                            </p>
                        </div>
                        <div className="text-center border-l border-slate-800">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Matching Sections</p>
                            <p className="text-xl font-bold text-slate-200">{data.comparison.matchParagraphCount} Paragraphs</p>
                        </div>
                        <div className="text-center border-l border-slate-800">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Copied Sentences</p>
                            <p className="text-xl font-bold text-slate-200">{data.comparison.matchLineCount} Lines</p>
                        </div>
                        <div className="text-center border-l border-slate-800">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Confidence Score</p>
                            <p className="text-xl font-bold text-blue-400">
                                {data.comparison.overallSimilarity === 100 ? '100%' : data.comparison.overallSimilarity >= 70 ? `${Math.min(99, data.comparison.overallSimilarity + 8)}%` : `${data.comparison.overallSimilarity}%`}
                            </p>
                        </div>
                        <div className="text-center border-l border-slate-800">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Recommendation Verdict</p>
                            <div className="mt-1">
                                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    data.comparison.overallSimilarity === 100 
                                        ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                                        : data.comparison.overallSimilarity >= 70 
                                            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' 
                                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                    {data.comparison.overallSimilarity === 100 
                                        ? 'Possible Copy' 
                                        : data.comparison.overallSimilarity >= 70 
                                            ? 'Needs Review' 
                                            : 'False Positive'}
                                </span>
                            </div>
                        </div>
                        <div className="text-center border-l border-slate-800">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Comparison Date</p>
                            <p className="text-xs font-mono text-slate-400 mt-1">{new Date(data.comparison.timestamp).toLocaleDateString()}</p>
                        </div>
                    </div>

                    {/* Viewports */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0 mb-6">
                        {/* Sub 1 */}
                        <div className="flex flex-col min-h-0 bg-slate-850 border border-slate-800 rounded-2xl overflow-hidden">
                            <div className="p-4 bg-slate-800/40 border-b border-slate-800/80 flex justify-between items-center shrink-0">
                                <div>
                                    <h4 className="font-bold text-white text-sm">{data.submission1.studentName}</h4>
                                    <span className="text-[10px] text-slate-500 font-mono">{data.submission1.filename}</span>
                                </div>
                                <span className="text-[9px] uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium">Source Document</span>
                            </div>
                            <div 
                                ref={paneARef}
                                onScroll={() => handleScroll('A')}
                                className="p-6 overflow-y-auto flex-1 text-slate-300 text-sm font-sans space-y-4 leading-relaxed scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
                            >
                                {data.comparison.paragraphsA.map((p, idx) => {
                                    const isMatch = data.comparison.matchingParagraphsA.includes(idx);
                                    const isHovered = idx === hoveredIdxA;
                                    return (
                                        <p 
                                            key={idx} 
                                            onMouseEnter={() => {
                                                if (isMatch && data.comparison.matchMapAtoB) {
                                                    setHoveredIdxA(idx);
                                                    setHoveredIdxB(data.comparison.matchMapAtoB[idx]);
                                                }
                                            }}
                                            onMouseLeave={() => {
                                                setHoveredIdxA(null);
                                                setHoveredIdxB(null);
                                            }}
                                            className={`p-3 rounded-lg border transition-all duration-200 ${
                                                isHovered 
                                                    ? 'bg-red-500/20 text-white border-red-500/80 scale-[1.01] shadow-lg shadow-red-500/10' 
                                                    : isMatch 
                                                        ? 'bg-red-500/10 text-red-200 border-red-500/20' 
                                                        : 'bg-transparent border-transparent'
                                            }`}
                                        >
                                            {p}
                                        </p>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Sub 2 */}
                        <div className="flex flex-col min-h-0 bg-slate-850 border border-slate-800 rounded-2xl overflow-hidden">
                            <div className="p-4 bg-slate-800/40 border-b border-slate-800/80 flex justify-between items-center shrink-0">
                                <div>
                                    <h4 className="font-bold text-white text-sm">{data.submission2.studentName}</h4>
                                    <span className="text-[10px] text-slate-500 font-mono">{data.submission2.filename}</span>
                                </div>
                                <span className="text-[9px] uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-medium">Comparison Document</span>
                            </div>
                            <div 
                                ref={paneBRef}
                                onScroll={() => handleScroll('B')}
                                className="p-6 overflow-y-auto flex-1 text-slate-300 text-sm font-sans space-y-4 leading-relaxed scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
                            >
                                {data.comparison.paragraphsB.map((p, idx) => {
                                    const isMatch = data.comparison.matchingParagraphsB.includes(idx);
                                    const isHovered = idx === hoveredIdxB;
                                    return (
                                        <p 
                                            key={idx} 
                                            onMouseEnter={() => {
                                                if (isMatch && data.comparison.matchMapBtoA) {
                                                    setHoveredIdxB(idx);
                                                    setHoveredIdxA(data.comparison.matchMapBtoA[idx]);
                                                }
                                            }}
                                            onMouseLeave={() => {
                                                setHoveredIdxA(null);
                                                setHoveredIdxB(null);
                                            }}
                                            className={`p-3 rounded-lg border transition-all duration-200 ${
                                                isHovered 
                                                    ? 'bg-red-500/20 text-white border-red-500/80 scale-[1.01] shadow-lg shadow-red-500/10' 
                                                    : isMatch 
                                                        ? 'bg-red-500/10 text-red-200 border-red-500/20' 
                                                        : 'bg-transparent border-transparent'
                                            }`}
                                        >
                                            {p}
                                        </p>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompareSubmissions;
