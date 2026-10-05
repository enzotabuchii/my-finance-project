"use client";

import { PieChart as RPC, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatBRL } from "@/lib/format";

type SpendData = {
  name: string;
  color: string;
  total: number;
};

export function SpendChart({ data }: { data: SpendData[] }) {
  if (!data.length) {
    return <div className="h-64 flex items-center justify-center text-gray-500">Sem dados de gastos neste mês.</div>;
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RPC>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="total"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => formatBRL(value)}
            itemStyle={{ color: "#111827" }}
          />
          <Legend />
        </RPC>
      </ResponsiveContainer>
    </div>
  );
}
