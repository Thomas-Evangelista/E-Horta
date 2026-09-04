'use client';

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { formatPrice } from '@/lib/format';

export interface TrendPoint {
  date: string;
  orders: number;
  revenue: number;
}

function formatDateShort(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);
}

export function DashboardTrendChart({ data }: { data: TrendPoint[] }) {
  const chartData = data.map((point) => ({
    ...point,
    label: formatDateShort(point.date),
    orders: point.orders,
    revenue: point.revenue,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-ink-400">
        Sem dados no período selecionado
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#efe7da" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8a8378' }} tickLine={false} axisLine={{ stroke: '#efe7da' }} />
        <YAxis
          yAxisId="revenue"
          tick={{ fontSize: 11, fill: '#8a8378' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => (value >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${value}`)}
        />
        <YAxis yAxisId="orders" orientation="right" tick={{ fontSize: 11, fill: '#8a8378' }} tickLine={false} axisLine={false} />
        <Tooltip
          formatter={(value, name) =>
            name === 'revenue' ? [formatPrice(Number(value)), 'Receita'] : [Number(value), 'Pedidos']
          }
          labelFormatter={(label) => String(label)}
          contentStyle={{ borderRadius: 12, border: '1px solid #efe7da', fontSize: 12 }}
        />
        <Legend formatter={(value: string) => (value === 'revenue' ? 'Receita' : 'Pedidos')} />
        <Bar yAxisId="orders" dataKey="orders" fill="#f0a868" radius={[4, 4, 0, 0]} name="orders" />
        <Line yAxisId="revenue" dataKey="revenue" stroke="#3f7d4e" strokeWidth={2} dot={false} name="revenue" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
