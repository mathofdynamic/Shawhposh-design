import React, { useState } from 'react';

export interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  roleTag?: string;
  isOnline?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = 'md',
  roleTag,
  isOnline,
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  // Extract initials (first letter of first and last name in Persian or English)
  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2);
    return `${parts[0][0] || ''}${parts[1][0] || ''}`;
  };

  const sizeClasses: Record<string, { box: string; text: string }> = {
    sm: { box: 'w-7 h-7', text: 'text-[10px]' },
    md: { box: 'w-9 h-9', text: 'text-xs' },
    lg: { box: 'w-12 h-12', text: 'text-sm' },
  };

  return (
    <div className={`relative inline-flex items-center shrink-0 ${className}`}>
      <div
        className={`${sizeClasses[size].box} rounded-full overflow-hidden bg-[#24211e] border border-white/10 flex items-center justify-center font-bold text-gray-300 select-none shadow-sm`}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className={`${sizeClasses[size].text} tracking-tighter text-[#eed29d]`}>
            {getInitials(name)}
          </span>
        )}
      </div>

      {isOnline !== undefined && (
        <span
          className={`absolute bottom-0 left-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#131211] ${
            isOnline ? 'bg-emerald-400' : 'bg-gray-500'
          }`}
          title={isOnline ? 'برخط' : 'آفلاین'}
        />
      )}

      {roleTag && (
        <span className="sr-only">
          نقش: {roleTag}
        </span>
      )}
    </div>
  );
};
