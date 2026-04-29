export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus } from "lucide-react";
import { getRubrics } from "@/lib/queries/rubrics";
import { Button } from "@/components/ui/button";
import { RubricCard } from "@/components/rubrics/rubric-card";

export default async function RubricsPage() {
  const rubrics = await getRubrics();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rubrics</h1>
          <p className="text-muted-foreground">
            Create and manage assessment rubrics by selecting which skills and
            sub-scores matter.
          </p>
        </div>
        <Button render={<Link href="/rubrics/new" />}>
          <Plus className="mr-2 h-4 w-4" />
          New Rubric
        </Button>
      </div>

      {rubrics.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-medium">No rubrics yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first rubric to start analyzing skills.
          </p>
          <Button className="mt-4" render={<Link href="/rubrics/new" />}>
            <Plus className="mr-2 h-4 w-4" />
            New Rubric
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rubrics.map((rubric) => (
            <RubricCard key={rubric.id} rubric={rubric} />
          ))}
        </div>
      )}
    </div>
  );
}
