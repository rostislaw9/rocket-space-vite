import {
  Building2,
  LayoutDashboard,
  LineSquiggle,
  MapIcon,
  MessageSquare,
  Settings,
  UserRound,
  Workflow,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';

const actions = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    shortcut: 'D',
    icon: LayoutDashboard,
  },
  { label: 'Workspace', path: '/workspace', shortcut: 'W', icon: Workflow },
  {
    label: 'Organizations',
    path: '/organizations',
    shortcut: 'O',
    icon: Building2,
  },
  { label: 'Whiteboards', path: '/boards', shortcut: 'B', icon: LineSquiggle },
  { label: 'Messages', path: '/chat', shortcut: 'M', icon: MessageSquare },
  { label: 'Locations', path: '/map', shortcut: 'L', icon: MapIcon },
  { label: 'Profile', path: '/profile', shortcut: 'P', icon: UserRound },
  { label: 'Settings', path: '/settings', shortcut: ',', icon: Settings },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const run = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command>
        <CommandInput placeholder="Search pages..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Go to">
            {actions.map(({ label, path, shortcut, icon: Icon }) => (
              <CommandItem key={path} onSelect={() => run(path)}>
                <Icon />
                <span>{label}</span>
                <CommandShortcut>{shortcut}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
