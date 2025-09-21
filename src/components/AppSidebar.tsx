import {
  Building2,
  ChevronsUpDown,
  Crown,
  LayoutDashboard,
  LineSquiggle,
  LogOut,
  MapIcon,
  MessageSquare,
  MessageSquareDot,
  Settings,
  UserRound,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import BrandMark from '@/components/BrandMark';
import UserAvatar from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ResponsiveModal,
  ResponsiveModalClose,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  dotIcon?: LucideIcon;
}

const overviewItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

const workItems: NavItem[] = [
  { to: '/workspace', label: 'Workspace', icon: Workflow },
  { to: '/organizations', label: 'Organizations', icon: Building2 },
];

const collaborateItems: NavItem[] = [
  { to: '/boards', label: 'Whiteboards', icon: LineSquiggle },
  {
    to: '/chat',
    label: 'Messages',
    icon: MessageSquare,
    dotIcon: MessageSquareDot,
  },
  { to: '/map', label: 'Locations', icon: MapIcon },
];

function NavItems({
  items,
  dots = {},
  onNavigate,
  currentPath,
}: {
  items: NavItem[];
  dots?: Record<string, boolean>;
  onNavigate: () => void;
  currentPath: string;
}) {
  return (
    <SidebarMenu className="gap-1">
      {items.map(({ to, label, icon: Icon, dotIcon: DotIcon }) => {
        const hasDot = dots[to] ?? false;
        const ActiveIcon = hasDot && DotIcon ? DotIcon : Icon;
        return (
          <SidebarMenuItem key={to} className="relative">
            <SidebarMenuButton
              asChild
              isActive={currentPath === to}
              onClick={onNavigate}
            >
              <Link to={to} data-onboarding={to.replace('/', '')}>
                <ActiveIcon />
                <span>{label}</span>
              </Link>
            </SidebarMenuButton>
            {hasDot && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-2 rounded-full bg-primary" />
            )}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export default function AppSidebar({
  dots = {},
}: {
  dots?: Record<string, boolean>;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const { user, firebaseUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleNavigate = () => isMobile && setOpenMobile(false);

  const avatarSrc = user?.avatarUrl ?? firebaseUser?.photoURL ?? undefined;
  const displayName = user?.displayName ?? user?.email ?? 'Account';
  const displaySubtitle = user?.title ?? 'Workspace';
  const isAdmin = user?.roles?.includes('admin');

  const handleLogout = async () => {
    await toast
      .promise(logout(), {
        loading: 'Logging out...',
        success: 'Logged out',
        error: 'Logout failed',
      })
      .unwrap()
      .then(() => navigate('/auth'));
  };

  return (
    <>
      <Sidebar variant="inset" collapsible="icon" className="z-50">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                size="lg"
                onClick={() => isMobile && setOpenMobile(false)}
              >
                <Link to="/dashboard" data-onboarding="welcome">
                  <BrandMark compact />
                  <span className="font-semibold">Rocket Space</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="gap-0">
          <SidebarGroup>
            <SidebarGroupLabel>Overview</SidebarGroupLabel>
            <SidebarGroupContent>
              <NavItems
                items={overviewItems}
                dots={dots}
                onNavigate={handleNavigate}
                currentPath={location.pathname}
              />
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Work</SidebarGroupLabel>
            <SidebarGroupContent>
              <NavItems
                items={workItems}
                dots={dots}
                onNavigate={handleNavigate}
                currentPath={location.pathname}
              />
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Collaborate</SidebarGroupLabel>
            <SidebarGroupContent>
              <NavItems
                items={collaborateItems}
                dots={dots}
                onNavigate={handleNavigate}
                currentPath={location.pathname}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" data-onboarding="profile">
                    <UserAvatar src={avatarSrc} name={displayName} />
                    <span className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">
                        {displayName}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {displaySubtitle}
                      </span>
                    </span>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side={isMobile ? 'bottom' : 'right'}
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <UserAvatar src={avatarSrc} name={displayName} />
                      <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">
                          {displayName}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {user?.email ?? displaySubtitle}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    asChild
                    onSelect={() =>
                      isMobile && setTimeout(() => setOpenMobile(false), 0)
                    }
                  >
                    <Link to="/profile">
                      <UserRound />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    asChild
                    onSelect={() =>
                      isMobile && setTimeout(() => setOpenMobile(false), 0)
                    }
                  >
                    <Link to="/settings">
                      <Settings />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin ? (
                    <DropdownMenuItem
                      asChild
                      onSelect={() =>
                        isMobile && setTimeout(() => setOpenMobile(false), 0)
                      }
                    >
                      <Link to="/admin">
                        <Crown />
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLogoutOpen(true)}>
                    <LogOut />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <ResponsiveModal open={logoutOpen} onOpenChange={setLogoutOpen}>
        <ResponsiveModalContent showCloseButton={false}>
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Log out?</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              Your local session token will be cleared on this device.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter>
            <ResponsiveModalClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveModalClose>
            <Button onClick={handleLogout} variant="destructive">
              Log out
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  );
}
