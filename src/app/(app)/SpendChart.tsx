"use client";

import { PieChart as RPC, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatBRL } from "@/lib/format";
import { PieChart as PieIcon } from "lucide-react";

type SpendData = {
  name: string;
  color: string;
  total: number;
};

export function SpendChart({ data }: { data: SpendData[] }) {
  if (!data.length) {
    return (
      <div className="h-72 flex flex-col items-center justify-center text-center p-6 rounded-xl bg-slate-50/50 border border-dashed border-slate-200">
        <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <PieIcon className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-slate-700">Sem dados de gastos neste mês</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Importe seus extratos bancários para visualizar a distribuição dos seus gastos por categoria.
        </p>
      </div>
    );
  }

  const grandTotal = data.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <div className="space-y-4">
      <div className="h-64 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <RPC>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={90}
              paddingAngle={3}
              dataKey="total"
              stroke="#ffffff"
              strokeWidth={3}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color || "#64748b"} 
                  className="transition-all duration-200 hover:opacity-85 cursor-pointer outline-none"
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as SpendData;
                  const pct = grandTotal > 0 ? ((item.total / grandTotal) * 100).toFixed(1) : "0";
                  return (
                    <div className="rounded-xl bg-slate-900 text-white px-3.5 py-2.5 shadow-xl text-xs space-y-1 border border-slate-800">
                      <div className="flex items-center gap-2 font-semibold">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.color || "#64748b" }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-slate-300">
                        <span className="font-mono tabular-nums">{formatBRL(item.total)}</span>
                        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-medium">{pct}%</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </RPC>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Total</span>
          <span className="text-sm font-bold text-slate-800 tabular-nums">
            {formatBRL(grandTotal)}
          </span>
        </div>
      </div>

      {/* Categories Legend List */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 max-h-36 overflow-y-auto pr-1">
        {data.slice(0, 6).map((item, idx) => {
          const pct = grandTotal > 0 ? ((item.total / grandTotal) * 100).toFixed(0) : "0";
          return (
            <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-slate-50 transition">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color || "#64748b" }}
                />
                <span className="truncate text-slate-600 font-medium">{item.name}</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px] ml-2 shrink-0">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

