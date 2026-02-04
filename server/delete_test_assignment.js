const mongoose = require('mongoose');
const Assignment = require('./models/Assignment');
const Submission = require('./models/Submission'); // In case we need to cascade delete
require('dotenv').config();

const deleteAssignment = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Find ALL assignments starting with "Test Assignment"
        const assignments = await Assignment.find({ title: { $regex: /^Test Assignment/ } });

        if (assignments.length === 0) {
            console.log('No Test Assignments found');
        } else {
            console.log(`Found ${assignments.length} test assignments.`);

            for (const assignment of assignments) {
                console.log(`Deleting: ${assignment.title} (ID: ${assignment._id})`);

                // Delete associated submissions first
                const deletedSubmissions = await Submission.deleteMany({ assignment_id: assignment._id });
                console.log(`   - Deleted ${deletedSubmissions.deletedCount} submissions.`);

                // Delete the assignment
                await Assignment.findByIdAndDelete(assignment._id);
            }
            console.log('All test assignments deleted successfully.');
        }

        mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
        mongoose.connection.close();
    }
};

deleteAssignment();
