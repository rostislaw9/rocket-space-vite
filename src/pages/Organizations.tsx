import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  UserMinus2,
  Users,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ApiErrorAlert } from '@/components/ApiErrorAlert';
import PageShell from '@/components/PageShell';
import UserAvatar from '@/components/UserAvatar';
import UserProfileDrawer from '@/components/UserProfileDrawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Label } from '@/components/ui/label';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePreferences } from '@/hooks/use-preferences';
import { useWorkspaceContext } from '@/hooks/use-workspace-context';
import {
  addOrganizationMember,
  createOrganization,
  deleteOrganization,
  getOrganizationMembers,
  getOrganizations,
  removeOrganizationMember,
  searchUsers,
  updateOrganization,
  updateOrganizationMember,
  type Organization,
  type OrganizationMember,
  type OrganizationRole,
  type User,
} from '@/utils/api';

const roleLabels: Record<OrganizationRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
};

export default function OrganizationsPage() {
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const { selectedOrgId, setContext, validateContext } = useWorkspaceContext();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const organizationsKey = ['organizations', user?.id] as const;

  const {
    data: organizations = [],
    isLoading: loading,
    isError,
    refetch,
  } = useQuery<Organization[]>({
    queryKey: organizationsKey,
    queryFn: async () => {
      const res = await getOrganizations(user!.id);
      return res.data as Organization[];
    },
    enabled: !!user,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!organizations.length) {
      validateContext([]);
      return;
    }
    validateContext(organizations.map((o) => o.id));
  }, [organizations, loading, validateContext]);

  // Sync selectedId: keep current selection if still valid, otherwise fall back to selectedOrgId or first org.
  useEffect(() => {
    if (!organizations.length) {
      setSelectedId(null);
      return;
    }
    const validOrg = organizations.find((o) => o.id === selectedOrgId);
    setSelectedId((current) => {
      if (current && organizations.find((o) => o.id === current)) {
        return current;
      }
      if (validOrg) return validOrg.id;
      return organizations[0]?.id ?? null;
    });
  }, [organizations, selectedOrgId]);
  const membersKey = useMemo(
    () => ['organization-members', selectedId, user?.id] as const,
    [selectedId, user?.id],
  );

  const {
    data: members = [],
    isLoading: membersLoading,
    isError: membersError,
    refetch: refetchMembers,
  } = useQuery<OrganizationMember[]>({
    queryKey: membersKey,
    queryFn: async () => {
      if (!user || !selectedId) return [];
      const res = await getOrganizationMembers(user.id, selectedId);
      return res.data as OrganizationMember[];
    },
    enabled: !!user && !!selectedId,
  });

  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingOrganization, setEditingOrganization] =
    useState<Organization | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null);
  const [removeMemberTarget, setRemoveMemberTarget] =
    useState<OrganizationMember | null>(null);
  const [removingMember, setRemovingMember] = useState(false);
  const [orgForm, setOrgForm] = useState({ name: '', description: '' });
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('member');
  const [searchResults, setSearchResults] = useState<
    { id: string; email: string; displayName?: string; avatarUrl?: string }[]
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    email: string;
    displayName?: string;
  } | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === selectedId),
    [organizations, selectedId],
  );

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const handleSearchChange = (value: string) => {
    setInviteQuery(value);
    setSelectedUser(null);
    setSearchOpen(value.length >= 2);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (value.length < 2) {
      setSearchResults([]);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await searchUsers(value);
        const users = res.data as User[];
        const memberUserIds = new Set(members.map((m) => m.userId));
        setSearchResults(users.filter((u) => !memberUserIds.has(u.id)));
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  const handleSelectUser = (u: {
    id: string;
    email: string;
    displayName?: string;
  }) => {
    setSelectedUser(u);
    setInviteQuery(u.email);
    setSearchOpen(false);
  };

  const getCurrentRole = (organization: Organization) =>
    organization.ownerId === user?.id
      ? 'owner'
      : organization.members?.find((member) => member.userId === user?.id)
          ?.role;

  const canManageOrganization = (organization: Organization) => {
    const role = getCurrentRole(organization);
    return role === 'owner' || role === 'admin';
  };

  const canDeleteOrganization = (organization: Organization) =>
    getCurrentRole(organization) === 'owner';

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await createOrganization(user!.id, {
        name: orgForm.name.trim(),
        description: orgForm.description.trim(),
      });
      return res.data;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: organizationsKey });
      setSelectedId(created.id);
      setOrgForm({ name: '', description: '' });
      setCreateOpen(false);
      toast.success('Organization created');
    },
    onError: () => toast.error('Could not create organization'),
    onSettled: () => setCreating(false),
  });

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!user || !orgForm.name.trim()) return;
    setCreating(true);
    createMutation.mutate();
  };

  const openEditOrganization = (organization: Organization) => {
    setEditingOrganization(organization);
    setEditForm({
      name: organization.name,
      description: organization.description ?? '',
    });
    setEditOpen(true);
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await updateOrganization(user!.id, editingOrganization!.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
      });
      return res.data as Organization;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationsKey });
      setEditingOrganization(null);
      setEditForm({ name: '', description: '' });
      setEditOpen(false);
      toast.success('Organization updated');
    },
    onError: () => toast.error('Could not update organization'),
    onSettled: () => setUpdating(false),
  });

  const handleUpdate = (event: FormEvent) => {
    event.preventDefault();
    if (!user || !editingOrganization || !editForm.name.trim()) return;
    setUpdating(true);
    updateMutation.mutate();
  };

  const deleteMutation = useMutation({
    mutationFn: async (org: Organization) => {
      await deleteOrganization(user!.id, org.id);
      return org.id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: organizationsKey });
      if (selectedOrgId === deletedId) {
        // clear context if the deleted org was active
        setContext(undefined);
      }
      toast.success('Organization deleted');
    },
    onError: () => toast.error('Could not delete organization'),
    onSettled: () => setDeleting(false),
  });

  const executeDelete = (org: Organization) => {
    if (!user) return;
    setDeleting(true);
    deleteMutation.mutate(org);
  };

  const handleConfirmDelete = async (org?: Organization) => {
    const target = org ?? deleteTarget;
    if (!target) return;
    await executeDelete(target);
    setDeleteTarget(null);
  };

  const confirmDelete = () => handleConfirmDelete();

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !selectedOrganization || !selectedUser) return;

    setInviting(true);
    try {
      await addOrganizationMember(user.id, selectedOrganization.id, {
        email: selectedUser.email,
        role: inviteRole,
      });
      queryClient.invalidateQueries({ queryKey: membersKey });
      setInviteQuery('');
      setInviteRole('member');
      setSelectedUser(null);
      setSearchResults([]);
      toast.success('Member added');
    } catch (err: unknown) {
      const msg = (
        err as { response?: { data?: { error?: { message?: string } } } }
      )?.response?.data?.error?.message;
      toast.error(msg ?? 'Could not add member');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (
    member: OrganizationMember,
    role: OrganizationRole,
  ) => {
    if (!user || !selectedOrganization) return;
    try {
      const res = await updateOrganizationMember(
        user.id,
        selectedOrganization.id,
        member.id,
        role,
      );
      const updated = res.data;
      queryClient.setQueryData(
        membersKey,
        (old: OrganizationMember[] | undefined) =>
          old?.map((m) =>
            m.id === member.id ? { ...m, role: updated.role } : m,
          ) ?? [],
      );
      toast.success('Role updated');
    } catch {
      toast.error('Could not update role');
    }
  };

  const executeRemoveMember = async (member: OrganizationMember) => {
    if (!user || !selectedOrganization) return;
    setRemovingMember(true);
    try {
      await removeOrganizationMember(
        user.id,
        selectedOrganization.id,
        member.id,
      );
      queryClient.invalidateQueries({ queryKey: membersKey });
      toast.success('Member removed');
    } catch {
      toast.error('Could not remove member');
    } finally {
      setRemovingMember(false);
    }
  };

  const handleConfirmRemoveMember = async (member?: OrganizationMember) => {
    const target = member ?? removeMemberTarget;
    if (!target) return;
    await executeRemoveMember(target);
    setRemoveMemberTarget(null);
  };

  const confirmRemoveMember = () => handleConfirmRemoveMember();

  if (!user) return null;

  return (
    <PageShell
      title="Organizations"
      description="Model multi-tenant access, team membership, and scoped collaboration"
      actions={
        <ResponsiveModal open={createOpen} onOpenChange={setCreateOpen}>
          <ResponsiveModalTrigger asChild>
            <Button>
              <Plus className="size-4" />
              New organization
            </Button>
          </ResponsiveModalTrigger>
          <ResponsiveModalContent showCloseButton={false}>
            <form onSubmit={handleCreate} className="space-y-4">
              <ResponsiveModalHeader className="border-b md:border-0">
                <ResponsiveModalTitle className="text-xl">
                  Create organization
                </ResponsiveModalTitle>
                <ResponsiveModalDescription>
                  Set up a new workspace for your team.
                </ResponsiveModalDescription>
              </ResponsiveModalHeader>
              <div className="space-y-4 p-4 md:p-0">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Name</Label>
                  <Input
                    id="org-name"
                    value={orgForm.name}
                    onChange={(event) =>
                      setOrgForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-description">Description</Label>
                  <Textarea
                    id="org-description"
                    value={orgForm.description}
                    onChange={(event) =>
                      setOrgForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <ResponsiveModalFooter className="border-t md:border-t">
                <ResponsiveModalClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </ResponsiveModalClose>
                <Button type="submit" disabled={creating}>
                  Create
                </Button>
              </ResponsiveModalFooter>
            </form>
          </ResponsiveModalContent>
        </ResponsiveModal>
      }
    >
      {isError ? (
        <ApiErrorAlert
          title="Failed to load organizations"
          description="Could not fetch organizations. Please try again."
          onRetry={() => refetch()}
        />
      ) : loading ? (
        <Skeleton className="h-15" />
      ) : organizations.length ? (
        <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="size-4" />
                Workspaces
              </CardTitle>
            </CardHeader>
            <CardContent className="pr-1">
              <ScrollArea className="pr-3 [&>[data-slot=scroll-area-viewport]]:max-h-64 lg:[&>[data-slot=scroll-area-viewport]]:max-h-[calc(100vh-16rem)]">
                <ItemGroup>
                  {organizations.map((organization) => {
                    const canManage = canManageOrganization(organization);
                    const canDelete = canDeleteOrganization(organization);

                    const isSelected = selectedId === organization.id;

                    return (
                      <Item
                        key={organization.id}
                        variant={isSelected ? 'muted' : 'outline'}
                        className={`cursor-pointer items-start hover:border-neutral-400 ${isSelected ? 'border-neutral-400' : ''}`}
                        onClick={() => setSelectedId(organization.id)}
                      >
                        <ItemContent>
                          <ItemTitle>{organization.name}</ItemTitle>
                          <ItemDescription>
                            {organization.description || 'No description yet.'}
                          </ItemDescription>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <Badge variant="secondary">
                              {organization.members?.length ?? 1} member
                              {(organization.members?.length ?? 1) === 1
                                ? ''
                                : 's'}
                            </Badge>
                            <Badge variant="outline">
                              {
                                roleLabels[
                                  getCurrentRole(organization) ?? 'member'
                                ]
                              }
                            </Badge>
                          </div>
                        </ItemContent>
                        {canManage || canDelete ? (
                          <ItemActions onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canManage ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      openEditOrganization(organization)
                                    }
                                  >
                                    <Pencil />
                                    Edit
                                  </DropdownMenuItem>
                                ) : null}
                                {canDelete ? (
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => {
                                      if (
                                        preferences.confirmDestructiveActions
                                      ) {
                                        setDeleteTarget(organization);
                                      } else {
                                        void handleConfirmDelete(organization);
                                      }
                                    }}
                                  >
                                    <Trash2 />
                                    Delete
                                  </DropdownMenuItem>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </ItemActions>
                        ) : null}
                      </Item>
                    );
                  })}
                </ItemGroup>
              </ScrollArea>
            </CardContent>
          </Card>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="size-4" />
                    Members
                  </span>
                  {selectedOrganization ? (
                    <span className="flex items-center gap-2">
                      <Badge variant="outline">
                        {selectedOrganization.name}
                      </Badge>
                      {canManageOrganization(selectedOrganization) ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            openEditOrganization(selectedOrganization)
                          }
                          aria-label="Edit organization"
                        >
                          <Pencil />
                        </Button>
                      ) : null}
                      {canDeleteOrganization(selectedOrganization) ? (
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => {
                            if (preferences.confirmDestructiveActions) {
                              setDeleteTarget(selectedOrganization);
                            } else {
                              void handleConfirmDelete(selectedOrganization);
                            }
                          }}
                          aria-label="Delete organization"
                        >
                          <Trash2 />
                        </Button>
                      ) : null}
                    </span>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="pr-1">
                {selectedOrganization &&
                canManageOrganization(selectedOrganization) ? (
                  <form onSubmit={handleInvite} className="mb-4 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          placeholder="Search by email..."
                          value={inviteQuery}
                          autoComplete="off"
                          onChange={(e) => handleSearchChange(e.target.value)}
                          onFocus={() =>
                            inviteQuery.length >= 2 && setSearchOpen(true)
                          }
                          onBlur={() =>
                            setTimeout(() => setSearchOpen(false), 150)
                          }
                        />
                        {searchOpen && (
                          <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-md border bg-popover shadow-md">
                            {searchLoading ? (
                              <Item>
                                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                                <ItemContent>
                                  <ItemDescription>
                                    Searching...
                                  </ItemDescription>
                                </ItemContent>
                              </Item>
                            ) : searchResults.length ? (
                              searchResults.map((u) => (
                                <Item
                                  key={u.id}
                                  className="mx-1 my-1 p-1 w-auto cursor-pointer hover:bg-accent"
                                  onMouseDown={() => handleSelectUser(u)}
                                >
                                  <ItemMedia variant="image">
                                    <UserAvatar
                                      src={u.avatarUrl}
                                      name={u.displayName ?? u.email}
                                    />
                                  </ItemMedia>
                                  <ItemContent>
                                    {u.displayName && (
                                      <ItemTitle>{u.displayName}</ItemTitle>
                                    )}
                                    <ItemDescription>{u.email}</ItemDescription>
                                  </ItemContent>
                                </Item>
                              ))
                            ) : (
                              <Item>
                                <ItemContent>
                                  <ItemDescription>
                                    No users found
                                  </ItemDescription>
                                </ItemContent>
                              </Item>
                            )}
                          </div>
                        )}
                      </div>
                      <Select
                        value={inviteRole}
                        onValueChange={(v: OrganizationRole) =>
                          setInviteRole(v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Role</SelectLabel>
                            {Object.entries(roleLabels)
                              .filter(([v]) => v !== 'owner')
                              .map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <Button
                        type="submit"
                        disabled={inviting || !selectedUser}
                      >
                        <Plus />
                        Add
                      </Button>
                    </div>
                  </form>
                ) : null}

                {membersLoading ? (
                  <Skeleton className="h-16 mr-3" />
                ) : membersError ? (
                  <div className="mr-3">
                    <ApiErrorAlert
                      title="Failed to load members"
                      description="Could not load organization members. Please try again."
                      onRetry={refetchMembers}
                    />
                  </div>
                ) : !members.length ? (
                  <Empty className="py-8">
                    <EmptyMedia>
                      <Users className="size-10 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyContent>
                      <EmptyTitle>No members yet</EmptyTitle>
                      <EmptyDescription>
                        Add members to start collaborating
                      </EmptyDescription>
                    </EmptyContent>
                  </Empty>
                ) : (
                  <ScrollArea className="pr-3 lg:[&>[data-slot=scroll-area-viewport]]:max-h-[calc(100vh-20rem)]">
                    <ItemGroup>
                      {members.map((member) => {
                        const displayName =
                          member.user?.displayName ??
                          member.user?.email ??
                          'User';

                        return (
                          <Item key={member.id} variant="outline">
                            <ItemMedia
                              variant="image"
                              className="cursor-pointer"
                              onClick={() =>
                                member.userId && setProfileUserId(member.userId)
                              }
                              aria-label="View profile"
                            >
                              <UserAvatar
                                src={member.user?.avatarUrl}
                                name={displayName}
                              />
                            </ItemMedia>
                            <ItemContent>
                              <ItemTitle>{displayName}</ItemTitle>
                              <ItemDescription>
                                {member.user?.email ?? member.userId}
                              </ItemDescription>
                            </ItemContent>
                            <ItemActions>
                              {selectedOrganization &&
                              canManageOrganization(selectedOrganization) &&
                              member.role !== 'owner' ? (
                                <div className="flex flex-col md:flex-row gap-1 items-end">
                                  <Select
                                    value={member.role}
                                    onValueChange={(v: OrganizationRole) =>
                                      handleRoleChange(member, v)
                                    }
                                  >
                                    <SelectTrigger size="sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectGroup>
                                        <SelectLabel>Role</SelectLabel>
                                        {Object.entries(roleLabels)
                                          .filter(([v]) => v !== 'owner')
                                          .map(([value, label]) => (
                                            <SelectItem
                                              key={value}
                                              value={value}
                                            >
                                              {label}
                                            </SelectItem>
                                          ))}
                                      </SelectGroup>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="destructive"
                                    // size="icon-sm"
                                    size={isMobile ? 'default' : 'icon-sm'}
                                    onClick={() => {
                                      if (
                                        preferences.confirmDestructiveActions
                                      ) {
                                        setRemoveMemberTarget(member);
                                      } else {
                                        void handleConfirmRemoveMember(member);
                                      }
                                    }}
                                    aria-label="Remove member"
                                  >
                                    <UserMinus2 />
                                    <span className="inline md:hidden">
                                      Remove
                                    </span>
                                  </Button>
                                </div>
                              ) : (
                                <Badge
                                  variant={
                                    member.role === 'owner'
                                      ? 'default'
                                      : 'secondary'
                                  }
                                >
                                  {roleLabels[member.role]}
                                </Badge>
                              )}
                            </ItemActions>
                          </Item>
                        );
                      })}
                    </ItemGroup>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyTitle>Create your first organization</EmptyTitle>
            <EmptyDescription>
              Organizations demonstrate multi-tenant ownership, membership
              roles, and scoped collaboration.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus />
              New organization
            </Button>
          </EmptyContent>
        </Empty>
      )}

      <ResponsiveModal
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditingOrganization(null);
            setEditForm({ name: '', description: '' });
          }
        }}
      >
        <ResponsiveModalContent showCloseButton={false}>
          <form onSubmit={handleUpdate} className="space-y-4">
            <ResponsiveModalHeader className="border-b md:border-0">
              <ResponsiveModalTitle className="text-xl">
                Edit organization
              </ResponsiveModalTitle>
              <ResponsiveModalDescription>
                Rename the workspace or refresh the short description shown to
                members.
              </ResponsiveModalDescription>
            </ResponsiveModalHeader>
            <div className="space-y-4 p-4 md:p-0">
              <div className="space-y-2">
                <Label htmlFor="edit-org-name">Name</Label>
                <Input
                  id="edit-org-name"
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-org-description">Description</Label>
                <Textarea
                  id="edit-org-description"
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <ResponsiveModalFooter className="border-t md:border-t">
              <ResponsiveModalClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </ResponsiveModalClose>
              <Button type="submit" disabled={updating}>
                Save changes
              </Button>
            </ResponsiveModalFooter>
          </form>
        </ResponsiveModalContent>
      </ResponsiveModal>

      <ResponsiveModal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <ResponsiveModalContent showCloseButton={false}>
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Delete organization?</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              This removes the organization and its memberships. Existing users
              will keep their accounts.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter>
            <ResponsiveModalClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </ResponsiveModalClose>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              Delete
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>

      <ResponsiveModal
        open={Boolean(removeMemberTarget)}
        onOpenChange={(open) => {
          if (!open) setRemoveMemberTarget(null);
        }}
      >
        <ResponsiveModalContent showCloseButton={false}>
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Remove member?</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              {removeMemberTarget
                ? `Remove ${removeMemberTarget.user?.displayName ?? removeMemberTarget.user?.email ?? 'this user'} from the organization?`
                : ''}
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter>
            <ResponsiveModalClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </ResponsiveModalClose>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmRemoveMember}
              disabled={removingMember}
            >
              Remove
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>

      <UserProfileDrawer
        userId={profileUserId}
        onClose={() => setProfileUserId(null)}
        onMessage={(id) => navigate(`/chat?peer=${id}`)}
        onLocate={(id) => navigate(`/map?user=${id}`)}
        currentUserId={user?.id}
      />
    </PageShell>
  );
}
