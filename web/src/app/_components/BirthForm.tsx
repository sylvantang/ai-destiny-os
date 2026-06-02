'use client';

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

const labelStyle: React.CSSProperties = { fontSize: '0.85rem', color: '#666', marginBottom: 2 };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem', border: '1px solid #d5d5d5',
  borderRadius: 4, fontSize: '0.95rem', boxSizing: 'border-box',
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' }}>
      <Field label="年"><input type="number" value={value.year} onChange={set('year')} disabled={readonly} style={inputStyle} /></Field>
      <Field label="月"><input type="number" value={value.month} onChange={set('month')} min={1} max={12} disabled={readonly} style={inputStyle} /></Field>
      <Field label="日"><input type="number" value={value.day} onChange={set('day')} min={1} max={31} disabled={readonly} style={inputStyle} /></Field>
      <Field label="时"><input type="number" value={value.hour} onChange={set('hour')} min={0} max={23} disabled={readonly} style={inputStyle} /></Field>
      <Field label="分"><input type="number" value={value.minute} onChange={set('minute')} min={0} max={59} disabled={readonly} style={inputStyle} /></Field>
      <Field label="性别">
        <select value={value.gender} onChange={set('gender')} disabled={readonly} style={inputStyle}>
          <option value="男">男</option>
          <option value="女">女</option>
        </select>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={labelStyle}>{label}</span>
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
