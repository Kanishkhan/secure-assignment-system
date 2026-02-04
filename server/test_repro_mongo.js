const mongoose = require('mongoose');
const User = require('./models/User');
const Assignment = require('./models/Assignment');
const Submission = require('./models/Submission');
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        // 1. Create Data
        const student = await User.create({
            username: `student_${Date.now()}`,
            email: `student_${Date.now()}@test.com`,
            password: 'hashedpassword',
            role: 'student'
        });
        console.log('Student created:', student._id.toString());

        const assignment = await Assignment.create({
            title: 'Test Assignment',
            description: 'Desc',
            creator_id: student._id, // Just using student ID as creator for simplicity
            deadline: new Date(Date.now() + 86400000)
        });
        console.log('Assignment created:', assignment._id.toString());

        // 2. Simulare Submission
        // Simulating req.user.id which is a String from JWT
        const studentIdString = student._id.toString();

        const submission = await Submission.create({
            assignment_id: assignment._id,
            student_id: studentIdString, // Pass String (simulating req.user.id)
            filename: 'test.txt',
            encrypted_path: 'uploads/test.enc',
            file_hash: 'hash123'
        });
        console.log('Submission created:', submission._id.toString());
        console.log('Submission student_id type:', typeof submission.student_id, submission.student_id.constructor.name);

        // 3. Test Aggregation
        const assignmentId = assignment._id.toString(); // API receives string
        console.log('Testing Aggregation for Assignment ID:', assignmentId);

        const submissions = await Submission.aggregate([
            { $match: { assignment_id: new mongoose.Types.ObjectId(assignmentId) } },
            { $sort: { submitted_at: -1 } },
            {
                $group: {
                    _id: '$student_id',
                    latestSubmission: { $first: '$$ROOT' }
                }
            },
            { $replaceRoot: { newRoot: '$latestSubmission' } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'student_id',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            { $unwind: '$student' },
            {
                $project: {
                    _id: 1,
                    filename: 1,
                    submitted_at: 1,
                    'student.username': 1
                }
            }
        ]);

        console.log('Aggregation Results:', JSON.stringify(submissions, null, 2));

        if (submissions.length === 0) {
            console.error('AGGREGATION FAILED: No submissions found (likely lookup/unwind failure)');
        } else {
            console.log('AGGREGATION SUCCEEDED');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        // Cleanup
        // await mongoose.connection.db.dropDatabase();
        await mongoose.connection.close();
    }
};

run();
