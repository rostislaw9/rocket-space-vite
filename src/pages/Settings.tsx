import { Eye, Monitor, Moon, ShieldAlert, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import PageShell from '@/components/PageShell';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { usePreferences } from '@/hooks/use-preferences';
import type { ColorTheme } from '@/types/preferences';

const themeOptions = [
  {
    value: 'light',
    label: 'Light',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'System',
    icon: Monitor,
  },
];

const preferenceOptions = [
  {
    key: 'confirmDestructiveActions',
    label: 'Confirm destructive actions',
    icon: ShieldAlert,
  },
  {
    key: 'focusContrast',
    label: 'Focus contrast',
    icon: Eye,
  },
] as const;

const colorThemeOptions: {
  value: ColorTheme;
  label: string;
  lightColor: string;
  darkColor: string;
}[] = [
  {
    value: 'default',
    label: 'Default',
    lightColor: '#18181b',
    darkColor: '#e4e4e7',
  },
  {
    value: 'green',
    label: 'Green',
    lightColor: '#16a34a',
    darkColor: '#4ade80',
  },
  { value: 'blue', label: 'Blue', lightColor: '#2563eb', darkColor: '#60a5fa' },
  {
    value: 'violet',
    label: 'Violet',
    lightColor: '#7c3aed',
    darkColor: '#a78bfa',
  },
  {
    value: 'orange',
    label: 'Orange',
    lightColor: '#ea580c',
    darkColor: '#fb923c',
  },
  { value: 'rose', label: 'Rose', lightColor: '#e11d48', darkColor: '#fb7185' },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { preferences, updatePreference, setColorTheme, resetPreferences } =
    usePreferences();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <PageShell title="Settings" description="Theme and interaction preferences">
      <div className="flex flex-col gap-4">
        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Appearance</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-3">
            {themeOptions.map(({ value, label, icon: Icon }) => {
              const active = mounted && theme === value;

              return (
                <Button
                  key={value}
                  variant={active ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setTheme(value)}
                >
                  <span className={active ? 'text-primary-foreground' : ''}>
                    <Icon className="size-5" />
                  </span>
                  <span className="text-sm font-medium">{label}</span>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Color theme</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {colorThemeOptions.map(
              ({ value, label, lightColor, darkColor }) => {
                const active = preferences.colorTheme === value;
                return (
                  <Button
                    key={value}
                    onClick={() => setColorTheme(value)}
                    title={label}
                    variant="outline"
                    size="lg"
                    className={`w-full overflow-hidden p-0 gap-0 ${
                      active
                        ? 'border-foreground'
                        : 'border-transparent hover:border-foreground/30'
                    }`}
                  >
                    <span
                      className="flex h-full w-1/2 items-center justify-center text-[11px] font-medium"
                      style={{ background: lightColor, color: '#fff' }}
                    >
                      {active ? '✓' : ''}
                    </span>
                    <span
                      className="flex h-full w-1/2 items-center justify-center text-[11px] font-medium"
                      style={{ background: darkColor, color: '#000' }}
                    />
                  </Button>
                );
              },
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Behavior</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {preferenceOptions.map(({ key, label, icon: Icon }) => {
              const active = preferences[key];

              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{label}</span>
                    </span>
                  </div>
                  <Switch
                    checked={active}
                    onCheckedChange={() => updatePreference(key)}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Preference guide</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              <AccordionItem value="theme">
                <AccordionTrigger>Which theme should I use?</AccordionTrigger>
                <AccordionContent>
                  System theme follows your device. Light and dark themes keep
                  the workspace fixed regardless of operating system changes.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="confirm">
                <AccordionTrigger>
                  What are destructive actions?
                </AccordionTrigger>
                <AccordionContent>
                  Destructive actions include deleting work items, removing
                  organization members, and clearing profile data. When enabled,
                  you'll see a confirmation dialog before these actions proceed.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="contrast">
                <AccordionTrigger>
                  When should focus contrast be on?
                </AccordionTrigger>
                <AccordionContent>
                  Use focus contrast when you want stronger borders and clearer
                  separation between interactive areas.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setTheme('system')}>
            <Monitor className="size-4" />
            Use system theme
          </Button>
          <Button variant="outline" onClick={resetPreferences}>
            Reset preferences
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
