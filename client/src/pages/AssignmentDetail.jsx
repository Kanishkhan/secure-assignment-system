import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../axiosConfig';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Input } from '../components/UI';

const AssignmentDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, token } = useAuth();
    const [assignment, setAssignment] = useState(null);
    const [file, setFile] = useState(null);
    const [submissions, setSubmissions] = useState([]);

    const [mySubmissions, setMySubmissions] = useState([]);

    useEffect(() => {
        fetchAssignment();
        if (user?.role === 'teacher' || user?.role === 'admin') {
            fetchSubmissions();
        } else if (user?.role === 'student') {
            fetchMySubmissions();
        }
    }, [user, id]);

    const fetchAssignment = async () => {
        try {
            const res = await api.get(`/api/assignments/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAssignment(res.data);
        } catch (error) {
            console.error(error);
            alert("Failed to load assignment details");
        }
    };

    const fetchMySubmissions = async () => {
        try {
            const res = await api.get(`/api/assignments/${id}/my-submission`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Ensure we set an array
            setMySubmissions(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error fetching my submissions:", error);
        }
    };

    const fetchSubmissions = async () => {
        try {
            const res = await api.get(`/api/assignments/${id}/submissions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSubmissions(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("Submit triggered, file selected:", file?.name);
        console.log("File metadata:", { type: file?.type, size: file?.size });

        if (!file) {
            alert("Please select a file first");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            console.log("Starting upload to:", `${baseUrl}/api/assignments/${id}/submit`);

            // Using native fetch to bypass any Axios instance configuration
            const response = await fetch(`${baseUrl}/api/assignments/${id}/submit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            console.log("Response status:", response.status);
            const data = await response.json();
            console.log("Response data:", data);

            if (!response.ok) {
                throw new Error(data.error || `Upload failed (Status: ${response.status})`);
            }

            alert('File Encrypted and Submitted Securely!');
            setFile(null); // Reset file input

            if (user?.role === 'student') {
                await fetchMySubmissions();
            }
            if (user?.role === 'teacher' || user?.role === 'admin') {
                await fetchSubmissions();
            }
        } catch (error) {
            console.error("Full upload error:", error);
            alert(`Upload Failed: ${error.message}`);
        }
    };

    const handleDownload = async (subId, filename) => {
        try {
            console.log("Downloading submission:", subId);
            const response = await api.get(`/api/assignments/download/${subId}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download error:", error);
            alert('Download/Decryption failed');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-8 flex justify-center">
            <div className="w-full max-w-4xl">
                <Button onClick={() => navigate('/dashboard')} className="mb-8 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-4 py-2 flex items-center gap-2 w-fit">
                    ← Back to Dashboard
                </Button>

                {!assignment ? (
                    <div className="text-center text-slate-500 mt-20">Loading assignment details...</div>
                ) : (
                    <div className="space-y-8">
                        <Card title={assignment.title} className="w-full max-w-none">
                            <div className="flex flex-wrap gap-4 mb-6 border-b border-slate-700 pb-6">
                                {assignment.deadline && (
                                    <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-700">
                                        <span className="text-slate-400 text-xs uppercase font-bold tracking-wider block mb-1">Deadline</span>
                                        <span className={new Date(assignment.deadline) < new Date() ? "text-red-400" : "text-emerald-400"}>
                                            {new Date(assignment.deadline).toLocaleString()}
                                        </span>
                                    </div>
                                )}
                                <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-700">
                                    <span className="text-slate-400 text-xs uppercase font-bold tracking-wider block mb-1">Created By</span>
                                    <span className="text-purple-400 font-medium">{assignment.creator_name}</span>
                                </div>
                                <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-700">
                                    <span className="text-slate-400 text-xs uppercase font-bold tracking-wider block mb-1">Status</span>
                                    <span className="text-blue-400 capitalize">Active</span>
                                </div>
                            </div>

                            <div className="prose prose-invert max-w-none mb-8">
                                <h3 className="text-lg font-semibold text-white mb-2">Instructions</h3>
                                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{assignment.description}</p>
                            </div>

                            {user?.role === 'student' && (
                                <div className="mt-12 pt-8 border-t border-slate-700">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M22 19V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2z"></path><path d="M7 7h10"></path><path d="M7 12h10"></path><path d="M7 17h10"></path></svg>
                                            Submission Status
                                        </h3>
                                        <div className="bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                                            <span className="text-xs text-slate-400 font-medium">Attempts Used: </span>
                                            <span className={`text-xs font-bold ${mySubmissions.length >= 3 ? 'text-red-400' : 'text-blue-400'}`}>
                                                {mySubmissions.length} / 3
                                            </span>
                                        </div>
                                    </div>

                                    {/* Latest Submission Card */}
                                    {mySubmissions.length > 0 ? (
                                        <div className="mb-8">
                                            <div className="bg-emerald-950/20 border-2 border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                                </div>

                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                                    <div className="flex items-start gap-4">
                                                        <div className="bg-emerald-500/20 p-3 rounded-xl text-emerald-400 border border-emerald-500/30">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                                        </div>
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                <span className="text-[10px] uppercase font-black tracking-tighter bg-emerald-500 text-emerald-950 px-1.5 rounded-sm">Current Submission</span>
                                                                <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 rounded-sm">Attempt #{mySubmissions.length}</span>
                                                            </div>
                                                            <h4 className="text-lg font-bold text-white break-all">{mySubmissions[0].filename}</h4>
                                                            <p className="text-xs text-emerald-400/60 mt-1">
                                                                Verified Hash: <span className="font-mono">{mySubmissions[0].file_hash?.substring(0, 16)}...</span>
                                                            </p>
                                                            <p className="text-xs text-slate-500 mt-2">
                                                                Submitted on {new Date(mySubmissions[0].submitted_at).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <Button
                                                        onClick={() => handleDownload(mySubmissions[0]._id || mySubmissions[0].id, mySubmissions[0].filename)}
                                                        className="bg-slate-800 hover:bg-emerald-600 border border-slate-700 hover:border-emerald-500 text-white flex items-center gap-2 px-6 py-3 transition-all transform active:scale-95"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                                        Download & Verify File
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mb-8 p-6 border-2 border-slate-800 border-dashed rounded-2xl text-center">
                                            <p className="text-slate-500 italic">No work has been submitted for this assignment yet.</p>
                                        </div>
                                    )}

                                    {/* Action Section */}
                                    {mySubmissions.length < 3 ? (
                                        <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-8">
                                            <div className="mb-6">
                                                <h4 className="text-lg font-bold text-blue-400">
                                                    {mySubmissions.length > 0 ? "Resubmit Work" : "Upload Your Work"}
                                                </h4>
                                                <p className="text-sm text-slate-500">
                                                    You can submit up to 3 versions. The latest submission will be the one graded.
                                                </p>
                                            </div>

                                            <form onSubmit={handleSubmit} className="space-y-6">
                                                <div className="relative group">
                                                    <label
                                                        className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 
                                                            ${file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-700 bg-slate-900/50 hover:bg-slate-800/80 hover:border-blue-500/50'}`}
                                                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                        onDrop={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                                                setFile(e.dataTransfer.files[0]);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                            <div className={`mb-3 p-4 rounded-full transition-colors ${file ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                                                {file ? (
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                                                                ) : (
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                                                )}
                                                            </div>
                                                            <p className="mb-1 text-sm text-slate-300">
                                                                {file ? <span className="text-emerald-400 font-bold">{file.name}</span> : <><span className="font-semibold text-blue-400">Click to upload</span> or drag and drop</>}
                                                            </p>
                                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-2">Maximum file size: 10MB</p>
                                                        </div>
                                                        <input type="file" className="hidden" onChange={handleFileChange} />
                                                    </label>
                                                </div>

                                                <Button
                                                    type="submit"
                                                    disabled={!file}
                                                    className={`w-full py-4 rounded-xl text-md font-bold transition-all transform active:scale-[0.98] 
                                                        ${!file ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20'}`}
                                                >
                                                    {file ? `Upload Attempt #${mySubmissions.length + 1}` : "Select a file to continue"}
                                                </Button>

                                                <div className="flex items-center justify-center gap-6 mt-4 opacity-50">
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> AES-256 Encryption
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span> SHA-256 Integrity
                                                    </div>
                                                </div>
                                            </form>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-800/40 border-2 border-slate-700 border-dashed rounded-3xl p-12 flex flex-col items-center text-center">
                                            <div className="bg-amber-500/10 p-5 rounded-full text-amber-500 mb-6 border border-amber-500/20">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                            </div>
                                            <h4 className="text-2xl font-bold text-white mb-2">Submission Limit Reached</h4>
                                            <p className="text-slate-400 max-w-md leading-relaxed">
                                                You have used all 3 available submission attempts. Please contact your instructor if you believe this is an error or if you need an extension.
                                            </p>
                                            <div className="mt-8 pt-6 border-t border-slate-700/50 w-full max-w-xs">
                                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Submission Window Closed</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>

                        {(user?.role === 'teacher' || user?.role === 'admin') && (
                            <Card title="Student Submissions" className="w-full max-w-none">
                                {submissions.length === 0 ? (
                                    <p className="text-center text-slate-500 py-4">No submissions yet.</p>
                                ) : (
                                    <div className="grid gap-4">
                                        {submissions.map(sub => (
                                            <div key={sub._id || sub.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 flex justify-between items-center group hover:bg-slate-800 transition-colors">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-blue-400 font-bold">{sub.username}</span>
                                                        <span className="text-slate-500">|</span>
                                                        <p className="font-medium text-white">{sub.filename}</p>
                                                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 rounded">AES-256</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        Student ID: {sub.student_id} •
                                                        Attempt: {sub.attemptNumber} / 3 •
                                                        On: {new Date(sub.submitted_at).toLocaleString()}
                                                    </p>
                                                </div>
                                                <Button onClick={() => handleDownload(sub._id || sub.id, sub.filename)} className="text-sm py-1.5 px-3 bg-slate-700 hover:bg-blue-600 border border-slate-600 hover:border-blue-500">
                                                    Decrypt & Download
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AssignmentDetail;
