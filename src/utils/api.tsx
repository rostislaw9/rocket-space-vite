import type { ApiAxiosResponse } from './request';
import { send } from './request';
export type { ApiAxiosResponse, ApiResponseMeta } from './request';

export interface UpdateUserInfoPayload {
  displayName: string;
  avatarUrl?: string | null;
  bio?: string;
  title?: string;
  company?: string;
  location?: string;
}

export type WorkItemStatus = 'todo' | 'in_progress' | 'done';
export type WorkItemPriority = 'low' | 'medium' | 'high';

export type ActivityType =
  | 'comment_created'
  | 'comment_deleted'
  | 'organization_created'
  | 'organization_updated'
  | 'organization_deleted'
  | 'organization_member_added'
  | 'work_item_created'
  | 'work_item_updated'
  | 'work_item_deleted'
  | 'work_item_status_changed'
  | 'profile_updated'
  | 'user_login';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  title?: string;
  company?: string;
  latitude?: number;
  longitude?: number;
  locationText?: string;
  locationPrivacy?: 'hidden' | 'organizations' | 'public';
  firebaseUID?: string;
  roles?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  userId: string;
  type: ActivityType;
  workItemId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface WorkItem {
  id: string;
  ownerId: string;
  organizationId?: string;
  assigneeId?: string;
  assignee?: {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
  };
  title: string;
  description?: string;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type OrganizationRole = 'owner' | 'admin' | 'member';

export interface WorkItemComment {
  id: string;
  workItemId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  members?: OrganizationMember[];
}

export interface WorkItemPayload {
  title: string;
  description?: string;
  status?: WorkItemStatus;
  priority?: WorkItemPriority;
  dueDate?: string | null;
  assigneeId?: string | null;
}

export interface AdminUserStats {
  user: {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
    roles: string[];
    createdAt: string;
  };
  workItemCount: number;
  completedCount: number;
}

export const getOrCreateUser = async (
  email: string,
  firebaseUID: string,
  token: string,
  displayName: string | null,
): Promise<ApiAxiosResponse<User>> => {
  return send<User>({
    method: 'POST',
    url: '/users/get-or-create',
    body: { email, firebaseUID, displayName },
    headers: { Authorization: `Bearer ${token}` },
    withAuth: false,
  });
};

export const getUserInfo = async (
  userId: string,
): Promise<ApiAxiosResponse<User>> => {
  return send<User>({
    method: 'GET',
    url: `/users/${userId}`,
    withAuth: true,
  });
};

export const getMapUsers = async (
  userId: string,
): Promise<ApiAxiosResponse<User[]>> => {
  return send<User[]>({
    method: 'GET',
    url: `/users/${userId}/map-users`,
    withAuth: true,
  });
};

export const updateUserInfo = async (
  userId: string,
  payload: UpdateUserInfoPayload,
) => {
  const body = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );

  return send({
    method: 'PATCH',
    url: `/users/${userId}`,
    body,
    withAuth: true,
  });
};

export interface HealthPayload {
  status: string;
  uptime: number;
}

export const getHealth = async (): Promise<ApiAxiosResponse<HealthPayload>> => {
  return send<HealthPayload>({
    method: 'GET',
    url: '/health',
    withAuth: false,
  });
};

export const getAdminUserStats = async () => {
  return send({
    method: 'GET',
    url: '/users/admin/stats',
    withAuth: true,
  });
};

export const getWorkItems = async (
  userId: string,
  organizationId?: string,
  page?: number,
  limit = 10,
  status?: string,
): Promise<ApiAxiosResponse<WorkItem[]>> => {
  const params = new URLSearchParams();
  if (organizationId) params.set('organizationId', organizationId);
  if (page !== undefined) params.set('page', String(page));
  if (status) params.set('status', status);
  params.set('limit', String(limit));
  const qs = params.toString();
  return send<WorkItem[]>({
    method: 'GET',
    url: `/users/${userId}/work-items${qs ? `?${qs}` : ''}`,
    withAuth: true,
  });
};

