import {
  BriefcaseBusiness,
  LineSquiggle,
  PanelLeft,
  Sparkles,
  UserRound,
  Users,
  Workflow,
  X,
} from 'lucide-react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
} from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { useSidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { getSavedStep, markOnboardingDone, saveStep } from '@/utils/onboarding';

interface StepDef {
  anchor: string;
  side: 'right' | 'bottom' | 'top' | 'left';
  icon: React.ReactNode;
  title: string;
  desktopDescription: string;
  mobileDescription?: string;
  action?: { label: string; href: string };
  requiresPath?: string[];
  hideWhenSheetOpen?: boolean;
}

const STEP_DEFS: StepDef[] = [
  {
    anchor: '',
    side: 'bottom',
    icon: <Sparkles />,
    title: 'Welcome to Rocket Space',
    desktopDescription:
      'A collaborative platform for teams: task tracking, real-time whiteboards, messaging, and maps — all in one place. This quick tour will help you get started.',
  },
  {
    anchor: 'sidebar-trigger',
    side: 'bottom',
    icon: <PanelLeft />,
    title: 'Sidebar navigation',
    desktopDescription:
      'Click this button to collapse the sidebar to icon-only mode and back, giving you more space when you need it.',
    mobileDescription:
      'Tap this button to open the navigation menu and switch between Dashboard, Workspace, Organizations, Boards, and more.',
  },
  {
    anchor: 'profile',
    side: 'right',
    icon: <UserRound />,
    title: 'Set up your profile',
    desktopDescription:
      'Add a display name, avatar, bio, and location so teammates can find and recognise you.',
    action: { label: 'Go to Profile', href: '/profile' },
  },
  {
    anchor: 'organizations',
    side: 'right',
    icon: <Users />,
    title: 'Create or join an organization',
    desktopDescription:
      'Organizations group teammates together and give everyone a shared workspace for tasks and boards.',
    action: { label: 'Go to Organizations', href: '/organizations' },
  },
  {
    anchor: 'workspace',
    side: 'right',
    icon: <BriefcaseBusiness />,
    title: 'Track work in Workspace',
    desktopDescription:
      'Create tasks, set priorities and due dates, and move them through To Do → In Progress → Done.',
    action: { label: 'Go to Workspace', href: '/workspace' },
  },
  {
    anchor: 'workspace-context',
    side: 'bottom',
    icon: <Workflow />,
    title: 'Switch workspace context',
    desktopDescription:
      'Use this dropdown to switch between your personal space and any organization. Work items and boards are scoped to the selected context.',
    requiresPath: ['/', '/workspace'],
    hideWhenSheetOpen: true,
  },
  {
    anchor: 'boards',
    side: 'right',
    icon: <LineSquiggle />,
    title: 'Collaborate on Whiteboards',
    desktopDescription:
      'Draw, annotate, and brainstorm together in real time on shared whiteboards — personal or organization-scoped.',
    action: { label: 'Go to Boards', href: '/boards' },
  },
];

const SIDEBAR_ANCHORS = [
  'welcome',
  'profile',
  'organizations',
  'workspace',
  'boards',
];
const stepNeedsSidebar = (anchor: string) => SIDEBAR_ANCHORS.includes(anchor);

interface OnboardingDialogProps {
  open: boolean;
  onClose: () => void;
}

export function OnboardingDialog({ open, onClose }: OnboardingDialogProps) {
  const [step, setStep] = useState(() => getSavedStep());
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { openMobile, setOpenMobile } = useSidebar();
  const anchorRef = useRef<Element | null>(null);
  const [anchorFound, setAnchorFound] = useState(false);

  const steps = STEP_DEFS;
  const currentDef = steps[Math.min(step, steps.length - 1)];
  const current = {
    ...currentDef,
    description:
      isMobile && currentDef.mobileDescription
        ? currentDef.mobileDescription
        : currentDef.desktopDescription,
    side:
      isMobile && currentDef.side === 'right'
        ? ('bottom' as const)
        : currentDef.side,
  };
  const isLast = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  useEffect(() => {
    if (!open) return;

    anchorRef.current = null;
    setAnchorFound(false);

    // Anchor-less step (e.g. welcome): show immediately without anchoring.
    if (!current.anchor) {
      setAnchorFound(true);
      return;
    }

    // On mobile, sidebar elements are always in the DOM (Sheet just hides them).
    // Don't show the popover for sidebar-anchored steps unless the sheet is open.
    if (isMobile && stepNeedsSidebar(current.anchor) && !openMobile) {
      return;
    }

    // Steps that should only show when the sheet is closed.
    if (isMobile && currentDef.hideWhenSheetOpen && openMobile) {
      return;
    }

    const selector = `[data-onboarding="${current.anchor}"]`;
    let observer: MutationObserver | null = null;
    let rafId = -1;

    const tryFind = () => {
      const el = document.querySelector(selector);
      if (el && document.contains(el)) {
        anchorRef.current = el;
        setAnchorFound(true);
        return true;
      }
      anchorRef.current = null;
      setAnchorFound(false);
      return false;
    };

    rafId = requestAnimationFrame(() => {
      if (!tryFind()) {
        observer = new MutationObserver(() => {
          if (tryFind()) observer?.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }
    });

    return () => {
      cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
  }, [
    open,
    step,
    current.anchor,
    currentDef.hideWhenSheetOpen,
    location.pathname,
    isMobile,
    openMobile,
  ]);

  const advanceStep = () => {
    if (isLast) {
      markOnboardingDone();
      onClose();
    } else {
      const next = step + 1;
      saveStep(next);
      const nextDef = steps[next];
      if (isMobile) {
        if (stepNeedsSidebar(nextDef.anchor)) {
          setOpenMobile(true);
        } else {
          setOpenMobile(false);
        }
      }
      setStep(next);
    }
  };

  useEffect(() => {
    if (!open || !anchorFound || !anchorRef.current) return;
    const el = anchorRef.current;
    const isTrigger = current.anchor === 'sidebar-trigger';
    const handler = (e: Event) => {
      if (isTrigger) e.stopImmediatePropagation();
      advanceStep();
    };
    el.addEventListener('click', handler, isTrigger);
    return () => el.removeEventListener('click', handler, isTrigger);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, anchorFound, step]);

  const handleDismiss = () => {
    if (!isLast) {
      const next = step + 1;
      saveStep(next);
    } else {
      markOnboardingDone();
    }
    sessionStorage.setItem('onboarding_dismissed', '1');
    onClose();
  };

  const handleSkip = () => {
    markOnboardingDone();
    onClose();
  };

  const handleNext = () => {
    const next = Math.min(step + 1, steps.length - 1);
    const nextDef = steps[next];
    if (
      nextDef.requiresPath &&
      !nextDef.requiresPath.includes(location.pathname)
    ) {
      navigate(nextDef.requiresPath[0]);
    }
    advanceStep();
  };

  const handleAction = () => {
    if (current.action) {
      advanceStep();
      if (isMobile) setOpenMobile(false);
      navigate(current.action.href);
    }
  };

  if (!open || !anchorFound) return null;

  const dismissButton = (
    <Button
      onClick={handleDismiss}
      variant="ghost"
      size="icon"
      className="absolute -top-1 -right-1 text-muted-foreground"
      aria-label="Close"
    >
      <X />
    </Button>
  );

  const contentBody = (
    <>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {current.description}
      </p>

      <div className="space-y-1 py-1">
        <Progress value={progress} />
        <p className="text-xs text-muted-foreground text-right">
          {step + 1} / {steps.length}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 ">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          className="text-muted-foreground"
        >
          Skip tour
        </Button>
        <div className="flex gap-2">
          {current.action && (
            <Button variant="outline" size="sm" onClick={handleAction}>
              {current.action.label}
            </Button>
          )}
          <Button size="sm" onClick={handleNext}>
            {isLast ? 'Get started' : 'Next'}
          </Button>
        </div>
      </div>
    </>
  );

  if (!current.anchor) {
    return (
      <Dialog
        open
        onOpenChange={(o) => {
          if (!o) handleDismiss();
        }}
      >
        <DialogContent
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          showCloseButton={false}
          onPointerDownCapture={(e) => e.stopPropagation()}
          aria-describedby={undefined}
          className="min-w-90 p-4"
        >
          <div className="relative flex flex-col gap-3">
            {dismissButton}
            <div className="flex items-center gap-3">
              {current.icon}
              <DialogTitle className="pr-5">{current.title}</DialogTitle>
            </div>
            {contentBody}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open>
      <PopoverAnchor virtualRef={anchorRef as React.RefObject<Element>} />
      <PopoverContent
        side={current.side}
        sideOffset={2}
        align="center"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="min-w-90 p-4"
      >
        <div
          className="relative flex flex-col gap-3"
          onPointerDownCapture={(e) => e.stopPropagation()}
        >
          {dismissButton}
          <PopoverHeader className="flex-row items-center gap-3">
            {current.icon}
            <PopoverTitle className="text-base font-semibold leading-tight pr-5">
              {current.title}
            </PopoverTitle>
          </PopoverHeader>
          {contentBody}
        </div>
        <PopoverPrimitive.Arrow asChild>
          <svg
            width="20"
            height="10"
            viewBox="0 0 20 10"
            className="overflow-visible"
          >
            <polygon points="0,0 10,10 20,0" className="fill-foreground/10" />
            <polygon points="0,-1 10,9 20,-1" className="fill-popover" />
          </svg>
        </PopoverPrimitive.Arrow>
      </PopoverContent>
    </Popover>
  );
}
