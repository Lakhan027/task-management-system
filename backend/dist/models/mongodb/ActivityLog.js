import mongoose, { Schema } from 'mongoose';
const ActivityLogSchema = new Schema({
    userId: { type: Number, required: true },
    action: {
        type: String,
        enum: ['create', 'update', 'delete', 'assign', 'comment', 'status_change', 'complete'],
        required: true,
    },
    resourceType: {
        type: String,
        enum: ['task', 'project', 'comment', 'subtask'],
        required: true,
    },
    resourceId: { type: String, required: true },
    changes: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now },
}, { timestamps: false });
ActivityLogSchema.index({ userId: 1, timestamp: -1 });
ActivityLogSchema.index({ resourceType: 1, resourceId: 1 });
ActivityLogSchema.index({ action: 1, timestamp: -1 });
export default mongoose.model('ActivityLog', ActivityLogSchema);
