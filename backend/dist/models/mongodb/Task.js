import mongoose, { Schema } from 'mongoose';
// ──────────────────────────────────────────────
// Schema Definition
// ──────────────────────────────────────────────
const TaskSchema = new Schema({
    title: {
        type: String,
        required: [true, 'Task title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
        type: String,
        trim: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    status: {
        type: String,
        enum: ['todo', 'in-progress', 'review', 'done'],
        default: 'todo',
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
    },
    dueDate: { type: Date },
    completedAt: { type: Date },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null },
    assignedTo: { type: Number, required: [true, 'Task must be assigned to someone'] },
    createdBy: { type: Number, required: [true, 'Task must have a creator'] },
    tags: { type: [String], default: [] },
    subtasks: [
        {
            title: { type: String, required: true, trim: true },
            completed: { type: Boolean, default: false },
            completedAt: { type: Date },
        },
    ],
    comments: [
        {
            userId: { type: Number, required: true },
            text: { type: String, required: true, trim: true, maxlength: 1000 },
            createdAt: { type: Date, default: Date.now },
        },
    ],
    attachments: [
        {
            filename: { type: String, required: true },
            url: { type: String, required: true },
            fileSize: Number,
            mimeType: String,
            uploadedBy: { type: Number, required: true },
            uploadedAt: { type: Date, default: Date.now },
        },
    ],
    estimatedHours: { type: Number, min: 0, default: 0 },
    actualHours: { type: Number, min: 0, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });
// ──────────────────────────────────────────────
// Indexes
// ──────────────────────────────────────────────
TaskSchema.index({ assignedTo: 1, status: 1 });
TaskSchema.index({ createdBy: 1, createdAt: -1 });
TaskSchema.index({ dueDate: 1 });
TaskSchema.index({ projectId: 1 });
TaskSchema.index({ tags: 1 });
// ──────────────────────────────────────────────
// ✅ FIXED: Pre-save Middleware (Line 119)
// ──────────────────────────────────────────────
TaskSchema.pre('save', function () {
    if (this.isModified('status') && this.status === 'done' && !this.completedAt) {
        this.completedAt = new Date();
    }
});
// ──────────────────────────────────────────────
// Export
// ──────────────────────────────────────────────
export default mongoose.model('Task', TaskSchema);
