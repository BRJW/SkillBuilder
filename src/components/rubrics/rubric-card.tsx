import Link from "next/link";
import { BarChart3, Pencil, Target, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteRubric } from "@/lib/actions/rubrics";
import type { getRubrics } from "@/lib/queries/rubrics";

type Rubric = Awaited<ReturnType<typeof getRubrics>>[number];

export function RubricCard({ rubric }: { rubric: Rubric }) {
  // Group sub-scores by skill
  const skillGroups: Record<string, number> = {};
  for (const rs of rubric.subScores) {
    const skillName = rs.subScore.skill.name;
    skillGroups[skillName] = (skillGroups[skillName] || 0) + 1;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{rubric.name}</CardTitle>
        {rubric.description && (
          <CardDescription>{rubric.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(skillGroups).map(([skill, count]) => (
            <Badge key={skill} variant="secondary">
              {skill} ({count})
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
          <span>{rubric.subScores.length} sub-scores</span>
          <span className="flex items-center gap-1">
            <Target className="h-3.5 w-3.5 text-emerald-500" />
            Goal: {rubric.goalScore}
          </span>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" size="sm" render={<Link href={`/dashboard/${rubric.id}`} />}>
          <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
          Dashboard
        </Button>
        <Button variant="outline" size="sm" render={<Link href={`/rubrics/${rubric.id}`} />}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Edit
        </Button>
        <form
          action={async () => {
            "use server";
            await deleteRubric(rubric.id);
          }}
        >
          <Button variant="ghost" size="sm" className="text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
