'use client';

import { Input } from '@/components/ui/input';

export interface BirthInfo {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  longitude: number;
  gender: string;
}

const defaults: BirthInfo = {
  year: 1993, month: 7, day: 23, hour: 9, minute: 30,
  longitude: 116.4, gender: '男',
};

export function BirthForm({
  value,
  onChange,
  readonly,
}: {
  value: BirthInfo;
  onChange: (v: BirthInfo) => void;
  readonly?: boolean;
}) {
  const set = (k: keyof BirthInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const raw = e.target.value;
    const val = (k === 'gender' || k === 'longitude') ? raw : Number(raw);
    onChange({ ...value, [k]: val });
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      <Field label="年">
        <Input type="number" value={value.year} onChange={set('year')} disabled={readonly} className="h-9 text-sm" />
      </Field>
      <Field label="月">
        <Input type="number" value={value.month} onChange={set('month')} min={1} max={12} disabled={readonly} className="h-9 text-sm" />
      </Field>
      <Field label="日">
        <Input type="number" value={value.day} onChange={set('day')} min={1} max={31} disabled={readonly} className="h-9 text-sm" />
      </Field>
      <Field label="时">
        <Input type="number" value={value.hour} onChange={set('hour')} min={0} max={23} disabled={readonly} className="h-9 text-sm" />
      </Field>
      <Field label="分">
        <Input type="number" value={value.minute} onChange={set('minute')} min={0} max={59} disabled={readonly} className="h-9 text-sm" />
      </Field>
      <Field label="性别">
        <select
          value={value.gender}
          onChange={set('gender')}
          disabled={readonly}
          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="男">男</option>
          <option value="女">女</option>
        </select>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function birthToPayload(b: BirthInfo) {
  return {
    year: b.year, month: b.month, day: b.day,
    hour: b.hour, minute: b.minute,
    longitude: b.longitude, gender: b.gender,
  };
}

export const defaultBirth = defaults;
