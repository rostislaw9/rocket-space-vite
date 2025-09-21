import { createContext, createElement, useState, type ReactNode } from 'react';

export interface Crumb {
  label: string;
  path?: string;
}

export interface BreadCrumbsContextValue {
  crumbs: Crumb[];
  setCrumbs: (crumbs: Crumb[]) => void;
}

export const BreadCrumbsContext = createContext<BreadCrumbsContextValue>({
  crumbs: [],
  setCrumbs: () => {},
});

export function BreadCrumbsProvider({ children }: { children: ReactNode }) {
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  return createElement(
    BreadCrumbsContext.Provider,
    { value: { crumbs, setCrumbs } },
    children,
  );
}
