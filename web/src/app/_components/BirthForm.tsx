'use client';

import { useState } from 'react';
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

const CITIES: { label: string; lng: number }[] = [
  { label: '北京', lng: 116.4 },
  { label: '上海', lng: 121.5 },
  { label: '广州', lng: 113.3 },
  { label: '深圳', lng: 114.1 },
  { label: '西安', lng: 108.9 },
  { label: '成都', lng: 104.1 },
  { label: '武汉', lng: 114.3 },
  { label: '杭州', lng: 120.2 },
  { label: '南京', lng: 118.8 },
  { label: '重庆', lng: 106.5 },
];

const CUSTOM_CITY_VALUE = '__custom__';

function findCity(lng: number): string {
  const match = CITIES.find((c) => c.lng === lng);
  return match ? String(match.lng) : CUSTOM_CITY_VALUE;
}

export function BirthForm({
  value,
  onChange,
  readonly,
}: {
  value: BirthInfo;
  onChange: (v: BirthInfo) => void;
  readonly?: boolean;
}) {
  const [cityValue, setCityValue] = useState(findCity(value.longitude));
  const [showCustomLng, setShowCustomLng] = useState(cityValue === CUSTOM_CITY_VALUE);
  const unknownHour = value.hour === -1;

  const set = (k: keyof BirthInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const raw = e.target.value;
    const val = k === 'gender' ? raw : Number(raw);
    onChange({ ...value, [k]: val });
  };

  const handleCity = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setCityValue(v);
    if (v === CUSTOM_CITY_VALUE) {
      setShowCustomLng(true);
    } else {
      setShowCustomLng(false);
      onChange({ ...value, longitude: Number(v) });
    }
  };

  const handleUnknownHour = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      onChange({ ...value, hour: -1, minute: 0 });
    } else {
      onChange({ ...value, hour: 12, minute: 0 });
    }
  };

  return (
    <div className="space-y-4">
      {/* Year / Month / Day / Hour / Minute */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        <Field label="年">
          <Input type="number" value={value.year} onChange={set('year')} disabled={readonly} className="h-9 text-sm" />
        </Field>
        <Field label="月">
          <Input type="number" value={value.month} onChange={set('month')} min={1} max={12} disabled={readonly} className="h-9 text-sm" />
        </Field>
        <Field label="日">
          <Input type="number" value={value.day} onChange={set('day')} min={1} max={31} disabled={readonly} className="h-9 text-sm" />
        </Field>
        {!unknownHour && (
          <>
            <Field label="时">
              <Input type="number" value={value.hour} onChange={set('hour')} min={0} max={23} disabled={readonly} className="h-9 text-sm" />
            </Field>
            <Field label="分">
              <Input type="number" value={value.minute} onChange={set('minute')} min={0} max={59} disabled={readonly} className="h-9 text-sm" />
            </Field>
          </>
        )}
      </div>

      {/* Unknown hour checkbox */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={unknownHour}
          onChange={handleUnknownHour}
          disabled={readonly}
          className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-destiny-600 focus:ring-destiny-600"
        />
        <span className="text-xs text-zinc-400">不知道具体时辰</span>
        {unknownHour && (
          <span className="text-xs text-amber-500">— 将使用日柱分析，准确度略低</span>
        )}
      </label>

      {/* City + Gender */}
      <div className="grid grid-cols-3 gap-3">
        <Field label="出生地">
          <select
            value={cityValue}
            onChange={handleCity}
            disabled={readonly}
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm text-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            style={{ colorScheme: 'dark' }}
          >
            {CITIES.map((c) => (
              <option key={c.label} value={String(c.lng)}>
                {c.label}
              </option>
            ))}
            <option value={CUSTOM_CITY_VALUE}>其他(手动输入)</option>
          </select>
        </Field>
        {showCustomLng && (
          <Field label="经度">
            <Input
              type="number"
              value={value.longitude}
              onChange={set('longitude')}
              disabled={readonly}
              placeholder="116.4"
              step="0.1"
              className="h-9 text-sm"
            />
          </Field>
        )}
        <Field label="性别">
          <div className="flex gap-0 h-9 rounded-lg border border-input overflow-hidden">
            <button
              type="button"
              disabled={readonly}
              onClick={() => onChange({ ...value, gender: '男' })}
              className={`flex-1 text-sm font-medium transition-colors ${
                value.gender === '男'
                  ? 'bg-destiny-600 text-white'
                  : 'bg-background text-muted-foreground hover:text-foreground'
              }`}
            >
              男
            </button>
            <button
              type="button"
              disabled={readonly}
              onClick={() => onChange({ ...value, gender: '女' })}
              className={`flex-1 text-sm font-medium transition-colors ${
                value.gender === '女'
                  ? 'bg-destiny-600 text-white'
                  : 'bg-background text-muted-foreground hover:text-foreground'
              }`}
            >
              女
            </button>
          </div>
        </Field>
      </div>
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
