import { useQuery } from '@tanstack/react-query';
import {
  BriefcaseBusiness,
  Building2,
  FileText,
  LocateFixed,
  Mail,
  MapPin,
  MessageSquare,
} from 'lucide-react';

import { ApiErrorAlert } from '@/components/ApiErrorAlert';
import UserAvatar from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import {
  ResponsiveModal,
  ResponsiveModalClose,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserInfo } from '@/utils/api';

interface UserProfileDrawerProps {
  userId: string | null;
  onClose: () => void;
  onMessage?: (userId: string) => void;
  onLocate?: (userId: string) => void;
  currentUserId?: string;
}

export default function UserProfileDrawer({
  userId,
  onClose,
  onMessage,
  onLocate,
  currentUserId,
}: UserProfileDrawerProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      const res = await getUserInfo(userId!);
      return res.data as {
        id: string;
        email: string;
        displayName?: string;
        avatarUrl?: string;
        bio?: string;
        title?: string;
        company?: string;
        location?: string;
        latitude?: number;
        longitude?: number;
      };
    },
    enabled: !!userId,
  });

  return (
    <ResponsiveModal
      open={!!userId}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ResponsiveModalContent
        showCloseButton={false}
        aria-describedby={undefined}
      >
        <ResponsiveModalHeader>
          <ResponsiveModalTitle className="sr-only">
            User profile
          </ResponsiveModalTitle>
        </ResponsiveModalHeader>

        {isLoading ? (
          <div className="flex flex-col items-center gap-3 px-6 pb-4 pt-0">
            <Skeleton className="size-20 rounded-full" />
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : data ? (
          <div className="flex flex-col items-center gap-3 px-6 pb-4 pt-0">
            <UserAvatar
              src={data.avatarUrl}
              name={data.displayName ?? data.email}
              className="size-20"
            />
            <div className="text-center">
              <p className="text-lg font-semibold">
                {data.displayName ?? data.email}
              </p>
              {(data.title || data.company) && (
                <p className="mt-0.5 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                  <BriefcaseBusiness className="size-4 shrink-0" />
                  {[data.title, data.company].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>

            <Separator className="w-full" />

            <div className="w-full space-y-2.5">
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Mail className="size-4 shrink-0" />
                <span className="truncate">{data.email}</span>
              </div>
              {data.location && (
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <MapPin className="size-4 shrink-0" />
                  <span className="truncate">{data.location}</span>
                </div>
              )}
              {data.company && (
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Building2 className="size-4 shrink-0" />
                  <span className="truncate">{data.company}</span>
                </div>
              )}
              {data.bio && (
                <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <FileText className="mt-0.5 size-4 shrink-0" />
                  <span>{data.bio}</span>
                </div>
              )}
            </div>
          </div>
        ) : isError ? (
          <ApiErrorAlert
            title="Failed to load profile"
            description="Could not fetch user data. Please try again."
            onRetry={() => refetch()}
          />
        ) : null}

        <ResponsiveModalFooter className="border-t md:border-t flex-wrap gap-2">
          {onLocate &&
            data?.latitude &&
            data?.longitude &&
            data?.id !== currentUserId && (
              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                  onLocate(data.id);
                }}
              >
                <LocateFixed className="size-4" />
                Locate
              </Button>
            )}
          {onMessage && data && data.id !== currentUserId && (
            <Button
              variant="outline"
              onClick={() => {
                onClose();
                onMessage(data.id);
              }}
            >
              <MessageSquare className="size-4" />
              Message
            </Button>
          )}
          <ResponsiveModalClose asChild>
            <Button variant="outline">Close</Button>
          </ResponsiveModalClose>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
