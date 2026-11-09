import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

export interface UserAvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  overrideSrc?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps['size']>, string> = {
  xs: 'w-6 h-6 text-[10px] rounded-md',
  sm: 'w-7 h-7 text-xs rounded-lg',
  md: 'w-10 h-10 text-sm rounded-xl',
  lg: 'w-16 h-16 text-xl rounded-2xl',
  xl: 'w-20 h-20 text-2xl rounded-2xl',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  size = 'sm',
  overrideSrc,
  firstName,
  lastName,
  email,
  className,
}) => {
  const { user, profilePhotoBlobUrl } = useAuth();
  const [imageError, setImageError] = useState(false);

  const effFirst = firstName !== undefined ? firstName : user?.firstName;
  const effLast = lastName !== undefined ? lastName : user?.lastName;
  const effEmail = email !== undefined ? email : user?.email;

  const initials =
    [effFirst?.[0], effLast?.[0]].filter(Boolean).join('').toUpperCase() ||
    effEmail?.[0]?.toUpperCase() ||
    'U';

  const photoUrl =
    overrideSrc !== undefined ? overrideSrc : profilePhotoBlobUrl;

  if (photoUrl && !imageError) {
    return (
      <img
        src={photoUrl}
        alt={[effFirst, effLast].filter(Boolean).join(' ') || 'User avatar'}
        onError={() => setImageError(true)}
        className={cn(
          'object-cover border border-indigo-200/80 bg-indigo-50 shrink-0',
          SIZE_CLASSES[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 select-none',
        SIZE_CLASSES[size],
        className
      )}
    >
      {initials}
    </div>
  );
};
