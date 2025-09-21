import { CalendarDays } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const formatDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface DueDatePickerProps {
  id?: string;
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
}

export default function DueDatePicker({
  id,
  value,
  onChange,
}: DueDatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className="w-full justify-start px-3 font-normal"
        >
          <CalendarDays className="size-4 text-muted-foreground" />
          {value ? (
            formatDateValue(value)
          ) : (
            <span className="text-muted-foreground">No due date</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={16}
        className="w-auto p-0"
      >
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
          captionLayout="dropdown"
        />
        <div className="border-t p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            disabled={!value}
            onClick={() => {
              onChange(undefined);
              setOpen(false);
            }}
          >
            Clear due date
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
