'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export type PricePoint = { date: string; close: number };

export function PriceChart({ data, height = 220 }: { data: PricePoint[]; height?: number }) {
  const data2 = data.map((d) => ({ ...d, label: d.date.slice(5) }));
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={data2} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7A5230" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#7A5230" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E8EAED" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#6E7681' }}
            tickFormatter={(v, i) => (i === 0 || i === data2.length - 1 || i % Math.floor(data2.length / 5) === 0 ? v : '')}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6E7681' }}
            axisLine={false}
            tickLine={false}
            width={48}
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v) => v.toFixed(0)}
          />
          <Tooltip
            contentStyle={{ background: '#FFFFFF', border: '1px solid #E8EAED', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#6E7681' }}
            formatter={(v: number) => [v.toFixed(2), 'Price']}
          />
          <Area type="monotone" dataKey="close" stroke="#7A5230" strokeWidth={2} fill="url(#priceGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
