"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Performer {
  name: string;
  groupName: string;
  avg: number;
}

function ScoreBar({ value, max = 100, color, delay = 0 }: { value: number; max?: number; color: string; delay?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, delay, ease: "easeOut" }}
      />
    </div>
  );
}

const listItem = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0 },
};

export function TopBottomChart({
  top,
  bottom,
}: {
  top: Performer[];
  bottom: Performer[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Top & Bottom Performers</CardTitle>
          <CardDescription>Highest and lowest average steps</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
              Top Performers
            </div>
            <motion.div
              className="space-y-3"
              initial="hidden"
              animate="show"
              transition={{ staggerChildren: 0.06 }}
            >
              {top.map((p, i) => (
                <motion.div key={i} className="space-y-1" variants={listItem}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{p.name}</span>
                    <Badge variant="secondary" className="text-xs">{p.avg.toFixed(1)}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <ScoreBar value={p.avg} color="hsl(152, 60%, 48%)" delay={i * 0.06} />
                    <span className="text-xs text-muted-foreground w-20 text-right">{p.groupName}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <div className="border-t" />

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-red-500">
              <TrendingDown className="h-3.5 w-3.5" />
              Needs Improvement
            </div>
            <motion.div
              className="space-y-3"
              initial="hidden"
              animate="show"
              transition={{ staggerChildren: 0.06, delayChildren: 0.3 }}
            >
              {bottom.map((p, i) => (
                <motion.div key={i} className="space-y-1" variants={listItem}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{p.name}</span>
                    <Badge variant="outline" className="text-xs">{p.avg.toFixed(1)}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <ScoreBar value={p.avg} color="hsl(0, 70%, 55%)" delay={0.3 + i * 0.06} />
                    <span className="text-xs text-muted-foreground w-20 text-right">{p.groupName}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
