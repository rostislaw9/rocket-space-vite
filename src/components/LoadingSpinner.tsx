import React from 'react';

import { Spinner } from '@/components/ui/spinner';

const LoadingSpinner: React.FC<{ size?: number }> = ({ size = 48 }) => {
  return (
    <div className="flex min-h-[260px] w-full items-center justify-center">
      <Spinner style={{ width: size, height: size }} />
    </div>
  );
};

export default LoadingSpinner;
