import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/ui/ChartCard";
import {
  AXIS_STYLE,
  CHART_COLORS,
  CHART_COLORS_ARRAY,
  GRID_STROKE,
} from "@/lib/chartUtils";
import type { ChartBlock as ChartBlockType } from "@/types";

interface ChartBlockProps {
  block: ChartBlockType;
}

export function ChartBlock({ block }: ChartBlockProps) {
  if (!block.data.length) {
    return (
      <div className="rounded-2xl border border-brand-border/20 bg-white p-4 text-sm text-brand-muted">
        No data available
      </div>
    );
  }

  return (
    <ChartCard title={block.title}>
      <ResponsiveContainer width="100%" height="100%">
        {block.chart_type === "bar" ? (
          <BarChart data={block.data}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="label" {...AXIS_STYLE} />
            <YAxis {...AXIS_STYLE} />
            <Tooltip />
            <Bar dataKey="value" fill={CHART_COLORS.accent} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : block.chart_type === "line" ? (
          <LineChart data={block.data}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="label" {...AXIS_STYLE} />
            <YAxis {...AXIS_STYLE} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke={CHART_COLORS.accent}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.accent, r: 0 }}
            />
          </LineChart>
        ) : block.chart_type === "area" ? (
          <AreaChart data={block.data}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="label" {...AXIS_STYLE} />
            <YAxis {...AXIS_STYLE} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="value"
              stroke={CHART_COLORS.accent}
              fill={`${CHART_COLORS.accent}33`}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.accent, r: 0 }}
            />
          </AreaChart>
        ) : (
          <PieChart>
            <Pie
              data={block.data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
            >
              {block.data.map((_, i) => (
                <Cell
                  key={i}
                  fill={CHART_COLORS_ARRAY[i % CHART_COLORS_ARRAY.length]}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        )}
      </ResponsiveContainer>
    </ChartCard>
  );
}
