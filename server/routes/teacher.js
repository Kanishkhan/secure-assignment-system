const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const User = require('../models/User');
const { decryptFile, SYSTEM_KEY } = require('../utils/crypto');
const { extractPDF, extractDOCX, normalizeText } = require('../services/similarityService');

// Helper function to split text into sentences for side-by-side comparison highlighting
const getHighlightData = (textA, textB) => {
    if (!textA || !textB) return { matchesA: [], matchesB: [], matchParagraphCount: 0, matchLineCount: 0 };

    const cleanText = (t) => t.replace(/\r/g, '');
    const paragraphsA = cleanText(textA).split(/\n+/).filter(p => p.trim().length > 0);
    const paragraphsB = cleanText(textB).split(/\n+/).filter(p => p.trim().length > 0);

    const matchesA = [];
    const matchesB = [];
    let matchParagraphCount = 0;
    let matchLineCount = 0;

    // Check paragraph-level similarity
    paragraphsA.forEach((paraA, idxA) => {
        const normA = normalizeText(paraA);
        if (normA.length < 5) return; // Skip very short paragraphs

        let isMatch = false;
        paragraphsB.forEach((paraB, idxB) => {
            const normB = normalizeText(paraB);
            if (normB.length < 5) return;

            // Check if paragraphs are identical or highly similar (simple token overlap)
            const wordsA = normA.split(' ');
            const wordsB = normB.split(' ');
            const commonWords = wordsA.filter(w => wordsB.includes(w));
            const overlapRatio = commonWords.length / Math.max(wordsA.length, wordsB.length);

            if (overlapRatio > 0.65) {
                isMatch = true;
                if (!matchesB.includes(idxB)) {
                    matchesB.push(idxB);
                }
            }
        });

        if (isMatch) {
            matchesA.push(idxA);
            matchParagraphCount++;
        }
    });

    // Line / Sentence level matching
    const sentencesA = cleanText(textA).split(/[.!?\n]+/).map(s => s.trim()).filter(s => s.length > 8);
    const sentencesB = cleanText(textB).split(/[.!?\n]+/).map(s => s.trim()).filter(s => s.length > 8);

    sentencesA.forEach(sentA => {
        const normA = normalizeText(sentA);
        let foundLineMatch = false;
        
        sentencesB.forEach(sentB => {
            const normB = normalizeText(sentB);
            if (normA === normB && normA.length > 10) {
                foundLineMatch = true;
            }
        });

        if (foundLineMatch) {
            matchLineCount++;
        }
    });

    return {
        paragraphsA,
        paragraphsB,
        matchingParagraphsA: matchesA,
        matchingParagraphsB: matchesB,
        matchParagraphCount,
        matchLineCount
    };
};

/**
 * GET /api/teacher/plagiarism/:assignmentId
 * Returns similarity summary and report table for an assignment.
 */
