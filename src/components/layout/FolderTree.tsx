"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Folder as FolderIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FolderTreeItem {
  id: string;
  name: string;
  color?: string | null;
  deckCount: number;
}

export function FolderTree({ folders }: { folders: FolderTreeItem[] }) {
  const pathname = usePathname();

  if (folders.length === 0) {
    return <p className="px-3 text-sm text-muted-foreground">No folders yet — create one to get started.</p>;
  }

  return (
    <nav className="flex flex-col gap-1">
      {folders.map((folder) => {
        const href = `/folder/${folder.id}`;
        const active = pathname === href;
        return (
          <Link
            key={folder.id}
            href={href}
            className={cn(
              "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary",
              active && "bg-secondary text-primary"
            )}
          >
            <span className="flex items-center gap-2 truncate">
              <FolderIcon className="h-4 w-4 shrink-0" style={{ color: folder.color ?? undefined }} />
              <span className="truncate">{folder.name}</span>
            </span>
            <span className="text-xs text-muted-foreground">{folder.deckCount}</span>
          </Link>
        );
      })}
    </nav>
  );
}
