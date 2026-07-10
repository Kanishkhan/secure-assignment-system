import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateAssignment from './pages/CreateAssignment';
import AssignmentDetail from './pages/AssignmentDetail';
import AnalyticsHub from './pages/AnalyticsHub';
import SimilarityReport from './pages/SimilarityReport';
import CompareSubmissions from './pages/CompareSubmissions';

const PrivateRoute = ({ children }) => {
    const { token } = useAuth();
    return token ? children : <Navigate to="/login" />;
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                    <Route path="/assignments/new" element={<PrivateRoute><CreateAssignment /></PrivateRoute>} />
                    <Route path="/assignments/:id" element={<PrivateRoute><AssignmentDetail /></PrivateRoute>} />
                    <Route path="/analytics" element={<PrivateRoute><AnalyticsHub /></PrivateRoute>} />
                    <Route path="/similarity/:id" element={<PrivateRoute><SimilarityReport /></PrivateRoute>} />
                    <Route path="/similarity/:id/compare/:studentA/:studentB" element={<PrivateRoute><CompareSubmissions /></PrivateRoute>} />
                    <Route path="*" element={<Navigate to="/login" />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
