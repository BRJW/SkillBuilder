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
import type { PersonWithScore } from "@/lib/types";

function getScoreBadgeVariant(score: number) {
  if (score >= 80) return "default";
  if (score >= 60) return "secondary";
  return "outline";
}

export function PersonTable({
  people,
  rubricId,
}: {
  people: PersonWithScore[];
  rubricId: string;
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Group</TableHead>
            <TableHead className="text-right">Avg Score</TableHead>
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
                  <Badge variant={getScoreBadgeVariant(person.averageScore)}>
                    {person.averageScore.toFixed(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {person.scoreCount}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
