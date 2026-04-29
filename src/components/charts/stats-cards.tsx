import { Card, CardContent } from "@/components/ui/card";
import type { RubricStats } from "@/lib/types";
import { Users, TrendingUp, BarChart3, Target, Activity, Award } from "lucide-react";

export function StatsCards({ stats }: { stats: RubricStats }) {
  const cards = [
    {
      title: "Completion",
      value: `${Math.round(stats.completionRate)}%`,
      subtitle: `${stats.scoredPeople} of ${stats.totalPeople}`,
      icon: Users,
      color: "from-blue-500/10 to-blue-600/5",
      iconColor: "text-blue-500",
    },
    {
      title: "Mean",
      value: stats.mean.toFixed(1),
      subtitle: `Median ${stats.median.toFixed(1)}`,
      icon: BarChart3,
      color: "from-emerald-500/10 to-emerald-600/5",
      iconColor: "text-emerald-500",
    },
    {
      title: "90th Pctl",
      value: stats.p90.toFixed(1),
      subtitle: `75th: ${stats.p75.toFixed(1)}`,
      icon: Award,
      color: "from-violet-500/10 to-violet-600/5",
      iconColor: "text-violet-500",
    },
    {
      title: "Spread",
      value: (stats.p90 - stats.p10).toFixed(1),
      subtitle: `P10: ${stats.p10.toFixed(1)} \u2014 P90: ${stats.p90.toFixed(1)}`,
      icon: Activity,
      color: "from-amber-500/10 to-amber-600/5",
      iconColor: "text-amber-500",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="overflow-hidden">
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
      ))}
    </div>
  );
}
