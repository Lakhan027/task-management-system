'use client';

import { useState } from 'react';
import { useAddCommentMutation } from '@/services/taskApi';
import { Send } from 'lucide-react';
import { Comment } from '@/types/task';

interface TaskCommentsProps {
  taskId: string;
  comments: Comment[];
}

export default function TaskComments({ taskId, comments }: TaskCommentsProps) {
  const [text, setText] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [addComment, { isLoading }] = useAddCommentMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitError('');
    try {
      await addComment({ id: taskId, text }).unwrap();
      setText('');
    } catch (error) {
      setSubmitError('Failed to add comment. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Comments</h2>
      <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-sm">No comments yet.</p>
        ) : (
          comments.map((comment) => (
            <div key={`${comment.userId}-${comment.createdAt}`} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">User #{comment.userId}</span>
                <span className="text-sm text-gray-500">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-gray-700">{comment.text}</p>
            </div>
          ))
        )}
      </div>
      {submitError && <p className="text-sm text-red-500">{submitError}</p>}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!text.trim() || isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
