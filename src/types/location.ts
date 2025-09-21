export const LocationPrivacy = {
  HIDDEN: 'hidden',
  ORGANIZATIONS: 'organizations',
  PUBLIC: 'public',
} as const;

export type LocationPrivacy =
  (typeof LocationPrivacy)[keyof typeof LocationPrivacy];
