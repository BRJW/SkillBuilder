"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import type { RubricStats } from "@/lib/types";
import { Users, BarChart3, Award, Activity, Target } from "lucide-react";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, damping: 20, stiffness: 300 } },
};

export function StatsCards({ stats }: { stats: RubricStats }) {
  const cards = [
    {
      title: "Completion",
      value: `${Math.round(stats.completionRate)}%`,
      subtitle: `${stats.assessedPeople} of ${stats.totalPeople}`,
      icon: Users,
      color: "from-blue-500/10 to-blue-600/5",
      iconColor: "text-blue-500",
      ring: "ring-blue-500/10",
    },
    {
      title: "Mean",
      value: stats.mean.toFixed(1),
      subtitle: `Median ${stats.median.toFixed(1)}`,
      icon: BarChart3,
      color: "from-emerald-500/10 to-emerald-600/5",
      iconColor: "text-emerald-500",
      ring: "ring-emerald-500/10",
    },
    {
      title: "Meeting Standard",
      value: `${stats.pctMeetingGoal.toFixed(0)}%`,
      subtitle: `Goal: ${stats.goalScore}`,
      icon: Target,
      color: "from-violet-500/10 to-violet-600/5",
      iconColor: "text-violet-500",
      ring: "ring-violet-500/10",
    },
    {
      title: "90th Pctl",
      value: stats.p90.toFixed(1),
      subtitle: `75th: ${stats.p75.toFixed(1)}`,
      icon: Award,
      color: "from-amber-500/10 to-amber-600/5",
      iconColor: "text-amber-500",
      ring: "ring-amber-500/10",
    },
    {
      title: "Spread",
      value: (stats.p90 - stats.p10).toFixed(1),
      subtitle: `P10: ${stats.p10.toFixed(1)} \u2014 P90: ${stats.p90.toFixed(1)}`,
      icon: Activity,
      color: "from-rose-500/10 to-rose-600/5",
      iconColor: "text-rose-500",
      ring: "ring-rose-500/10",
    },
  ];

  return (
    <motion.div
      className="grid gap-4 md:grid-cols-3 lg:grid-cols-5"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {cards.map((card) => (
        <motion.div key={card.title} variants={item}>
          <Card className={`overflow-hidden ring-1 ${card.ring} hover:shadow-lg transition-shadow duration-300`}>
            <CardContent className={`p-5 bg-gradient-to-br ${card.color}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {card.title}
                  </p>
                  <p className="text-3xl font-bold mt-1 tracking-tight">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                </div>
                <div className={`p-2 rounded-lg bg-background/50 ${card.iconColor}`}>
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