export interface WorkItemStats {
  total: number;
  done: number;
  open: number;
  highPriority: number;
  completion: number;
}

export const getWorkItemStats = async (
  userId: string,
  organizationId?: string,
): Promise<ApiAxiosResponse<WorkItemStats>> => {
  const params = new URLSearchParams();
  if (organizationId) params.set('organizationId', organizationId);
  const qs = params.toString();
  return send<WorkItemStats>({
    method: 'GET',
    url: `/users/${userId}/work-items/stats${qs ? `?${qs}` : ''}`,
    withAuth: true,
  });
};

export const createWorkItem = async (
  userId: string,
  payload: WorkItemPayload,
  organizationId?: string,
) => {
  const qs = organizationId ? `?organizationId=${organizationId}` : '';
  return send({
    method: 'POST',
    url: `/users/${userId}/work-items${qs}`,
    body: payload,
    withAuth: true,
  });
};

export const updateWorkItem = async (
  userId: string,
  workItemId: string,
  payload: Partial<WorkItemPayload>,
  organizationId?: string,
) => {
  const qs = organizationId ? `?organizationId=${organizationId}` : '';
  return send({
    method: 'PATCH',
    url: `/users/${userId}/work-items/${workItemId}${qs}`,
    body: payload,
    withAuth: true,
  });
};

export const reorderWorkItems = async (
  userId: string,
  items: { id: string; position: number }[],
  organizationId?: string,
) => {
  const qs = organizationId ? `?organizationId=${organizationId}` : '';
  return send({
    method: 'POST',
    url: `/users/${userId}/work-items/reorder${qs}`,
    body: { items },
    withAuth: true,
  });
};

export const deleteWorkItem = async (
  userId: string,
  workItemId: string,
  organizationId?: string,
) => {
  const qs = organizationId ? `?organizationId=${organizationId}` : '';
  return send({
    method: 'DELETE',
    url: `/users/${userId}/work-items/${workItemId}${qs}`,
    withAuth: true,
  });
};

export const getWorkItemComments = async (
  userId: string,
  workItemId: string,
): Promise<ApiAxiosResponse<WorkItemComment[]>> => {
  return send<WorkItemComment[]>({
    method: 'GET',
    url: `/users/${userId}/work-items/${workItemId}/comments`,
    withAuth: true,
  });
};

export const createWorkItemComment = async (
  userId: string,
  workItemId: string,
  body: string,
) => {
  return send({
    method: 'POST',
    url: `/users/${userId}/work-items/${workItemId}/comments`,
    body: { body },
    withAuth: true,
  });
};

export const updateWorkItemComment = async (
  userId: string,
  workItemId: string,
  commentId: string,
  body: string,
) => {
  return send({
    method: 'PATCH',
    url: `/users/${userId}/work-items/${workItemId}/comments/${commentId}`,
    body: { body },
    withAuth: true,
  });
};

export const deleteWorkItemComment = async (
  userId: string,
  workItemId: string,
  commentId: string,
) => {
  return send({
    method: 'DELETE',
    url: `/users/${userId}/work-items/${workItemId}/comments/${commentId}`,
    withAuth: true,
  });
};

export const getOrganizations = async (
  userId: string,
): Promise<ApiAxiosResponse<Organization[]>> => {
  return send<Organization[]>({
    method: 'GET',
    url: `/users/${userId}/organizations`,
    withAuth: true,
  });
};

export const createOrganization = async (
  userId: string,
  payload: { name: string; description?: string },
): Promise<ApiAxiosResponse<Organization>> => {
  return send<Organization>({
    method: 'POST',
    url: `/users/${userId}/organizations`,
    body: payload,
    withAuth: true,
  });
};

