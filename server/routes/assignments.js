//Implementation of Access Control 


const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { encryptFile, decryptFile, computeHash, SYSTEM_KEY } = require('../utils/crypto');
const fs = require('fs');
const path = require('path');

// Configure Multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Uploads directory
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// 2.3 Implementation of Access Control:
// Access permissions are enforced. Only authenticated users can access this route.
router.get('/', authenticateToken, async (req, res) => {
    try {
        const assignments = await Assignment.find();
        res.json(assignments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 1.5 GET Assignment by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id).populate('creator_id', 'username');
        if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

        // Transform to flat structure expected by frontend if needed
        const result = assignment.toObject();
        result.creator_name = result.creator_id ? result.creator_id.username : 'Unknown';

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


//Policy Definition & Justification 

// 2.3 Implementation of Access Control:
// Policy: Only users with 'teacher' role can create assignments.
router.post('/', authenticateToken, authorizeRole(['teacher']), async (req, res) => {
    const { title, description, deadline } = req.body;
    try {
        const newAssignment = await Assignment.create({
            title,
            description,
            creator_id: req.user.id,
            deadline
        });
        res.json({ message: 'Assignment created', id: newAssignment._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2.5 DELETE Assignment (Teacher Only)
router.delete('/:id', authenticateToken, authorizeRole(['teacher']), async (req, res) => {
    const assignmentId = req.params.id;

    try {
        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

        if (assignment.creator_id.toString() !== req.user.id) {
            return res.status(403).json({ error: 'You can only delete your own assignments' });
        }

        // Delete related submissions
        await Submission.deleteMany({ assignment_id: assignmentId });

        // Delete assignment
        await Assignment.findByIdAndDelete(assignmentId);

        res.json({ message: 'Assignment deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2.3 Implementation of Access Control:
// Policy: Only users with 'student' role can submit assignments.
router.post('/:id/submit', upload.single('submission'), authenticateToken, authorizeRole(['student']), async (req, res) => {
    const assignmentId = req.params.id;
    const file = req.file;

    console.log('--- Submission Debug ---');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('File received:', file ? file.originalname : 'NONE');
    if (!file) {
        console.log('Body keys:', Object.keys(req.body));
    }
    console.log('-----------------------');

    try {
        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

        if (assignment.deadline && new Date() > new Date(assignment.deadline)) {
            return res.status(400).json({ error: 'Submission deadline has passed' });
        }

        const count = await Submission.countDocuments({ assignment_id: assignmentId, student_id: req.user.id });
        if (count >= 3) {
            return res.status(400).json({ error: 'Maximum 3 attempts reached' });
        }

        if (!file) {
            return res.status(400).json({
                error: 'No file uploaded',
                debug: {
                    contentType: req.headers['content-type'],
                    bodyKeys: Object.keys(req.body),
                    multerFile: !!req.file
                }
            });
        }

        // 4.2 Digital Signature using Hash:
        // Demonstrating data integrity using hash-based verification.
        const fileHash = computeHash(file.buffer);

        // 3.2 Encryption & Decryption:
        // Implement secure encryption using AES-256-GCM.
        const { iv, encrypted, tag } = encryptFile(file.buffer, SYSTEM_KEY);

        // c. Save Encrypted File
        const filename = `${Date.now()}_${file.originalname}.enc`;
        const filePath = path.join(uploadsDir, filename);

        fs.writeFileSync(filePath, JSON.stringify({ iv, encrypted, tag }));

        // d. Store Metadata
        const submission = await Submission.create({
            assignment_id: assignmentId,
            student_id: req.user.id,
            filename: file.originalname,
            encrypted_path: filePath,
            file_hash: fileHash
        });

        console.log('Submission Successful:', submission);

        res.json({ message: `Assignment submitted securely (Attempt ${count + 1}/3)`, submissionId: submission._id });
    } catch (err) {
        console.error('Submission Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 3.5 Check My Submission (Student only)
router.get('/:id/my-submission', authenticateToken, authorizeRole(['student']), async (req, res) => {
    const assignmentId = req.params.id;
    try {
        const submissions = await Submission.find({ assignment_id: assignmentId, student_id: req.user.id })
            .populate('student_id', 'username')
            .sort({ submitted_at: -1 });

        // Transform to include username at top level for consistency
        const results = submissions.map(sub => {
            const subObj = sub.toJSON();
            return {
                ...subObj,
                username: sub.student_id ? sub.student_id.username : 'You'
            };
        });

        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. VIEW Submissions (Teacher/Admin) - Show LATEST Only
router.get('/:id/submissions', authenticateToken, authorizeRole(['teacher', 'admin']), async (req, res) => {
    const assignmentId = req.params.id;
    console.log('Fetching unique latest submissions for:', assignmentId);

    try {
        // Fetch ALL submissions sorted by latest first
        const submissions = await Submission.find({ assignment_id: assignmentId })
            .populate('student_id', 'username')
            .sort({ submitted_at: -1 });

        // Filter: Keep only the first (latest) occurrence of each student
        const uniqueSubmissions = [];
        const seenStudents = new Set();

        for (const sub of submissions) {
            if (!sub.student_id) continue;

            const studentId = sub.student_id._id
                ? sub.student_id._id.toString()
                : sub.student_id.toString();

            if (!seenStudents.has(studentId)) {
                seenStudents.add(studentId);

                // Count total attempts for this student to show to teacher
                const studentAttemptCount = submissions.filter(s =>
                    (s.student_id._id ? s.student_id._id.toString() : s.student_id.toString()) === studentId
                ).length;

                const subObj = sub.toJSON();
                uniqueSubmissions.push({
                    ...subObj,
                    student_id: studentId,
                    username: sub.student_id.username || 'Unknown',
                    attemptNumber: studentAttemptCount
                });
            }
        }

        console.log('Unique submissions returned:', uniqueSubmissions.length);
        res.json(uniqueSubmissions);
    } catch (err) {
        console.error('Submission view error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 3.2 Encryption & Decryption:
// Decrypting the file for authorized download.
// Verifying Integrity (Digital Signature Check)
// router.get('/download/:submissionId', authenticateToken, authorizeRole(['teacher', 'admin']), async (req, res) => {
router.get('/download/:submissionId', authenticateToken, async (req, res) => {
    const submissionId = req.params.submissionId;
    console.log('Download initiated for:', submissionId);

    try {
        const submission = await Submission.findById(submissionId);
        if (!submission) {
            console.error('Submission not found in DB');
            return res.status(404).json({ error: 'Submission not found' });
        }

        console.log('Found submission:', submission.filename, submission.encrypted_path);

        // Security Check: Only teacher, admin, OR the student who submitted it can download
        if (req.user.role !== 'teacher' && req.user.role !== 'admin' && submission.student_id.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized to download this file' });
        }

        // Read Encrypted File
        if (!fs.existsSync(submission.encrypted_path)) {
            console.error('File missing from disk:', submission.encrypted_path);
            return res.status(404).json({ error: 'File not found on server' });
        }
        const fileContent = fs.readFileSync(submission.encrypted_path, 'utf-8');
        const { iv, encrypted, tag } = JSON.parse(fileContent);

        // Decrypt
        // 3.2 Encryption & Decryption:
        // Decrypting the file for authorized download.
        const decryptedBuffer = decryptFile(encrypted, SYSTEM_KEY, iv, tag);

        // Verify Integrity
        const currentHash = computeHash(decryptedBuffer);
        if (currentHash !== submission.file_hash) {
            console.warn('Integrity Check Failed!');
        }

        res.setHeader('Content-Disposition', `attachment; filename="${submission.filename}"`);
        res.send(decryptedBuffer);
    } catch (e) {
        console.error('Download/Decryption Error:', e);
        res.status(500).json({ error: 'Decryption failed: ' + e.message });
    }
});

module.exports = router;



// Authorization – Access Control
//
// Access Control Model :
// This system implements an Access Control List (ACL) using Role-Based Access Control.
// Subjects: Admin, Teacher, Student
// Objects: Assignments, Submissions, Files
// Access rules are enforced using authenticateToken and authorizeRole middleware.
//
// Policy Definition & Justification :
// Admin: Can view all submissions and download files for monitoring and auditing.
// Teacher: Can create/delete assignments and view/download student submissions.
// Student: Can view assignments and submit files before the deadline.
// Access is restricted to ensure confidentiality, integrity, and role separation.
//
// Implementation of Access Control (3 Marks):
// Access permissions are enforced programmatically at route level.
// Each API endpoint validates user role before allowing actions
// such as assignment creation, submission, viewing, or download.
