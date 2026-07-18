'use client';

import { useState } from 'react';
import { ProjectMember } from '@/types/project';
import { useAddMemberMutation, useRemoveMemberMutation } from '@/services/projectApi';
import { UserPlus, X, Users } from 'lucide-react';
import UserSearch from '@/components/common/UserSearch';

interface ProjectMembersProps {
  projectId: string;
  members: ProjectMember[];
  ownerId: number;
}

export default function ProjectMembers({ projectId, members, ownerId }: ProjectMembersProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [memberUserId, setMemberUserId] = useState<number | null>(null);
  const [role, setRole] = useState('member');
  const [addMember, { isLoading: isAdding }] = useAddMemberMutation();
  const [removeMember, { isLoading: isRemoving }] = useRemoveMemberMutation();
  const [error, setError] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberUserId) return;
    setError('');
    try {
      await addMember({ projectId, memberUserId, role }).unwrap();
      setMemberUserId(null);
      setShowAdd(false);
    } catch (error) {
      setError('Failed to add member. Please try again.');
    }
  };

  const handleRemove = async (userId: number) => {
    setError('');
    try {
      await removeMember({ projectId, memberUserId: userId }).unwrap();
    } catch (error) {
      setError('Failed to remove member. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Members ({members.length})
        </h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
          <UserSearch value={memberUserId} onChange={setMemberUserId} />
          <div className="flex gap-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              type="submit"
              disabled={!memberUserId || isAdding}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {isAdding ? 'Adding...' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

      <div className="space-y-2">
        {members.map((member) => (
          <div key={member.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold">
                U
              </div>
              <div>
                <span className="font-medium text-gray-900 text-sm">User #{member.userId}</span>
                <span className="ml-2 text-xs text-gray-500 capitalize">
                  {member.role}
                </span>
              </div>
            </div>
            <span className="text-xs text-gray-400">
              Joined {new Date(member.joinedAt).toLocaleDateString()}
            </span>
            {member.userId !== ownerId && (
              <button
                onClick={() => handleRemove(member.userId)}
                disabled={isRemoving}
                className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {members.length === 0 && (
          <p className="text-gray-500 text-sm">No members yet.</p>
        )}
      </div>
    </div>
  );
}
