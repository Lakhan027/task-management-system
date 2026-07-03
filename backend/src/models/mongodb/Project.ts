import mongoose, { Schema } from 'mongoose';
import { IProject } from '../../types/project.js';

const ProjectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    ownerId: {
      type: Number,
      required: [true, 'Project must have an owner'],
    },
    members: [
      {
        userId: { type: Number, required: true },
        role: {
          type: String,
          enum: ['admin', 'member', 'viewer'],
          default: 'member',
        },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ['active', 'archived', 'completed'],
      default: 'active',
    },
    visibility: {
      type: String,
      enum: ['public', 'private', 'team'],
      default: 'private',
    },
    startDate: { type: Date },
    endDate: { type: Date },
    tags: { type: [String], default: [] },
    customFields: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

ProjectSchema.index({ ownerId: 1 });
ProjectSchema.index({ 'members.userId': 1 });
ProjectSchema.index({ status: 1 });

export default mongoose.model<IProject>('Project', ProjectSchema);