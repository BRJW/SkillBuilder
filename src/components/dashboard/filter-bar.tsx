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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Group {
  id: string;
  name: string;
  district: string | null;
}

export function FilterBar({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentGroupId = searchParams.get("group") || "all";
  const currentGroup = groups.find((g) => g.id === currentGroupId);
  const currentFrom = searchParams.get("from") || "";
  const currentTo = searchParams.get("to") || "";

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
        <Label className="text-xs text-muted-foreground">Group</Label>
        <Select
          value={currentGroupId}
          onValueChange={(v) => updateParam("group", v ?? "all")}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue>
              {currentGroup ? currentGroup.name : "All Groups"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">From</Label>
        <Input
          type="date"
          value={currentFrom}
          onChange={(e) => updateParam("from", e.target.value)}
          className="w-[160px] h-9"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">To</Label>
        <Input
          type="date"
          value={currentTo}
          onChange={(e) => updateParam("to", e.target.value)}
          className="w-[160px] h-9"
        />
      </div>

      {(currentFrom || currentTo) && (
        <button
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("from");
            params.delete("to");
            router.push(`${pathname}?${params.toString()}`);
          }}
          className="text-xs text-muted-foreground hover:text-foreground underline pb-2"
        >
          Clear dates
        </button>
      )}
    </div>
  );
}
