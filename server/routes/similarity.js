const express = require('express');
const router = express.Router();
const fs = require('fs');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const User = require('../models/User');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { decryptFile, SYSTEM_KEY } = require('../utils/crypto');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const { analyzePlagiarism } = require('../utils/plagiarismAnalyzer');

const extractText = async (submission) => {
    if (!fs.existsSync(submission.encrypted_path)) return 'File not found on server.';
    try {
        const fileContent = fs.readFileSync(submission.encrypted_path, 'utf-8');
        const { iv, encrypted, tag } = JSON.parse(fileContent);
        const decryptedBuffer = decryptFile(encrypted, SYSTEM_KEY, iv, tag);
        
        const ext = submission.filename.split('.').pop().toLowerCase();
        if (ext === 'pdf') {
            const data = await pdfParse(decryptedBuffer);
            return data.text;
        } else if (ext === 'docx') {
            const result = await mammoth.extractRawText({ buffer: decryptedBuffer });
            return result.value;
        } else {
            return decryptedBuffer.toString('utf-8');
        }
    } catch(e) {
        console.error("Extraction error for", submission.filename, ":", e.message);
        return 'Failed to decrypt or parse file.';
    }
};

// Text Sanitization
// Removes common academic boilerplates, punctuation, and normalizes spacing
const sanitizeText = (text) => {
    let cleanText = text.toLowerCase();
    
    // Remove common boilerplates
    const boilerplates = [
        'question list', 'solution', 'references', 'reference',
        'code', 'output', 'algorithm', 'introduction', 'conclusion',
        'student name', 'assignment', 'date', 'roll number'
    ];
    boilerplates.forEach(bp => {
        const regex = new RegExp(`\\b${bp}\\b`, 'gi');
        cleanText = cleanText.replace(regex, '');
    });

    // Remove punctuation and extra whitespace
    cleanText = cleanText.replace(/[^\w\s]/g, ' ') // Replace non-word chars with space
                         .replace(/\s+/g, ' ')     // Collapse whitespace
                         .trim();
    
    return cleanText;
};

// Calculate similarity using Trigram Intersection (very robust for plagiarism)
const getTrigrams = (words) => {
    const trigrams = new Set();
    for (let i = 0; i < words.length - 2; i++) {
        trigrams.add(`${words[i]} ${words[i+1]} ${words[i+2]}`);
    }
    return trigrams;
};

const calculateTrigramSimilarity = (textA, textB) => {
    const wordsA = textA.split(' ');
    const wordsB = textB.split(' ');
    
    if (wordsA.length < 3 || wordsB.length < 3) {
        // If files are extremely short, just do a direct word intersection
        const setA = new Set(wordsA);
        const setB = new Set(wordsB);
        let intersectionCount = 0;
        setA.forEach(word => { if (setB.has(word)) intersectionCount++; });
        return (2.0 * intersectionCount) / (setA.size + setB.size) || 0;
    }

    const triA = getTrigrams(wordsA);
    const triB = getTrigrams(wordsB);

    let intersectionCount = 0;
    triA.forEach(tri => {
        if (triB.has(tri)) intersectionCount++;
    });

    // Dice's Coefficient on Trigrams
    return (2.0 * intersectionCount) / (triA.size + triB.size) || 0;
};

const getRiskLevel = (percentage) => {
    if (percentage <= 20) return { level: 'Low Risk', color: 'green' };
    if (percentage <= 50) return { level: 'Medium Risk', color: 'yellow' };
    if (percentage <= 70) return { level: 'High Risk', color: 'orange' };
    return { level: 'Critical', color: 'red' };
};

