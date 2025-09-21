import * as React from 'react';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

import { useMediaQuery } from '@/hooks/use-media-query';

const ResponsiveModalContext = React.createContext<{
  isDesktop: boolean;
} | null>(null);

type ResponsiveModalProps = React.ComponentProps<typeof Dialog> & {
  children: React.ReactNode;
};

export function ResponsiveModal({ children, ...props }: ResponsiveModalProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const Wrapper = isDesktop ? Dialog : Drawer;

  return (
    <ResponsiveModalContext.Provider value={{ isDesktop }}>
      <Wrapper {...props}>{children}</Wrapper>
    </ResponsiveModalContext.Provider>
  );
}

function useResponsiveModal() {
  const ctx = React.useContext(ResponsiveModalContext);
  if (!ctx)
    throw new Error(
      'ResponsiveModal subcomponents must be used inside <ResponsiveModal>',
    );
  return ctx.isDesktop;
}

export const ResponsiveModalTrigger = (
  props: React.ComponentProps<typeof DialogTrigger>,
) => {
  const isDesktop = useResponsiveModal();
  return isDesktop ? (
    <DialogTrigger {...props} />
  ) : (
    <DrawerTrigger {...props} />
  );
};

export const ResponsiveModalContent = (
  props: React.ComponentProps<typeof DialogContent>,
) => {
  const isDesktop = useResponsiveModal();
  return isDesktop ? (
    <DialogContent {...props} />
  ) : (
    <DrawerContent {...props} />
  );
};

export const ResponsiveModalHeader = (
  props: React.ComponentProps<typeof DialogHeader>,
) => {
  const isDesktop = useResponsiveModal();
  return isDesktop ? <DialogHeader {...props} /> : <DrawerHeader {...props} />;
};

export const ResponsiveModalTitle = (
  props: React.ComponentProps<typeof DialogTitle>,
) => {
  const isDesktop = useResponsiveModal();
  return isDesktop ? <DialogTitle {...props} /> : <DrawerTitle {...props} />;
};

export const ResponsiveModalDescription = (
  props: React.ComponentProps<typeof DialogDescription>,
) => {
  const isDesktop = useResponsiveModal();
  return isDesktop ? (
    <DialogDescription {...props} />
  ) : (
    <DrawerDescription {...props} />
  );
};

export const ResponsiveModalFooter = (
  props: React.ComponentProps<typeof DialogFooter>,
) => {
  const isDesktop = useResponsiveModal();
  return isDesktop ? <DialogFooter {...props} /> : <DrawerFooter {...props} />;
};

export const ResponsiveModalClose = (
  props: React.ComponentProps<typeof DialogClose>,
) => {
  const isDesktop = useResponsiveModal();
  return isDesktop ? <DialogClose {...props} /> : <DrawerClose {...props} />;
};
