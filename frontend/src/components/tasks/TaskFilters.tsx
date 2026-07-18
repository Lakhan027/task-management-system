'use client';

import { Filter, X } from 'lucide-react';

interface FilterValues {
  status: string;
  priority: string;
  search: string;
}

interface TaskFiltersProps {
  filters: FilterValues;
  onChange: (key: string, value: string) => void;
  onClear: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
}

export default function TaskFilters({ filters, onChange, onClear, showFilters, onToggleFilters }: TaskFiltersProps) {
  const hasActiveFilters = filters.status || filters.priority;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search tasks..."
            aria-label="Search tasks"
            value={filters.search}
            onChange={(e) => onChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={onToggleFilters}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
        </button>
        {(hasActiveFilters || filters.search) && (
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {showFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => onChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => onChange('priority', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