export const updateOrganization = async (
  userId: string,
  organizationId: string,
  payload: { name?: string; description?: string },
) => {
  return send({
    method: 'PATCH',
    url: `/users/${userId}/organizations/${organizationId}`,
    body: payload,
    withAuth: true,
  });
};

export const deleteOrganization = async (
  userId: string,
  organizationId: string,
) => {
  return send({
    method: 'DELETE',
    url: `/users/${userId}/organizations/${organizationId}`,
    withAuth: true,
  });
};

export const getOrganizationMembers = async (
  userId: string,
  organizationId: string,
) => {
  return send({
    method: 'GET',
    url: `/users/${userId}/organizations/${organizationId}/members`,
    withAuth: true,
  });
};

export const addOrganizationMember = async (
  userId: string,
  organizationId: string,
  payload: { email: string; role?: OrganizationRole },
): Promise<ApiAxiosResponse<OrganizationMember>> => {
  return send<OrganizationMember>({
    method: 'POST',
    url: `/users/${userId}/organizations/${organizationId}/members`,
    body: payload,
    withAuth: true,
  });
};

export const updateOrganizationMember = async (
  userId: string,
  organizationId: string,
  memberId: string,
  role: OrganizationRole,
): Promise<ApiAxiosResponse<OrganizationMember>> => {
  return send<OrganizationMember>({
    method: 'PATCH',
    url: `/users/${userId}/organizations/${organizationId}/members/${memberId}`,
    body: { role },
    withAuth: true,
  });
};

export const removeOrganizationMember = async (
  userId: string,
  organizationId: string,
  memberId: string,
) => {
  return send({
    method: 'DELETE',
    url: `/users/${userId}/organizations/${organizationId}/members/${memberId}`,
    withAuth: true,
  });
};

export const searchUsers = async (
  q: string,
  callerId?: string,
): Promise<ApiAxiosResponse<User[]>> => {
  const params = new URLSearchParams({ q });
  if (callerId) params.set('callerId', callerId);
  return send<User[]>({
    method: 'GET',
    url: `/users/search?${params.toString()}`,
    withAuth: true,
  });
};

