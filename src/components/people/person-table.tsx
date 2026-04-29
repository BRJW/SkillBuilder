"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { PersonWithSteps } from "@/lib/types";

function getStepBadgeVariant(step: number) {
  if (step >= 80) return "default";
  if (step >= 60) return "secondary";
  return "outline";
}

export function PersonTable({
  people,
  rubricId,
}: {
  people: PersonWithSteps[];
  rubricId: string;
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Group</TableHead>
            <TableHead className="text-right">Avg Step</TableHead>
            <TableHead className="text-right">Assessments</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {people.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                No data found for the selected filters.
              </TableCell>
            </TableRow>
          ) : (
            people.map((person) => (
              <TableRow key={person.id}>
                <TableCell>
                  <Link
                    href={`/dashboard/${rubricId}/person/${person.id}`}
                    className="font-medium hover:underline"
                  >
                    {person.firstName} {person.lastName}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {person.groupName}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={getStepBadgeVariant(person.averageStep)}>
                    {person.averageStep.toFixed(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {person.stepCount}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
