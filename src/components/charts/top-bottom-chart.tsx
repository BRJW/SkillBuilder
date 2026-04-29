"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Performer {
  name: string;
  groupName: string;
  avg: number;
}

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function TopBottomChart({
  top,
  bottom,
}: {
  top: Performer[];
  bottom: Performer[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top & Bottom Performers</CardTitle>
        <CardDescription>Highest and lowest average scores</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-600">
            <TrendingUp className="h-3.5 w-3.5" />
            Top Performers
          </div>
          {top.map((p, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{p.name}</span>
                <Badge variant="secondary" className="text-xs">{p.avg.toFixed(1)}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <ScoreBar value={p.avg} color="hsl(152, 60%, 48%)" />
                <span className="text-xs text-muted-foreground w-20 text-right">{p.groupName}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t" />

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-red-500">
            <TrendingDown className="h-3.5 w-3.5" />
            Needs Improvement
          </div>
          {bottom.map((p, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{p.name}</span>
                <Badge variant="outline" className="text-xs">{p.avg.toFixed(1)}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <ScoreBar value={p.avg} color="hsl(0, 70%, 55%)" />
                <span className="text-xs text-muted-foreground w-20 text-right">{p.groupName}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