export interface DirectMessage {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  read: boolean;
  edited: boolean;
  createdAt: string;
  updatedAt: string;
  sender?: {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
  };
  recipient?: {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export interface DmConversation {
  peer: {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
  };
  lastMessage: DirectMessage | null;
  unreadCount: number;
}

export const getDmConversations = async (
  userId: string,
): Promise<ApiAxiosResponse<DmConversation[]>> => {
  return send<DmConversation[]>({
    method: 'GET',
    url: `/users/${userId}/messages/conversations`,
    withAuth: true,
  });
};

export const getDmMessages = async (
  userId: string,
  peerId: string,
  limit = 50,
  before?: string,
): Promise<ApiAxiosResponse<DirectMessage[]>> => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set('before', before);
  return send<DirectMessage[]>({
    method: 'GET',
    url: `/users/${userId}/messages/${peerId}?${params.toString()}`,
    withAuth: true,
  });
};

export const sendDmMessage = async (
  userId: string,
  recipientId: string,
  body: string,
): Promise<ApiAxiosResponse<DirectMessage>> => {
  return send<DirectMessage>({
    method: 'POST',
    url: `/users/${userId}/messages`,
    body: { recipientId, body },
    withAuth: true,
  });
};

export const markDmRead = async (userId: string, peerId: string) => {
  return send({
    method: 'POST',
    url: `/users/${userId}/messages/${peerId}/read`,
    withAuth: true,
  });
};

export const deleteDmConversation = async (userId: string, peerId: string) => {
  return send({
    method: 'DELETE',
    url: `/users/${userId}/messages/${peerId}`,
    withAuth: true,
  });
};

export const editDmMessage = async (
  userId: string,
  peerId: string,
  messageId: string,
  body: string,
): Promise<ApiAxiosResponse<DirectMessage>> => {
  return send<DirectMessage>({
    method: 'PATCH',
    url: `/users/${userId}/messages/${peerId}/${messageId}`,
    body: { body },
    withAuth: true,
  });
};

export const deleteDmMessage = async (
  userId: string,
  peerId: string,
  messageId: string,
) => {
  return send({
    method: 'DELETE',
    url: `/users/${userId}/messages/${peerId}/${messageId}`,
    withAuth: true,
  });
};

export type ElementType = 'path' | 'rect' | 'ellipse' | 'text' | 'line';

export interface BoardElement {
  id: string;
  boardId: string;
  authorId: string;
  type: ElementType;
  data: Record<string, unknown>;
  color: string;
  strokeWidth: number;
  zIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface BoardMemberUser {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface BoardMember {
  id: string;
  boardId: string;
  userId: string;
  joinedAt: string;
  user?: BoardMemberUser;
}

export interface Board {
  id: string;
  title: string;
  description?: string;
  ownerId: string;
  organizationId?: string;
  members: BoardMember[];
  createdAt: string;
  updatedAt: string;
}

export const listBoards = (
  userId: string,
  page?: number,
  limit = 10,
): Promise<ApiAxiosResponse<Board[]>> => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (page !== undefined) params.set('page', String(page));
  return send<Board[]>({
    method: 'GET',
    url: `/users/${userId}/boards?${params.toString()}`,
    withAuth: true,
  });
};

export const updateBoard = (
  userId: string,
  boardId: string,
  payload: { title?: string; description?: string },
): Promise<ApiAxiosResponse<Board>> =>
  send<Board>({
    method: 'PATCH',
    url: `/users/${userId}/boards/${boardId}`,
    body: payload,
    withAuth: true,
  });

export const createBoard = (
  userId: string,
  payload: { title: string; description?: string; organizationId?: string },
): Promise<ApiAxiosResponse<Board>> =>
  send<Board>({
    method: 'POST',
    url: `/users/${userId}/boards`,
    body: payload,
    withAuth: true,
  });

export const getBoard = (
  userId: string,
  boardId: string,
): Promise<ApiAxiosResponse<Board>> =>
  send<Board>({
    method: 'GET',
    url: `/users/${userId}/boards/${boardId}`,
    withAuth: true,
  });

export const deleteBoard = (
  userId: string,
  boardId: string,
): Promise<ApiAxiosResponse<void>> =>
  send<void>({
    method: 'DELETE',
    url: `/users/${userId}/boards/${boardId}`,
    withAuth: true,
  });

export const addBoardMember = (
  userId: string,
  boardId: string,
  targetUserId: string,
) =>
  send({
    method: 'POST',
    url: `/users/${userId}/boards/${boardId}/members/${targetUserId}`,
    withAuth: true,
  });

export const removeBoardMember = (
  userId: string,
  boardId: string,
  targetUserId: string,
) =>
  send({
    method: 'DELETE',
    url: `/users/${userId}/boards/${boardId}/members/${targetUserId}`,
    withAuth: true,
  });

export const getBoardElements = (
  userId: string,
  boardId: string,
): Promise<ApiAxiosResponse<BoardElement[]>> =>
  send<BoardElement[]>({
    method: 'GET',
    url: `/users/${userId}/boards/${boardId}/elements`,
    withAuth: true,
  });

export const clearBoardElements = (userId: string, boardId: string) =>
  send({
    method: 'DELETE',
    url: `/users/${userId}/boards/${boardId}/elements`,
    withAuth: true,
  });

export const getActivities = async (
  userId: string,
  page?: number,
  limit = 10,
  organizationId?: string,
): Promise<ApiAxiosResponse<Activity[]>> => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (page !== undefined) params.set('page', String(page));
  if (organizationId) params.set('organizationId', organizationId);
  return send<Activity[]>({
    method: 'GET',
    url: `/users/${userId}/activities?${params.toString()}`,
    withAuth: true,
  });
};
