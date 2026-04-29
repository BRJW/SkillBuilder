"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PercentileBandPoint } from "@/lib/types";

const chartConfig = {
  p90: {
    label: "90th Percentile",
    color: "hsl(210, 70%, 75%)",
  },
  p75: {
    label: "75th Percentile",
    color: "hsl(210, 70%, 60%)",
  },
  p50: {
    label: "Median",
    color: "hsl(210, 70%, 45%)",
  },
  p25: {
    label: "25th Percentile",
    color: "hsl(210, 70%, 60%)",
  },
  p10: {
    label: "10th Percentile",
    color: "hsl(210, 70%, 75%)",
  },
};

export function PercentileBandsChart({
  data,
}: {
  data: PercentileBandPoint[];
}) {
  // Format dates for display
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.assessedAt).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    }),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Percentile Bands Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <AreaChart data={formatted} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              type="monotone"
              dataKey="p90"
              stackId="band"
              stroke="var(--color-p90)"
              fill="var(--color-p90)"
              fillOpacity={0.2}
            />
            <Area
              type="monotone"
              dataKey="p75"
              stackId="band2"
              stroke="var(--color-p75)"
              fill="var(--color-p75)"
              fillOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="p50"
              stackId="band3"
              stroke="var(--color-p50)"
              fill="var(--color-p50)"
              fillOpacity={0.4}
            />
            <Area
              type="monotone"
              dataKey="p25"
              stackId="band4"
              stroke="var(--color-p25)"
              fill="var(--color-p25)"
              fillOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="p10"
              stackId="band5"
              stroke="var(--color-p10)"
              fill="var(--color-p10)"
              fillOpacity={0.2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
