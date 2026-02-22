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
        if (!file) {
            alert("Please select a file first");
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            await api.post(`/api/assignments/${id}/submit`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                    'Accept': 'application/json'
                }
            });
            alert('File Encrypted and Submitted Securely!');
            setFile(null); // Reset file input
            if (user?.role === 'teacher' || user?.role === 'admin') {
                fetchSubmissions();
            } else {
                fetchMySubmissions(); // Refresh student view
            }
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.error || 'Upload failed');
        }
    };

    const handleDownload = async (subId, filename) => {
        try {
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
        } catch (error) {
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
                                <div className="space-y-8">
                                    {/* Latest Submission Display */}
                                    {mySubmissions.length > 0 && (
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold text-white">Your Latest Submission</h3>

                                            {/* Show ONLY the first item (Latest) */}
                                            {(() => {
                                                const latest = mySubmissions[0];
                                                return (
                                                    <div key={latest.id} className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4 flex justify-between items-center">
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-emerald-500/20 p-2 rounded-full text-emerald-400">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-white font-medium">{latest.filename}</p>
                                                                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 rounded" title="Encrypted with AES-256-GCM">AES-256</span>
                                                                    <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-1.5 rounded" title="Integrity Verified via SHA-256">SHA-256</span>
                                                                </div>
                                                                <p className="text-emerald-400/70 text-xs">
                                                                    {/* specific fix: force UTC parsing by replacing space with T and adding Z */}
                                                                    Submitted: {new Date(latest.submitted_at).toLocaleString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-mono text-slate-500">Attempt #{mySubmissions.length}</span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {/* Upload Form - ONLY if attempts < 3 */}
                                    {mySubmissions.length < 3 ? (
                                        <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-6">
                                            <h3 className="text-lg font-semibold text-blue-400 mb-4">
                                                {mySubmissions.length > 0 ? "Submit Another Version" : "Submit Your Work"}
                                            </h3>
                                            <form onSubmit={handleSubmit} className="space-y-4">
                                                <div className="flex items-center justify-center w-full">
                                                    <label
                                                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800 hover:bg-slate-750 hover:border-blue-500 transition-all"
                                                        onDragOver={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                        }}
                                                        onDrop={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                                                setFile(e.dataTransfer.files[0]);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                            <p className="mb-2 text-sm text-slate-400"><span className="font-semibold text-blue-400">Click to upload</span> or drag and drop</p>
                                                            <p className="text-xs text-emerald-400/80 font-mono mt-1">🔒 AES-256-GCM Encrypted</p>
                                                        </div>
                                                        <input type="file" className="hidden" onChange={handleFileChange} />
                                                    </label>
                                                </div>
                                                {file && <p className="text-sm text-center text-emerald-400 font-medium">Selected: {file.name}</p>}
                                                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
                                                    Encrypt & Submit (Attempt {mySubmissions.length + 1}/3)
                                                </Button>
                                            </form>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-slate-800 text-center rounded-lg border border-slate-700 text-slate-400">
                                            Maximum attempts reached. Good luck! 🍀
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
                                            <div key={sub.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 flex justify-between items-center group hover:bg-slate-800 transition-colors">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-white">{sub.filename}</p>
                                                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 rounded">AES-256</span>
                                                        <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-1.5 rounded">SHA-256</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        Submitted by: <span className="text-slate-300">{sub.username}</span> (ID: {sub.student_id}) •
                                                        On: {new Date(sub.submitted_at).toLocaleString()}
                                                    </p>
                                                </div>
                                                <Button onClick={() => handleDownload(sub.id, sub.filename)} className="text-sm py-1.5 px-3 bg-slate-700 hover:bg-blue-600 border border-slate-600 hover:border-blue-500">
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
