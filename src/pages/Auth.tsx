import { LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import BrandMark from '@/components/BrandMark';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';

const AuthPage: React.FC = () => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogle = async () => {
    setLoading(true);
    await toast
      .promise(login(), {
        loading: 'Signing in with Google...',
        success: 'Signed in successfully!',
        error: {
          message: 'Sign-in failed',
          description: 'Please try again later.',
        },
      })
      .unwrap()
      .then(() => {
        navigate('/');
      })
      .catch((e) => {
        console.error('Sign-in error:', e);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4 sm:p-6">
      <Card className="w-full max-w-2xl overflow-hidden shadow-lg p-0">
        <CardContent className="grid gap-2 p-0 md:grid-cols-2">
          <div className="flex flex-col justify-between gap-6 border-b bg-muted/50 p-6 sm:p-8 md:border-b-0 md:border-r md:gap-0">
            <BrandMark />
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Welcome
            </h1>
          </div>

          <div className="flex flex-col justify-center p-6 sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Continue with Google
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Sign in to manage your profile, work items, and collaborate in
              real time.
            </p>
            <div className="mt-6 sm:mt-8">
              <Button
                className="w-full sm:w-auto"
                onClick={handleGoogle}
                disabled={loading}
              >
                <LockKeyhole className="size-4" />
                {loading ? 'Signing in...' : 'Sign in with Google'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
