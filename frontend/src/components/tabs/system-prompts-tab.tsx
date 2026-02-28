"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSystemPrompts, SystemPrompt, updateSystemPrompt, createSystemPrompt, deleteSystemPrompt } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export function SystemPromptsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null);
  const [promptToDelete, setPromptToDelete] = useState<SystemPrompt | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["system-prompts", page],
    queryFn: () => getSystemPrompts(page),
  });

  const [formData, setFormData] = useState({ name: "", content: "", active: false });

  const resetForm = () => {
    setFormData({ name: "", content: "", active: false });
    setEditingPrompt(null);
  };

  const handleEdit = (prompt: SystemPrompt) => {
    setEditingPrompt(prompt);
    setFormData({
      name: prompt.name,
      content: prompt.content,
      active: prompt.active,
    });
    setIsDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (data: Partial<SystemPrompt>) => {
      if (editingPrompt) {
        return updateSystemPrompt(editingPrompt.id, data);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return createSystemPrompt(data as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-prompts"] });
      toast({
        title: "Success",
        description: `System prompt ${editingPrompt ? "updated" : "created"} successfully.`,
      });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const setActiveMutation = useMutation({
    mutationFn: (id: string) => updateSystemPrompt(id, { active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-prompts"] });
      toast({
        title: "Active Prompt Updated",
        description: "The global system prompt has been switched.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSystemPrompt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-prompts"] });
      toast({
        title: "Deleted",
        description: "System prompt removed successfully.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <div className="space-y-4 flex flex-col h-full">
      <AlertDialog open={!!promptToDelete} onOpenChange={(open) => !open && setPromptToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the system prompt &quot;{promptToDelete?.name}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (promptToDelete) deleteMutation.mutate(promptToDelete.id);
                setPromptToDelete(null);
            }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex justify-between items-center shrink-0">
        <h2 className="text-2xl font-bold tracking-tight">Global Prompts</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) resetForm();
          setIsDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPrompt(null)}><Plus className="mr-2 h-4 w-4" /> Add Prompt</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>{editingPrompt ? "Edit System Prompt" : "Create System Prompt"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name / Version</Label>
                <Input id="name" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="v2.1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Prompt Content</Label>
                <Textarea id="content" required className="min-h-[200px]" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} placeholder="You are a helpful AI..." />
              </div>
              <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save Prompt"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Preview</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell>
              </TableRow>
            ) : data?.data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">No system prompts found.</TableCell>
              </TableRow>
            ) : (
              data?.data?.map((prompt) => (
                <TableRow key={prompt.id}>
                  <TableCell>
                    {prompt.active ? (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{prompt.name}</TableCell>
                  <TableCell className="max-w-[400px] truncate text-muted-foreground" title={prompt.content}>{prompt.content}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {!prompt.active && (
                      <Button variant="outline" size="sm" onClick={() => setActiveMutation.mutate(prompt.id)} disabled={setActiveMutation.isPending}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Set Active
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(prompt)}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setPromptToDelete(prompt)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="py-2 shrink-0">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
              />
            </PaginationItem>
            <span className="text-sm px-4">Page {page} of {data?.meta?.lastPage || 1}</span>
            <PaginationItem>
              <PaginationNext 
                onClick={() => setPage(p => Math.min(data?.meta?.lastPage || 1, p + 1))}
                className={page === (data?.meta?.lastPage || 1) ? "pointer-events-none opacity-50" : "cursor-pointer"} 
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
