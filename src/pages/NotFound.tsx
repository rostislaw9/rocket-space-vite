import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';

import BrandMark from '@/components/BrandMark';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';

export default function NotFoundPage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4 sm:p-6">
      <Card className="w-full max-w-2xl overflow-hidden shadow-lg p-0">
        <CardContent className="grid gap-2 p-0 md:grid-cols-2">
          <div className="flex flex-col justify-between gap-6 border-b bg-muted/50 p-6 sm:p-8 md:border-b-0 md:border-r md:gap-0">
            <BrandMark />
            <div className="flex flex-col justify-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground sm:text-sm">
                Page not found
              </p>
              <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
                404
              </h1>
            </div>
          </div>

          <div className="flex flex-col justify-center p-6 sm:p-8">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Nothing lives at this address.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Head back to the console and continue from a known workspace
              route.
            </p>
            <div className="mt-6 sm:mt-8">
              {user ? (
                <Button asChild className="w-full sm:w-auto">
                  <Link to="/">
                    <LayoutDashboard className="size-4" />
                    Open dashboard
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link to="/auth">
                    <ArrowLeft className="size-4" />
                    Return to sign in
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