router.get('/plagiarism/:assignmentId', authenticateToken, authorizeRole(['teacher', 'admin']), async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

        // Get unique latest submissions per student
        const allSubmissions = await Submission.find({ assignment_id: assignmentId })
            .populate('student_id', 'username')
            .populate('matchedSubmissionId')
            .sort({ submitted_at: -1 });

        // Filter for latest submission per student
        const latestSubmissions = [];
        const seenStudents = new Set();

        for (const sub of allSubmissions) {
            if (!sub.student_id) continue;
            const studentId = sub.student_id._id.toString();
            if (!seenStudents.has(studentId)) {
                seenStudents.add(studentId);
                latestSubmissions.push(sub);
            }
        }

        const totalSubmissions = latestSubmissions.length;
        let duplicateCount = 0;
        let totalSimilarity = 0;
        let highestSimilarity = 0;

        const tableData = [];

        for (const sub of latestSubmissions) {
            // Stats updates
            if (sub.duplicate || sub.similarityScore === 100) duplicateCount++;
            totalSimilarity += sub.similarityScore;
            if (sub.similarityScore > highestSimilarity) highestSimilarity = sub.similarityScore;

            // Fetch matched student's username if matched id exists
            let matchedStudentName = 'N/A';
            if (sub.matchedSubmissionId) {
                const matchedSub = await Submission.findById(sub.matchedSubmissionId).populate('student_id', 'username');
                if (matchedSub && matchedSub.student_id) {
                    matchedStudentName = matchedSub.student_id.username;
                }
            }

            // Determine status label
            let status = 'Safe';
            if (sub.similarityScore === 100) status = 'Duplicate';
            else if (sub.similarityScore >= 90) status = 'Very High';
            else if (sub.similarityScore >= 70) status = 'High';
            else if (sub.similarityScore >= 40) status = 'Medium';

            tableData.push({
                submissionId: sub._id,
                studentName: sub.student_id.username,
                matchedStudentName,
                similarityScore: sub.similarityScore,
                status,
                submittedAt: sub.submitted_at,
                filename: sub.filename
            });
        }

        const averageSimilarity = totalSubmissions > 0 ? Math.round(totalSimilarity / totalSubmissions) : 0;

        res.json({
            summary: {
                assignmentName: assignment.title,
                totalSubmissions,
                duplicateCount,
                averageSimilarity,
                highestSimilarity
            },
            report: tableData
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/teacher/compare/:submission1/:submission2
 * Decrypts two submissions in memory and performs paragraph highlighting and stats.
 */
router.get('/compare/:submission1/:submission2', authenticateToken, authorizeRole(['teacher', 'admin']), async (req, res) => {
    try {
        const sub1 = await Submission.findById(req.params.submission1).populate('student_id', 'username');
        const sub2 = await Submission.findById(req.params.submission2).populate('student_id', 'username');

        if (!sub1 || !sub2) return res.status(404).json({ error: 'One or both submissions not found' });

        // Read and Decrypt File 1
        if (!fs.existsSync(sub1.encrypted_path)) return res.status(404).json({ error: `File missing for ${sub1.filename}` });
        const content1 = fs.readFileSync(sub1.encrypted_path, 'utf-8');
        const fileJson1 = JSON.parse(content1);
        const decryptedBuffer1 = decryptFile(fileJson1.encrypted, SYSTEM_KEY, fileJson1.iv, fileJson1.tag);
        
        // Read and Decrypt File 2
        if (!fs.existsSync(sub2.encrypted_path)) return res.status(404).json({ error: `File missing for ${sub2.filename}` });
        const content2 = fs.readFileSync(sub2.encrypted_path, 'utf-8');
        const fileJson2 = JSON.parse(content2);
        const decryptedBuffer2 = decryptFile(fileJson2.encrypted, SYSTEM_KEY, fileJson2.iv, fileJson2.tag);

        // Extract Text
        const ext1 = sub1.filename.split('.').pop().toLowerCase();
        const ext2 = sub2.filename.split('.').pop().toLowerCase();

        let text1 = '';
        let text2 = '';

        if (ext1 === 'pdf') text1 = await extractPDF(decryptedBuffer1);
        else if (ext1 === 'docx') text1 = await extractDOCX(decryptedBuffer1);
        else text1 = decryptedBuffer1.toString('utf-8');

        if (ext2 === 'pdf') text2 = await extractPDF(decryptedBuffer2);
        else if (ext2 === 'docx') text2 = await extractDOCX(decryptedBuffer2);
        else text2 = decryptedBuffer2.toString('utf-8');

        // Compute Highlight mapping
        const highlightResult = getHighlightData(text1, text2);

        res.json({
            submission1: {
                id: sub1._id,
                studentName: sub1.student_id ? sub1.student_id.username : 'Unknown',
                filename: sub1.filename,
                submittedAt: sub1.submitted_at
            },
            submission2: {
                id: sub2._id,
                studentName: sub2.student_id ? sub2.student_id.username : 'Unknown',
                filename: sub2.filename,
                submittedAt: sub2.submitted_at
            },
            comparison: {
                overallSimilarity: sub1.similarityScore,
                matchParagraphCount: highlightResult.matchParagraphCount,
                matchLineCount: highlightResult.matchLineCount,
                timestamp: new Date(),
                paragraphsA: highlightResult.paragraphsA,
                paragraphsB: highlightResult.paragraphsB,
                matchingParagraphsA: highlightResult.matchingParagraphsA,
                matchingParagraphsB: highlightResult.matchingParagraphsB
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/teacher/analytics
 * Fetches dashboard statistics, recharts series data, and automated insights.
 */
router.get('/analytics', authenticateToken, authorizeRole(['teacher', 'admin']), async (req, res) => {
    try {
        const assignments = await Assignment.find();
        const students = await User.find({ role: 'student' });
        const allSubmissions = await Submission.find().populate('student_id', 'username').populate('assignment_id');

        const totalAssignments = assignments.length;
        const totalStudents = students.length;
        const totalSubmissions = allSubmissions.length;

        let duplicateCount = 0;
        let lateCount = 0;
        let similaritySum = 0;
        let highestSimilarity = 0;

        // Group similarity distributions
        let distribution = { safe: 0, medium: 0, high: 0, veryHigh: 0, duplicate: 0 };
        // Group uploads by date (last 7 days or all time)
        const dailyUploads = {};

        allSubmissions.forEach(sub => {
            similaritySum += sub.similarityScore;
            if (sub.similarityScore > highestSimilarity) highestSimilarity = sub.similarityScore;

            if (sub.duplicate || sub.similarityScore === 100) {
                duplicateCount++;
                distribution.duplicate++;
            } else if (sub.similarityScore >= 90) {
                distribution.veryHigh++;
            } else if (sub.similarityScore >= 70) {
                distribution.high++;
            } else if (sub.similarityScore >= 40) {
                distribution.medium++;
            } else {
                distribution.safe++;
            }

            // Check if late
            const assignment = sub.assignment_id;
            if (assignment && assignment.deadline && new Date(sub.submitted_at) > new Date(assignment.deadline)) {
                lateCount++;
            }

            // Daily upload mapping (YYYY-MM-DD)
            const dateStr = new Date(sub.submitted_at).toISOString().split('T')[0];
            dailyUploads[dateStr] = (dailyUploads[dateStr] || 0) + 1;
        });

        // Convert daily uploads to sorted array for chart
        const timelineData = Object.keys(dailyUploads).sort().map(date => ({
            date,
            uploads: dailyUploads[date]
        }));

        // Completion Rate by Assignment
        const completionRateData = assignments.map(a => {
            const uniqueSubmitters = new Set();
            allSubmissions.forEach(s => {
                if (s.assignment_id && s.assignment_id._id.toString() === a._id.toString() && s.student_id) {
                    uniqueSubmitters.add(s.student_id._id.toString());
                }
            });
            const rate = totalStudents > 0 ? Math.round((uniqueSubmitters.size / totalStudents) * 100) : 0;
            return {
                title: a.title,
                rate
            };
        });

        // Similarity Distribution Chart
        const similarityDistribution = [
            { name: 'Safe (<40%)', value: distribution.safe },
            { name: 'Medium (40-69%)', value: distribution.medium },
            { name: 'High (70-89%)', value: distribution.high },
            { name: 'Very High (90-99%)', value: distribution.veryHigh },
            { name: 'Duplicate (100%)', value: distribution.duplicate }
        ];

        // Active Students count
        const studentUploadCounts = {};
        allSubmissions.forEach(s => {
            if (s.student_id) {
                const name = s.student_id.username;
                studentUploadCounts[name] = (studentUploadCounts[name] || 0) + 1;
            }
        });

        const activeStudents = Object.keys(studentUploadCounts).map(name => ({
            name,
            submissions: studentUploadCounts[name]
        })).sort((a,b) => b.submissions - a.submissions).slice(0, 5);

        // Generate Automatic Insights (Step 7)
        const insights = [];
        
        // Insight 1: Submission Timeline
        const onTimePct = totalSubmissions > 0 ? Math.round(((totalSubmissions - lateCount) / totalSubmissions) * 100) : 100;
        insights.push(`📈 ${onTimePct}% of submissions were uploaded before their deadline.`);

        // Insight 2: Highest Plagiarized Assignment
        let highestPlagiarismAssignment = 'None';
        let maxPlagiarismRate = 0;
        
        assignments.forEach(a => {
            const subForAssign = allSubmissions.filter(s => s.assignment_id && s.assignment_id._id.toString() === a._id.toString());
            const plagCount = subForAssign.filter(s => s.similarityScore >= 70).length;
            const rate = subForAssign.length > 0 ? (plagCount / subForAssign.length) * 100 : 0;
            if (rate > maxPlagiarismRate) {
                maxPlagiarismRate = rate;
                highestPlagiarismAssignment = a.title;
            }
        });

        if (maxPlagiarismRate > 0) {
            insights.push(`⚠️ "${highestPlagiarismAssignment}" has the highest critical similarity rate (${Math.round(maxPlagiarismRate)}% of submissions flagged above 70%).`);
        } else {
            insights.push(`✅ All assignments currently report 0% critical plagiarism levels.`);
        }

        // Insight 3: Upload Timeline Behavior
        let lastHourCount = 0;
        allSubmissions.forEach(sub => {
            const assignment = sub.assignment_id;
            if (assignment && assignment.deadline) {
                const timeDiff = new Date(assignment.deadline) - new Date(sub.submitted_at);
                if (timeDiff > 0 && timeDiff <= 3600000) { // Submitted within 1 hour before deadline
                    lastHourCount++;
                }
            }
        });
        if (lastHourCount > 0) {
            insights.push(`⏳ ${lastHourCount} student(s) submitted their files within the final hour before the deadline.`);
        }

        // Insight 4: Peak Plagiarism
        if (highestSimilarity > 0) {
            insights.push(`🔍 The highest similarity score detected in the entire system is ${highestSimilarity}%.`);
        }

        res.json({
            cards: {
                totalAssignments,
                totalStudents,
                totalSubmissions,
                lateSubmissions: lateCount,
                duplicateSubmissions: duplicateCount,
                pendingEvaluation: allSubmissions.filter(s => s.submissionStatus === 'Pending').length,
                averageSimilarity: totalSubmissions > 0 ? Math.round(similaritySum / totalSubmissions) : 0
            },
            timeline: timelineData,
            completionRate: completionRateData,
            similarityDistribution,
            activeStudents,
            insights
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
