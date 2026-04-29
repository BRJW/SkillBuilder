"use client";

import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const COLORS = [
  "hsl(210, 70%, 55%)",
  "hsl(152, 60%, 48%)",
  "hsl(270, 60%, 55%)",
  "hsl(25, 85%, 55%)",
  "hsl(330, 70%, 55%)",
  "hsl(180, 55%, 45%)",
  "hsl(45, 80%, 50%)",
  "hsl(0, 70%, 55%)",
];

const chartConfig = {
  current: {
    label: "Avg Step",
    color: "hsl(210, 70%, 55%)",
  },
};

function TrendBadge({ change }: { change: number }) {
  if (Math.abs(change) < 0.3) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" /> {change > 0 ? "+" : ""}{change.toFixed(1)}
      </span>
    );
  }
  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600 font-medium">
        <TrendingUp className="h-3 w-3" /> +{change.toFixed(1)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-red-500 font-medium">
      <TrendingDown className="h-3 w-3" /> {change.toFixed(1)}
    </span>
  );
}

export function GroupComparisonChart({
  data,
}: {
  data: { groupName: string; current: number; previous: number; change: number; count: number }[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Group Comparison</CardTitle>
          <CardDescription>
            Average rubric steps by group with period-over-period trend
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <BarChart data={data} accessibilityLayer>
              <defs>
                {COLORS.map((color, i) => (
                  <linearGradient key={i} id={`groupGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.5} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="groupName"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
              />
              <YAxis
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => (
                      <span>
                        Avg: {Number(value).toFixed(1)} ({item.payload.count} people)
                        {item.payload.change !== 0 && (
                          <span className={item.payload.change > 0 ? " text-emerald-600" : " text-red-500"}>
                            {" "}({item.payload.change > 0 ? "+" : ""}{item.payload.change.toFixed(1)})
                          </span>
                        )}
                      </span>
                    )}
                  />
                }
              />
              <Bar dataKey="current" radius={[8, 8, 0, 0]} maxBarSize={60}>
                {data.map((_, index) => (
                  <Cell key={index} fill={`url(#groupGrad${index % COLORS.length})`} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.map((g, i) => (
              <div
                key={g.groupName}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="truncate text-xs font-medium">{g.groupName}</span>
                </div>
                <TrendBadge change={g.change} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
