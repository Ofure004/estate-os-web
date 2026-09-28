"use client";

import { useContext, useState } from "react";
import { CalendarDateTime } from "@internationalized/date";
import {
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  DateInput,
  DatePicker,
  DatePickerStateContext,
  DateSegment,
  Dialog,
  Group,
  Heading,
  Label,
  Popover,
} from "react-aria-components";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock } from "lucide-react";
import { Button } from "./button";

interface DateTimePickerProps {
  label: string;
  name: string;
  isRequired?: boolean;
  defaultOffsetMinutes?: number;
}

const segmentClassName = "rounded px-0.5 outline-none data-[focused]:bg-accent data-[focused]:text-accent-foreground data-[placeholder]:text-muted-foreground data-[type=literal]:px-0";

function SegmentedInput({ className }: { className?: string }) {
  return (
    <DateInput className={`flex min-w-0 flex-1 items-center ${className ?? ""}`}>
      {(segment) => <DateSegment segment={segment} className={segmentClassName} />}
    </DateInput>
  );
}

function TimeSpinner({ label, value, numericValue, min, max, onIncrease, onDecrease }: {
  label: string;
  value: string;
  numericValue: number;
  min: number;
  max: number;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  return (
    <div className="flex h-10 overflow-hidden rounded-lg border bg-card" role="group" aria-label={label}>
      <span className="grid min-w-11 place-items-center px-2 font-semibold tabular-nums" role="spinbutton" aria-label={label} aria-valuenow={numericValue} aria-valuemin={min} aria-valuemax={max}>
        {value}
      </span>
      <span className="flex w-7 flex-col border-l">
        <Button slot={null} variant="ghost" aria-label={`Increase ${label.toLowerCase()}`} onPress={onIncrease} className="h-5 min-h-0 rounded-none border-b p-0">
          <ChevronUp className="size-3" />
        </Button>
        <Button slot={null} variant="ghost" aria-label={`Decrease ${label.toLowerCase()}`} onPress={onDecrease} className="h-5 min-h-0 rounded-none p-0">
          <ChevronDown className="size-3" />
        </Button>
      </span>
    </div>
  );
}

function CalendarWithTime() {
  const state = useContext(DatePickerStateContext);

  if (!state) return null;
  const time = state.timeValue;
  const hour = time?.hour ?? 0;
  const minute = time?.minute ?? 0;
  const displayHour = hour % 12 || 12;
  const period = hour >= 12 ? "PM" : "AM";

  return (
    <>
      <Calendar className="w-full">
        <header className="mb-3 flex items-center justify-between">
          <Button slot="previous" variant="ghost" size="icon-sm" aria-label="Previous month">
            <ChevronLeft className="size-4" />
          </Button>
          <Heading className="text-sm font-bold" />
          <Button slot="next" variant="ghost" size="icon-sm" aria-label="Next month">
            <ChevronRight className="size-4" />
          </Button>
        </header>
        <CalendarGrid weekdayStyle="short" className="w-full border-separate border-spacing-1">
          <CalendarGridHeader>
            {(day) => <CalendarHeaderCell className="pb-1 text-center text-[10px] font-semibold uppercase text-muted-foreground">{day}</CalendarHeaderCell>}
          </CalendarGridHeader>
          <CalendarGridBody>
            {(date) => (
              <CalendarCell
                date={date}
                className={({ isDisabled, isFocused, isOutsideMonth, isSelected, isToday }) => [
                  "size-9 rounded-lg text-center text-sm leading-9 outline-none transition-colors",
                  isOutsideMonth && "text-muted-foreground/45",
                  !isDisabled && !isSelected && "hover:bg-muted",
                  isSelected && "bg-primary font-bold text-primary-foreground",
                  isToday && !isSelected && "font-bold text-accent-foreground ring-1 ring-accent-foreground/30",
                  isFocused && "ring-2 ring-ring ring-offset-1",
                  isDisabled && "cursor-not-allowed opacity-35",
                ].filter(Boolean).join(" ")}
              />
            )}
          </CalendarGridBody>
        </CalendarGrid>
      </Calendar>
      <div className="mt-4 border-t pt-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Clock className="size-3.5" aria-hidden="true" />
          Time
        </div>
        <div className="flex items-center gap-2">
          <TimeSpinner
            label="Hour"
            value={String(displayHour).padStart(2, "0")}
            numericValue={displayHour}
            min={1}
            max={12}
            onIncrease={() => time && state.setTimeValue(time.cycle("hour", 1))}
            onDecrease={() => time && state.setTimeValue(time.cycle("hour", -1))}
          />
          <span className="font-bold text-muted-foreground" aria-hidden="true">:</span>
          <TimeSpinner
            label="Minute"
            value={String(minute).padStart(2, "0")}
            numericValue={minute}
            min={0}
            max={59}
            onIncrease={() => time && state.setTimeValue(time.cycle("minute", 1))}
            onDecrease={() => time && state.setTimeValue(time.cycle("minute", -1))}
          />
          <Button
            slot={null}
            type="button"
            variant="outline"
            aria-label={`Switch to ${period === "AM" ? "PM" : "AM"}`}
            onPress={() => time && state.setTimeValue(time.set({ hour: (hour + 12) % 24 }))}
            className="h-10 min-w-12"
          >
            {period}
          </Button>
          <Button slot={null} type="button" onPress={() => state.close()} className="ml-auto h-10 px-4">Done</Button>
        </div>
      </div>
    </>
  );
}

export function DateTimePicker({ label, name, isRequired, defaultOffsetMinutes = 0 }: DateTimePickerProps) {
  const [defaultValue] = useState(() => {
    const value = new Date();
    value.setSeconds(0, 0);
    value.setMinutes(Math.ceil(value.getMinutes() / 15) * 15 + defaultOffsetMinutes);
    return new CalendarDateTime(value.getFullYear(), value.getMonth() + 1, value.getDate(), value.getHours(), value.getMinutes());
  });

  return (
    <DatePicker name={name} defaultValue={defaultValue} granularity="minute" isRequired={isRequired} shouldCloseOnSelect={false} className="min-w-0 text-sm">
      <Label className="font-semibold">{label}</Label>
      <Group className="mt-2 flex h-11 w-full items-center overflow-hidden rounded-lg border bg-card transition-shadow focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <SegmentedInput className="px-3" />
        <Button variant="ghost" size="icon" aria-label={`Choose ${label.toLowerCase()}`} className="mr-1 size-9 shrink-0">
          <CalendarDays className="size-4" />
        </Button>
      </Group>
      <Popover placement="bottom start" offset={8} className="z-[60] w-[min(20rem,calc(100vw-2rem))] rounded-xl border bg-popover p-4 text-popover-foreground shadow-xl outline-none">
        <Dialog className="outline-none">
          <CalendarWithTime />
        </Dialog>
      </Popover>
    </DatePicker>
  );
}
