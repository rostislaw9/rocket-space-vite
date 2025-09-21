import React from 'react';
import { Navigate } from 'react-router-dom';

import LoadingSpinner from '@/components/LoadingSpinner';
import ServerErrorFrame from '@/components/ServerErrorFrame';
import { useAuth } from '@/hooks/use-auth';

const AuthRedirectRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { firebaseUser, user, loading, error, refreshProfile, clearError } =
    useAuth();

  const handleRetry = () => {
    clearError();
    refreshProfile();
  };

  if (error) return <ServerErrorFrame onRetry={handleRetry} />;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (firebaseUser && user) return <Navigate to="/" replace />;

  if (firebaseUser && !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthRedirectRoute;
