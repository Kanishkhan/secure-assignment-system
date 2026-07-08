import React, { useState } from 'react';
import api from '../axiosConfig';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card } from '../components/UI';

const CreateAssignment = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [deadline, setDeadline] = useState('');
    const { token } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/assignments',
                { title, description, deadline },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('Assignment Created Successfully');
            navigate('/dashboard');
        } catch (error) {
            console.error(error);
            alert('Failed to create assignment');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl relative">
                <div className="absolute top-0 left-0 w-full h-full bg-blue-500/5 rounded-3xl blur-3xl -z-10"></div>

                <Card title="Create New Assignment" className="border-slate-700 bg-slate-800/90 backdrop-blur-xl">
                    <p className="text-center text-slate-400 mb-8 -mt-4">Define tasks and set deadlines efficiently.</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            label="Assignment Title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Network Security Basics"
                            required
                        />

                        <div className="mb-5">
                            <label className="block text-slate-300 text-sm font-semibold mb-2">Description</label>
                            <textarea
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                rows="5"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Provide detailed instructions for the students..."
                                required
                            ></textarea>
                        </div>

                        <Input
                            label="Submission Deadline"
                            type="datetime-local"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            required
                        />

                        <div className="flex gap-4 pt-2">
                            <Button type="button" onClick={() => navigate('/dashboard')} className="flex-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200">
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border-none">
                                Publish Assignment
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default CreateAssignment;
