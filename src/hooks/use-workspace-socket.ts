import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';

export function useWorkspaceSocket(
  userId: string | undefined,
  orgIds: string[] = [],
) {
  const queryClient = useQueryClient();

  const orgIdsKey = useMemo(() => JSON.stringify(orgIds), [orgIds]);

  useEffect(() => {
    if (!userId) return;

    const parsedOrgIds: string[] = JSON.parse(orgIdsKey);

    const s = io(`${import.meta.env.VITE_API_BASE_URL}/workspace`, {
      auth: {
        userId,
        orgIds: parsedOrgIds,
        token: localStorage.getItem('token'),
      },
      transports: ['websocket'],
      autoConnect: true,
    });

    const invalidateWorkItems = (payload?: { organizationId?: string }) => {
      const orgId = payload?.organizationId;
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: ['workItems', orgId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['workItems', userId] });
      }
    };

    const invalidateComments = (payload: { workItemId?: string }) => {
      if (payload?.workItemId) {
        queryClient.invalidateQueries({
          queryKey: ['comments', payload.workItemId],
        });
      }
    };

    s.on('workItem:created', invalidateWorkItems);
    s.on('workItem:updated', invalidateWorkItems);
    s.on('workItem:deleted', invalidateWorkItems);
    s.on('comment:created', invalidateComments);
    s.on('comment:updated', invalidateComments);
    s.on('comment:deleted', invalidateComments);

    return () => {
      s.disconnect();
    };
  }, [userId, orgIdsKey, queryClient]);
}
