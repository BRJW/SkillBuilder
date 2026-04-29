"use client";

import { motion } from "framer-motion";
import { Area, CartesianGrid, XAxis, YAxis, Line, ComposedChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PercentileBandPoint } from "@/lib/types";

const chartConfig = {
  p90: { label: "90th Percentile", color: "hsl(210, 70%, 80%)" },
  p75: { label: "75th Percentile", color: "hsl(210, 70%, 65%)" },
  p50: { label: "Median", color: "hsl(210, 80%, 50%)" },
  p25: { label: "25th Percentile", color: "hsl(210, 70%, 65%)" },
  p10: { label: "10th Percentile", color: "hsl(210, 70%, 80%)" },
};

export function PercentileBandsChart({
  data,
}: {
  data: PercentileBandPoint[];
}) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.assessedAt).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    }),
  }));

  const growth = data.length >= 2
    ? (data[data.length - 1].p50 - data[0].p50).toFixed(1)
    : null;

  const spread = data.length >= 2
    ? ((data[data.length - 1].p90 - data[data.length - 1].p10) - (data[0].p90 - data[0].p10)).toFixed(1)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Percentile Bands Over Time</CardTitle>
          <CardDescription>
            Shows how steps spread across percentiles each assessment period
            {growth && (
              <span className={`ml-1 font-medium ${Number(growth) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                (Median {Number(growth) >= 0 ? "+" : ""}{growth} pts)
              </span>
            )}
            {spread && (
              <span className={`ml-1 text-muted-foreground`}>
                &middot; Spread {Number(spread) > 0 ? "+" : ""}{spread}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[380px] w-full">
            <ComposedChart data={formatted} accessibilityLayer>
              <defs>
                <linearGradient id="bandOuter" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(210, 70%, 65%)" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="hsl(210, 70%, 65%)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="bandInner" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(210, 70%, 55%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(210, 70%, 55%)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="p90" stroke="none" fill="url(#bandOuter)" />
              <Area type="monotone" dataKey="p75" stroke="none" fill="url(#bandInner)" />
              <Area type="monotone" dataKey="p25" stroke="none" fill="url(#bandInner)" />
              <Area type="monotone" dataKey="p10" stroke="none" fill="url(#bandOuter)" />
              <Line type="monotone" dataKey="p90" stroke="hsl(210, 60%, 75%)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              <Line type="monotone" dataKey="p75" stroke="hsl(210, 65%, 60%)" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="p50" stroke="hsl(210, 80%, 45%)" strokeWidth={3} dot={{ r: 4, fill: "hsl(210, 80%, 45%)" }} />
              <Line type="monotone" dataKey="p25" stroke="hsl(210, 65%, 60%)" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="p10" stroke="hsl(210, 60%, 75%)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}
