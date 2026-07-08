const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    assignment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, required: true },
    encrypted_path: { type: String, required: true },
    file_hash: { type: String }, // For integrity check
    fileHash: { type: String },  // Duplicate/redundant mapping field requested by features
    similarityScore: { type: Number, default: 0 },
    duplicate: { type: Boolean, default: false },
    matchedSubmissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', default: null },
    comparisonDate: { type: Date, default: null },
    teacherViewed: { type: Boolean, default: false },
    downloadCount: { type: Number, default: 0 },
    submissionStatus: { type: String, default: 'Pending' },
    normalizedText: { type: String, default: '' },
    submitted_at: { type: Date, default: Date.now }
});

submissionSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) { delete ret._id; }
});

module.exports = mongoose.model('Submission', submissionSchema);
