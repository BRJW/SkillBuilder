"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface School {
  id: string;
  name: string;
  district: string | null;
}

export function FilterBar({ schools }: { schools: School[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-1.5">
        <Label className="text-xs">School</Label>
        <Select
          value={searchParams.get("school") || "all"}
          onValueChange={(v) => updateParam("school", v ?? "all")}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Schools" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Schools</SelectItem>
            {schools.map((school) => (
              <SelectItem key={school.id} value={school.id}>
                {school.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
