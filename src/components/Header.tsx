import { LayoutDashboard, LogOut, Settings } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import BrandMark from '@/components/BrandMark';
import UserAvatar from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import {
  ResponsiveModal,
  ResponsiveModalClose,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from '@/components/ui/responsive-modal';
import { useAuth } from '@/hooks/use-auth';

const Header: React.FC = () => {
  const { user, firebaseUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  const handleConfirmLogout = async () => {
    await toast
      .promise(logout(), {
        loading: 'Logging out...',
        success: 'Logged out',
        error: 'Logout failed',
      })
      .unwrap()
      .then(() => {
        setLogoutOpen(false);
        navigate('/auth');
      })
      .catch(() => {});
  };

  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-5">
          <Link to="/dashboard" className="flex items-center gap-2">
            <BrandMark compact className="sm:hidden" />
            <BrandMark className="hidden sm:flex" />
          </Link>

          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              {navItems.map(({ to, label, icon: Icon }) => {
                const active = location.pathname === to;

                return (
                  <NavigationMenuItem key={to}>
                    <NavigationMenuLink asChild>
                      <Link
                        to={to}
                        className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                          active
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                      >
                        <Icon className="size-4" />
                        {label}
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden min-w-0 items-center gap-3 rounded-full border bg-card py-1 pl-1 pr-3 shadow-sm sm:flex">
            <UserAvatar
              src={user?.avatarUrl ?? firebaseUser?.photoURL}
              name={user?.displayName ?? user?.email}
              className="size-8 border shadow-sm"
            />
            <span className="max-w-44 truncate text-sm font-medium text-foreground">
              {user?.displayName ?? user?.email}
            </span>
          </div>

          <UserAvatar
            src={user?.avatarUrl ?? firebaseUser?.photoURL}
            name={user?.displayName ?? user?.email}
            className="size-9 border shadow-sm sm:hidden"
          />

          <ResponsiveModal open={logoutOpen} onOpenChange={setLogoutOpen}>
            <ResponsiveModalTrigger asChild>
              <Button variant="outline" size="sm" className="bg-card">
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </ResponsiveModalTrigger>
            <ResponsiveModalContent showCloseButton={false}>
              <ResponsiveModalHeader>
                <ResponsiveModalTitle>Confirm Logout</ResponsiveModalTitle>
                <ResponsiveModalDescription>
                  Are you sure you want to log out?
                  <br />
                  You’ll need to sign in again.
                </ResponsiveModalDescription>
              </ResponsiveModalHeader>
              <ResponsiveModalFooter>
                <ResponsiveModalClose asChild>
                  <Button variant="outline">Cancel</Button>
                </ResponsiveModalClose>
                <Button onClick={handleConfirmLogout} variant="destructive">
                  <LogOut className="size-4" />
                  Logout
                </Button>
              </ResponsiveModalFooter>
            </ResponsiveModalContent>
          </ResponsiveModal>
        </div>
      </div>
      <nav className="mx-auto mt-3 grid max-w-7xl grid-cols-4 gap-2 md:hidden">
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;

          return (
            <Link
              key={to}
              to={to}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-md text-sm font-medium transition ${
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
};

export default Header;
