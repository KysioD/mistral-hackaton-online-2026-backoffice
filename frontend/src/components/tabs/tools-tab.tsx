"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTools, createTool, updateTool, deleteTool, Tool } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Wrench } from "lucide-react";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const toolSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  description: z.string().min(5, "Description must be at least 5 characters."),
  parameters: z.array(
    z.object({
      name: z.string().min(1, "Required"),
      description: z.string().min(1, "Required"),
      required: z.boolean().default(false),
    })
  ).default([]),
});

type ToolFormValues = z.infer<typeof toolSchema>;

export function ToolsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [toolToDelete, setToolToDelete] = useState<Tool | null>(null);
  const [page, setPage] = useState(1);

  const { data } = useQuery({ queryKey: ["tools", page], queryFn: () => getTools(page) });

  const form = useForm<ToolFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(toolSchema) as any,
    defaultValues: { name: "", description: "", parameters: [] },
  });

  const { fields, append, remove } = useFieldArray({ name: "parameters", control: form.control });

  const resetForm = () => {
    form.reset({ name: "", description: "", parameters: [] });
    setEditingTool(null);
  };

  const handleEdit = (tool: Tool) => {
    setEditingTool(tool);
    form.reset({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters.map(p => ({
        name: p.name,
        description: p.description,
        required: p.required,
      })),
    });
    setIsDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (data: ToolFormValues) => editingTool ? updateTool(editingTool.id, data) : createTool(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      toast({ title: "Success", description: `Tool ${editingTool ? "updated" : "created"}.` });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTool,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      toast({ title: "Deleted", description: "Tool removed.", variant: "destructive" });
    },
  });

  function onSubmit(data: ToolFormValues) {
    saveMutation.mutate(data);
  }

  return (
    <div className="space-y-4 flex flex-col h-full">
      <AlertDialog open={!!toolToDelete} onOpenChange={(open) => !open && setToolToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the tool &quot;{toolToDelete?.name}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (toolToDelete) deleteMutation.mutate(toolToDelete.id);
                setToolToDelete(null);
            }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex justify-between items-center shrink-0">
        <h2 className="text-2xl font-bold tracking-tight">Tools</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingTool(null)}><Wrench className="mr-2 h-4 w-4" /> Add Tool</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTool ? "Edit Tool" : "Create Tool"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Function Name</FormLabel>
                    <FormControl><Input placeholder="give_gold" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Important: Must clearly describe the tool for LLM context, e.g. &quot;You give gold to someone&quot;)</FormLabel>
                    <FormControl><Textarea placeholder="You give gold to someone." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Parameters</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", description: "", required: false })}>
                      <Plus className="mr-2 h-4 w-4" /> Add Parameter
                    </Button>
                  </div>
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-3 items-start border p-3 rounded-lg bg-slate-50 relative">
                      <div className="col-span-12 flex justify-between">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">Param #{index + 1}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="col-span-12 space-y-2">
                        <FormField control={form.control} name={`parameters.${index}.name`} render={({ field }) => (
                          <FormItem><FormControl><Input placeholder="e.g. amount" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                      <div className="col-span-12 space-y-2">
                        <FormField control={form.control} name={`parameters.${index}.description`} render={({ field }) => (
                          <FormItem><FormControl><Input placeholder="The amount of gold to format" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                      <div className="col-span-12 pt-2 flex justify-start">
                        <FormField control={form.control} name={`parameters.${index}.required`} render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0 text-xs">
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormLabel className="font-normal">Required</FormLabel>
                          </FormItem>
                        )} />
                      </div>
                    </div>
                  ))}
                  {fields.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No parameters defined.</p>}
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save Tool"}</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tool Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Params</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data?.map((tool) => (
              <TableRow key={tool.id}>
                <TableCell className="font-medium font-mono text-sm">{tool.name}</TableCell>
                <TableCell className="max-w-[300px] truncate text-muted-foreground" title={tool.description}>{tool.description}</TableCell>
                <TableCell>{tool.parameters?.length || 0}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(tool)}><Edit2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setToolToDelete(tool)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {data?.data?.length === 0 && <TableRow><TableCell colSpan={4} className="h-24 text-center">No tools found.</TableCell></TableRow>}
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