// Middleware to check if user can access assignment similarity
const checkAssignmentAccess = async (req, res, next) => {
    try {
        const { assignmentId } = req.params;
        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

        const isAdmin = req.user.role === 'admin';
        const isCreator = assignment.creator_id && assignment.creator_id.toString() === req.user.id;
        
        if (!isAdmin && !isCreator) {
            return res.status(403).json({ error: 'Unauthorized to view similarity reports for this assignment' });
        }
        
        req.assignment = assignment;
        next();
    } catch (err) {
        console.error('checkAssignmentAccess Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ==========================================
// GET /api/similarity/compare/:assignmentId
// Fetches raw text for two students for side-by-side view
// MUST BE DEFINED BEFORE /:assignmentId to avoid route masking!
// ==========================================
router.get('/compare/:assignmentId', authenticateToken, authorizeRole(['admin', 'teacher']), checkAssignmentAccess, async (req, res) => {
    try {
        console.log(`[Compare Route] Hit for assignment: ${req.params.assignmentId}`);
        const { assignmentId } = req.params;
        const { studentA, studentB } = req.query;

        if (!studentA || !studentB) {
            return res.status(400).json({ error: 'Both studentA and studentB query parameters are required.' });
        }

        // Fetch latest submissions for both students
        const subA = await Submission.findOne({ assignment_id: assignmentId, student_id: studentA })
            .populate('student_id', 'username').sort({ submitted_at: -1 });
        const subB = await Submission.findOne({ assignment_id: assignmentId, student_id: studentB })
            .populate('student_id', 'username').sort({ submitted_at: -1 });

        if (!subA || !subB) {
            return res.status(404).json({ error: 'Could not find submissions for one or both students.' });
        }

        const textA = await extractText(subA);
        const textB = await extractText(subB);
        
        const analysis = analyzePlagiarism(textA, textB);

        res.json({
            analysis,
            studentA: {
                name: subA.student_id.username,
                filename: subA.filename
            },
            studentB: {
                name: subB.student_id.username,
                filename: subB.filename
            }
        });

    } catch (err) {
        console.error('Compare Error:', err);
        res.status(500).json({ error: err.message });
    }
});


// ==========================================
// GET /api/similarity/:assignmentId
// ==========================================
router.get('/:assignmentId', authenticateToken, authorizeRole(['admin', 'teacher']), checkAssignmentAccess, async (req, res) => {
    try {
        console.log(`[Similarity Route] Hit for assignment: ${req.params.assignmentId}`);
        const { assignmentId } = req.params;
        const assignment = req.assignment;

        const allSubmissions = await Submission.find({ assignment_id: assignmentId })
            .populate('student_id', 'username')
            .sort({ submitted_at: -1 });

        if (allSubmissions.length < 2) {
            return res.json({ 
                message: 'Not enough submissions to compare.', 
                totalSubmissions: allSubmissions.length,
                comparisons: [] 
            });
        }

        const latestSubmissionsMap = new Map();
        const attemptCounts = new Map();

        for (const sub of allSubmissions) {
            if (!sub.student_id) continue;
            const studentIdStr = sub.student_id._id.toString();
            
            attemptCounts.set(studentIdStr, (attemptCounts.get(studentIdStr) || 0) + 1);
            if (!latestSubmissionsMap.has(studentIdStr)) latestSubmissionsMap.set(studentIdStr, sub);
        }

        const uniqueSubmissions = Array.from(latestSubmissionsMap.values());
        
        const decryptedContents = [];
        const duplicateHashes = new Map();

        for (const sub of uniqueSubmissions) {
            try {
                if (sub.file_hash) {
                    if (!duplicateHashes.has(sub.file_hash)) duplicateHashes.set(sub.file_hash, []);
                    duplicateHashes.get(sub.file_hash).push(sub.student_id.username);
                }

                if (fs.existsSync(sub.encrypted_path)) {
                    const rawText = await extractText(sub);
                    const sanitizedText = sanitizeText(rawText);

                    decryptedContents.push({
                        studentName: sub.student_id.username,
                        studentId: sub.student_id._id.toString(),
                        attempt: attemptCounts.get(sub.student_id._id.toString()),
                        date: sub.submitted_at,
                        sanitizedText
                    });
                }
            } catch (err) {
                console.warn(`Failed to decrypt submission for ${sub.student_id?.username}:`, err.message);
            }
        }

        const comparisons = [];
        let totalPlagiarismCases = 0; 

        for (let i = 0; i < decryptedContents.length; i++) {
            for (let j = i + 1; j < decryptedContents.length; j++) {
                const subA = decryptedContents[i];
                const subB = decryptedContents[j];

                let similarityFraction = calculateTrigramSimilarity(subA.sanitizedText, subB.sanitizedText);
                const percentage = Math.round(similarityFraction * 100);
                const risk = getRiskLevel(percentage);

                if (percentage > 50) totalPlagiarismCases++;

                comparisons.push({
                    studentA: subA.studentName,
                    studentAId: subA.studentId,
                    studentB: subB.studentName,
                    studentBId: subB.studentId,
                    percentage: percentage,
                    riskLevel: risk.level,
                    color: risk.color,
                    isDuplicate: percentage === 100
                });
            }
        }

        comparisons.sort((a, b) => b.percentage - a.percentage);

        const exactDuplicates = [];
        duplicateHashes.forEach((students) => {
            if (students.length > 1) exactDuplicates.push(students);
        });

        res.json({
            assignmentTitle: assignment.title,
            totalSubmissions: uniqueSubmissions.length,
            totalPlagiarismCases,
            exactDuplicates,
            comparisons
        });

    } catch (err) {
        console.error('Similarity Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
