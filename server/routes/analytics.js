const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// GET /api/analytics/dashboard
router.get('/dashboard', authenticateToken, authorizeRole(['admin', 'teacher']), async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin';
        const teacherId = req.user.id;
        
        let responseData = {};

        if (isAdmin) {
            // Global Admin Stats
            const totalUsers = await User.countDocuments();
            const totalTeachers = await User.countDocuments({ role: 'teacher' });
            const totalStudents = await User.countDocuments({ role: 'student' });
            const totalAssignments = await Assignment.countDocuments();
            const totalSubmissions = await Submission.countDocuments();
            
            // Submissions per assignment for chart
            const submissionsPerAssignment = await Submission.aggregate([
                { $group: { _id: "$assignment_id", count: { $sum: 1 } } },
                { $lookup: { from: "assignments", localField: "_id", foreignField: "_id", as: "assignment" } },
                { $unwind: "$assignment" },
                { $project: { title: "$assignment.title", submissions: "$count" } }
            ]);

            responseData = {
                role: 'admin',
                stats: {
                    totalUsers,
                    totalTeachers,
                    totalStudents,
                    totalAssignments,
                    totalSubmissions,
                },
                charts: {
                    submissionsPerAssignment
                }
            };
        } else {
            // Teacher specific stats
            const totalAssignments = await Assignment.countDocuments({ creator_id: teacherId });
            
            // Find assignments created by this teacher
            const teacherAssignments = await Assignment.find({ creator_id: teacherId }).select('_id title');
            const assignmentIds = teacherAssignments.map(a => a._id);

            const totalSubmissions = await Submission.countDocuments({ assignment_id: { $in: assignmentIds } });

            // Unique students who submitted to this teacher
            const uniqueStudents = await Submission.distinct('student_id', { assignment_id: { $in: assignmentIds } });

            // Submissions per assignment for chart
            const submissionsPerAssignment = await Submission.aggregate([
                { $match: { assignment_id: { $in: assignmentIds } } },
                { $group: { _id: "$assignment_id", count: { $sum: 1 } } },
                { $lookup: { from: "assignments", localField: "_id", foreignField: "_id", as: "assignment" } },
                { $unwind: "$assignment" },
                { $project: { title: "$assignment.title", submissions: "$count" } }
            ]);

            // Add assignments with 0 submissions
            teacherAssignments.forEach(ta => {
                if (!submissionsPerAssignment.find(s => s._id && s._id.toString() === ta._id.toString())) {
                    submissionsPerAssignment.push({ _id: ta._id, title: ta.title, submissions: 0 });
                }
            });

            responseData = {
                role: 'teacher',
                stats: {
                    totalAssignments,
                    totalSubmissions,
                    studentsEngaged: uniqueStudents.length
                },
                charts: {
                    submissionsPerAssignment
                }
            };
        }

        res.json(responseData);
    } catch (err) {
        console.error('Analytics Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
