import { useContext } from 'react';

import { BreadCrumbsContext, type Crumb } from '@/contexts/breadcrumbs-context';

export { type Crumb };
export const useBreadCrumbs = () => useContext(BreadCrumbsContext);
