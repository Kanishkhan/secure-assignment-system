const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    assignment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, required: true },
    encrypted_path: { type: String, required: true },
    file_hash: { type: String }, // For integrity check
    submitted_at: { type: Date, default: Date.now }
});

submissionSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) { delete ret._id; }
});

module.exports = mongoose.model('Submission', submissionSchema);
