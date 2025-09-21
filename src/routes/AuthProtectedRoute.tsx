import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import AppSidebar from '@/components/AppSidebar';
import CommandPalette from '@/components/CommandPalette';
import LoadingSpinner from '@/components/LoadingSpinner';
import { OnboardingDialog } from '@/components/OnboardingDialog';
import ServerErrorFrame from '@/components/ServerErrorFrame';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { ChatUnreadContext } from '@/contexts/chat-unread-context';
import { useAuth } from '@/hooks/use-auth';
import { useBreadCrumbs } from '@/hooks/use-breadcrumbs';
import { useChatNotifications } from '@/hooks/use-chat-notifications';
import { useIsMobile } from '@/hooks/use-mobile';
import { isOnboardingDone } from '@/utils/onboarding';

function OnboardingGate() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (
      user &&
      !isOnboardingDone() &&
      !sessionStorage.getItem('onboarding_dismissed')
    ) {
      setOpen(true);
    }
  }, [user]);

  return <OnboardingDialog open={open} onClose={() => setOpen(false)} />;
}

const AuthProtectedRoute: React.FC<{
  children: React.ReactNode;
  noShell?: boolean;
}> = ({ children, noShell = false }) => {
  const { firebaseUser, user, loading, error, refreshProfile, clearError } =
    useAuth();
  const { crumbs } = useBreadCrumbs();
  const isMobile = useIsMobile();
  const [activePeerId, setActivePeerId] = useState<string | null>(null);
  const { hasUnread, clearUnread } = useChatNotifications(
    user?.id,
    activePeerId,
  );

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

  if (!firebaseUser) return <Navigate to="/auth" replace />;

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (noShell) return <>{children}</>;

  return (
    <ChatUnreadContext.Provider
      value={{ clearUnread, activePeerId, setActivePeerId }}
    >
      <SidebarProvider>
        <AppSidebar dots={{ '/chat': hasUnread }} />
        <SidebarInset className="min-w-0 overflow-x-hidden">
          <header
            className={`top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95
            backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height]
            ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12
            ${isMobile ? 'fixed inset-x-0' : 'sticky'}`}
          >
            <div className="flex w-full items-center gap-2 px-4">
              <SidebarTrigger data-onboarding="sidebar-trigger" />
              <Separator orientation="vertical" className="mr-2" />
              <Breadcrumb>
                <BreadcrumbList>
                  {crumbs.map((crumb, i) => {
                    const isLast = i === crumbs.length - 1;
                    return (
                      <React.Fragment
                        key={`${crumb.path ?? ''}-${crumb.label}`}
                      >
                        {i > 0 && <BreadcrumbSeparator />}
                        <BreadcrumbItem>
                          {isLast || !crumb.path ? (
                            <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink asChild>
                              <Link to={crumb.path}>{crumb.label}</Link>
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </React.Fragment>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>
              <div className="ml-auto hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
                <span>Search</span>
                <KbdGroup>
                  <Kbd>⌘</Kbd>
                  <Kbd>K</Kbd>
                </KbdGroup>
              </div>
            </div>
          </header>
          <main
            className={`flex min-h-0 flex-1 flex-col overflow-hidden p-4 pt-4 ${isMobile ? 'pt-20' : ''}`}
          >
            {children}
          </main>
          <CommandPalette />
        </SidebarInset>
        <OnboardingGate />
      </SidebarProvider>
    </ChatUnreadContext.Provider>
  );
};

export default AuthProtectedRoute;
