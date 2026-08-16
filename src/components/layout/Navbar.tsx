"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { BookOpenText, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BookOpenText className="h-5 w-5" />
          </div>
          <span className="hidden sm:inline">Lingo Cards</span>
        </Link>

        <div className="flex items-center gap-2">
          {session?.user.role === "ADMIN" && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin">
                <ShieldCheck className="mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            </Button>
          )}
          <span className="hidden text-sm text-muted-foreground sm:inline">{session?.user.name}</span>
          <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
