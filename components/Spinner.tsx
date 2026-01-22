import React from 'react';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface SpinnerProps {
  size?: SpinnerSize;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'lg' }) => {
  const sizeClasses: Record<SpinnerSize, string> = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-16 h-16 border-4',
  };

  return (
    <div className={`${sizeClasses[size]} border-slate-400 border-t-blue-500 rounded-full animate-spin`}></div>
  );
};