'use client';

interface LoadingStateProps {
  message?: string;
  fullPage?: boolean;
}

export default function LoadingState({ message = 'Loading...', fullPage = false }: LoadingStateProps) {
  return (
    <div className={`flex items-center justify-center ${fullPage ? 'min-h-screen' : 'h-64'}`}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-500 text-sm">{message}</p>
      </div>
    </div>
  );
}
