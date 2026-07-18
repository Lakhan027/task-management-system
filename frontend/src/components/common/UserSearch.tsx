'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Check } from 'lucide-react';

interface UserResult {
  id: number;
  name: string;
  email: string;
}

interface UserSearchProps {
  value: number | null;
  onChange: (userId: number | null) => void;
  error?: string;
}

const MOCK_USERS: UserResult[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  { id: 3, name: 'Bob Wilson', email: 'bob@example.com' },
  { id: 4, name: 'Alice Brown', email: 'alice@example.com' },
];

export default function UserSearch({ value, onChange, error }: UserSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<UserResult[]>([]);
  const [selected, setSelected] = useState<UserResult | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const user = MOCK_USERS.find((u) => u.id === value);
      if (user) setSelected(user);
    }
  }, [value]);

  useEffect(() => {
    if (query.length > 0) {
      const filtered = MOCK_USERS.filter(
        (u) =>
          u.name.toLowerCase().includes(query.toLowerCase()) ||
          u.email.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
    } else {
      setResults([]);
    }
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (user: UserResult) => {
    setSelected(user);
    onChange(user.id);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelected(null);
    onChange(null);
    setQuery('');
  };

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Assigned To <span className="text-red-500">*</span>
      </label>
      {selected ? (
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold">
              {selected.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{selected.name}</p>
              <p className="text-xs text-gray-500">{selected.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-200'
            }`}
          />
        </div>
      )}
      {isOpen && results.length > 0 && !selected && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {results.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => handleSelect(user)}
              className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-semibold">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">#{user.id} - {user.email}</p>
              </div>
              {value === user.id && <Check className="w-4 h-4 text-blue-600" />}
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
