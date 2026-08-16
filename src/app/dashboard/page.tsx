"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FolderPlus, Folder as FolderIcon, Loader2, Trash2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FolderSummary {
  id: string;
  name: string;
  color: string | null;
  _count: { decks: number };
}

const FOLDER_COLORS = ["#6366f1", "#14b8a6", "#f97316", "#ec4899", "#22c55e", "#eab308"];

export default function DashboardPage() {
  const [folders, setFolders] = useState<FolderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(FOLDER_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const loadFolders = async () => {
    setLoading(true);
    const res = await fetch("/api/folders");
    const data = await res.json();
    setFolders(data.folders ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void loadFolders();
  }, []);

  const createFolder = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    setCreating(false);
    setDialogOpen(false);
    setNewName("");
    await loadFolders();
  };

  const deleteFolder = async (id: string) => {
    if (!confirm("Delete this folder and everything inside it?")) return;
    await fetch(`/api/folders/${id}`, { method: "DELETE" });
    setFolders((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Your Folders</h1>
            <p className="text-sm text-muted-foreground">Organize your decks by topic, chapter, or course</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <FolderPlus className="mr-1.5 h-4 w-4" />
            New folder
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : folders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-20 text-center">
            <FolderIcon className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No folders yet</p>
            <p className="text-sm text-muted-foreground">Create your first folder to start building decks.</p>
            <Button className="mt-2" onClick={() => setDialogOpen(true)}>
              <FolderPlus className="mr-1.5 h-4 w-4" />
              New folder
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {folders.map((folder, i) => (
              <motion.div
                key={folder.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
                  <Link href={`/folder/${folder.id}`}>
                    <CardHeader className="pb-3">
                      <div
                        className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${folder.color}22`, color: folder.color ?? undefined }}
                      >
                        <FolderIcon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base">{folder.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {folder._count.decks} deck{folder._count.decks !== 1 && "s"}
                      </p>
                    </CardContent>
                  </Link>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      void deleteFolder(folder.id);
                    }}
                    className="absolute right-3 top-3 rounded-full bg-background/80 p-2 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    aria-label="Delete folder"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new folder</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="folder-name">Name</Label>
              <Input
                id="folder-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. German A2"
                onKeyDown={(e) => e.key === "Enter" && createFolder()}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Color</Label>
              <div className="flex gap-2">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className="h-8 w-8 rounded-full ring-offset-2 transition-all"
                    style={{ backgroundColor: c, boxShadow: newColor === c ? `0 0 0 2px ${c}` : undefined }}
                    aria-label={`Choose color ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createFolder} disabled={!newName.trim() || creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
