"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { getNpcs, createNpc, updateNpc, deleteNpc, Npc, getTools, createTool, getNpcExamples, addNpcExamples, clearNpcExamples, deleteNpcExample } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronsUpDown, Trash2, Users, Edit2, Search, Plus, X, ClipboardPaste, Upload } from "lucide-react";
import { useState, useRef } from "react";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useDebounce } from "@/hooks/use-debounce";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Copy, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const npcSchema = z.object({
  firstName: z.string().min(1, "First name requried"),
  lastName: z.string().min(1, "Last name required"),
  prefab: z.string().min(1, "Prefab model ID required"),
  spawnX: z.coerce.number().default(0),
  spawnY: z.coerce.number().default(0),
  spawnZ: z.coerce.number().default(0),
  spawnRotation: z.coerce.number().default(0),
  characterPrompt: z.string().min(1, "Prompt instructions required"),
  voiceId: z.string().optional(),
  toolNames: z.array(z.string()).default([]),
  conversationExamples: z.array(
    z.object({
      messages: z.array(
        z.object({
          role: z.string(),
          content: z.string()
        })
      )
    })
  ).default([])
});

type NpcFormValues = z.infer<typeof npcSchema>;

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

function CreateToolDialog({ open, onOpenChange, onToolCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onToolCreated: (name: string) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ToolFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(toolSchema) as any,
    defaultValues: { name: "", description: "", parameters: [] },
  });

  const { fields, append, remove } = useFieldArray({ name: "parameters", control: form.control });

  const saveMutation = useMutation({
    mutationFn: createTool,
    onSuccess: (newTool) => {
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      queryClient.invalidateQueries({ queryKey: ["tools-infinite"] });
      toast({ title: "Success", description: "Tool created." });
      onOpenChange(false);
      form.reset();
      
      // Handle NestJS generic interceptor wrapping response in .data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createdName = (newTool as any).data ? (newTool as any).data.name : newTool.name;
      onToolCreated(createdName);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[100]" onInteractOutside={(e) => {
        // Prevent clicking outside from aggressively bubbling to lower dialogs
        e.preventDefault();
        onOpenChange(false);
      }}>
        <DialogHeader><DialogTitle>Create Tool</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Function Name</FormLabel><FormControl><Input placeholder="give_gold" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Desc..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium leading-none">Parameters</h4>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", description: "", required: false })}>Add Param</Button>
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 border p-2 rounded items-center">
                  <div className="col-span-4 flex flex-col gap-1">
                    <Input placeholder="Name" {...form.register(`parameters.${index}.name`)} />
                  </div>
                  <div className="col-span-6 flex flex-col gap-1">
                    <Input placeholder="Desc" {...form.register(`parameters.${index}.description`)} />
                  </div>
                  <div className="col-span-1 flex items-center">
                    <Controller
                      control={form.control}
                      name={`parameters.${index}.required`}
                      render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save Tool"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ConversationExamplesEditor({ control, npcId }: { control: any; npcId: string | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditMode = npcId !== null;

  // Track upload status message for user feedback
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  // Track expanded state for saved examples (edit mode)
  const [expandedSaved, setExpandedSaved] = useState<Record<string, boolean>>({});

  // === EDIT MODE: load examples from API with infinite scroll ===
  const {
    data: examplesPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingExamples,
  } = useInfiniteQuery({
    queryKey: ["npc-examples", npcId],
    queryFn: ({ pageParam = 1 }) => getNpcExamples(npcId!, pageParam as number, 20),
    initialPageParam: 1,
    getNextPageParam: (last) => last.meta.lastPage > last.meta.page ? last.meta.page + 1 : undefined,
    enabled: isEditMode,
  });

  const allSavedExamples = examplesPages?.pages.flatMap(p => p.data) ?? [];
  const totalExamples = examplesPages?.pages[0]?.meta.total ?? 0;

  const addExamplesMutation = useMutation({
    mutationFn: (examples: unknown[]) => addNpcExamples(npcId!, examples),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["npc-examples", npcId] });
      setUploadStatus(null);
      toast({ title: "Examples added", description: `${result.added} example(s) added successfully.` });
    },
    onError: (err: Error) => {
      setUploadStatus(null);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const clearExamplesMutation = useMutation({
    mutationFn: () => clearNpcExamples(npcId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["npc-examples", npcId] });
      toast({ title: "Cleared", description: "All examples removed." });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteExampleMutation = useMutation({
    mutationFn: (exampleId: string) => deleteNpcExample(npcId!, exampleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["npc-examples", npcId] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const t = e.currentTarget;
    if (t.scrollHeight - t.scrollTop <= t.clientHeight + 80) {
      if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    }
  };

  // === CREATE MODE: field array ===
  const { fields, append, remove } = useFieldArray({ control, name: "conversationExamples" });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // Watch live form values so we can read messages for preview in create mode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const watchedExamples: any[] = useWatch({ control, name: "conversationExamples" }) ?? [];

  // === Shared helpers ===
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parseExamplesFromJson = (rawJson: any): { messages: { role: string; content: string }[] }[] | null => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fmt = (msg: any) => {
      let role = msg.role ? msg.role.toUpperCase() : "USER";
      if (!["USER", "ASSISTANT", "SYSTEM", "TOOL"].includes(role)) role = "USER";
      let content = msg.content || "";
      if (typeof content !== "string") content = JSON.stringify(content, null, 2);
      return { role, content };
    };
    if (Array.isArray(rawJson)) {
      if (rawJson.length > 0 && rawJson[0].messages) {
        return rawJson.map(ex => ({ messages: ex.messages.map(fmt) }));
      }
      return [{ messages: rawJson.map(fmt) }];
    }
    if (rawJson?.messages && Array.isArray(rawJson.messages)) {
      return [{ messages: rawJson.messages.map(fmt) }];
    }
    return null;
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const rawJson = JSON.parse(text);
      const examples = parseExamplesFromJson(rawJson);
      if (!examples) {
        toast({ title: "Unrecognized format", description: "Expected an array of messages or example objects.", variant: "destructive" });
        return;
      }
      if (isEditMode) {
        setUploadStatus(`Processing ${examples.length} example(s) — generating embeddings…`);
        addExamplesMutation.mutate(examples);
      } else {
        examples.forEach(ex => append(ex));
        toast({ title: "Examples pasted", description: `${examples.length} example(s) added from clipboard.` });
      }
    } catch {
      toast({ title: "Parse error", description: "Failed to parse clipboard. Make sure you copied valid JSON.", variant: "destructive" });
    }
  };

  const handleFileUpload = async (files: FileList) => {
    const fileArray = Array.from(files);
    const parsed: { messages: { role: string; content: string }[] }[] = [];
    let skipped = 0;
    for (let fi = 0; fi < fileArray.length; fi++) {
      setUploadStatus(`Reading file ${fi + 1} of ${fileArray.length}…`);
      try {
        const text = await fileArray[fi].text();
        const rawJson = JSON.parse(text);
        const examples = parseExamplesFromJson(rawJson);
        if (examples) parsed.push(...examples); else skipped++;
      } catch { skipped++; }
    }
    if (parsed.length === 0) {
      setUploadStatus(null);
      toast({ title: "No examples found", description: `None of the ${files.length} file(s) contained valid examples.`, variant: "destructive" });
      return;
    }
    if (isEditMode) {
      setUploadStatus(`Uploading ${parsed.length} example(s) — generating embeddings…`);
      addExamplesMutation.mutate(parsed);
    } else {
      setUploadStatus(null);
      parsed.forEach(ex => append(ex));
      const skippedMsg = skipped > 0 ? ` (${skipped} file(s) skipped)` : "";
      toast({ title: "Files imported", description: `${parsed.length} example(s) imported from ${files.length} file(s).${skippedMsg}` });
    }
  };

  const isBusy = addExamplesMutation.isPending || clearExamplesMutation.isPending;

  const ActionButtons = () => (
    <div className="flex space-x-2 flex-wrap gap-y-1">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        accept=".json,application/json"
        onChange={(e) => { if (e.target.files?.length) { handleFileUpload(e.target.files); e.target.value = ""; } }}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isBusy}>
        <Upload className="mr-2 h-4 w-4" /> Upload files
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={handlePaste} disabled={isBusy}>
        <ClipboardPaste className="mr-2 h-4 w-4" /> Paste JSON
      </Button>
      {!isEditMode && (
        <Button type="button" variant="outline" size="sm" onClick={() => append({ messages: [{ role: "USER", content: "" }, { role: "ASSISTANT", content: "" }] })}>
          <Plus className="mr-2 h-4 w-4" /> Add example
        </Button>
      )}
      {isEditMode && totalExamples > 0 && (
        <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive"
          onClick={() => clearExamplesMutation.mutate()} disabled={isBusy}>
          <Trash2 className="mr-2 h-4 w-4" /> Clear all
        </Button>
      )}
    </div>
  );

  // Role badge colours
  const roleBadgeClass = (role: string) => {
    switch (role?.toUpperCase()) {
      case "USER": return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
      case "ASSISTANT": return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
      case "SYSTEM": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300";
      case "TOOL": return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
      default: return "bg-muted text-muted-foreground";
    }
  };

  // === EDIT MODE render ===
  if (isEditMode) {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center bg-muted/30 p-2 rounded">
          <h3 className="font-semibold text-sm">
            Conversation Examples for RAG
            {totalExamples > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">({totalExamples} total)</span>
            )}
          </h3>
          <ActionButtons />
        </div>

        {/* Upload/processing feedback banner */}
        {addExamplesMutation.isPending && uploadStatus && (
          <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 px-3 py-2 text-sm text-blue-700 dark:text-blue-300">
            <svg className="h-4 w-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {uploadStatus}
          </div>
        )}

        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1" onScroll={handleScroll}>
          {isLoadingExamples && (
            <div className="text-center p-8 text-muted-foreground text-sm">Loading examples…</div>
          )}
          {!isLoadingExamples && allSavedExamples.length === 0 && (
            <div className="text-center p-8 text-muted-foreground text-sm border border-dashed rounded-lg">
              No examples yet. Paste JSON or upload files to add conversation examples.
            </div>
          )}
          {allSavedExamples.map((ex, i) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const msgs: any[] = Array.isArray(ex.messages) ? ex.messages : [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const firstUser = msgs.find((m: any) => m.role?.toUpperCase() === "USER");
            const preview = firstUser?.content?.slice(0, 90) || msgs[0]?.content?.slice(0, 90) || "—";
            const isExpanded = expandedSaved[ex.id] === true;
            const isDeleting = deleteExampleMutation.isPending && deleteExampleMutation.variables === ex.id;

            return (
              <div key={ex.id} className={`border rounded-md bg-card/50 transition-opacity ${isDeleting ? "opacity-40 pointer-events-none" : ""}`}>
                {/* Header row — click to expand */}
                <div
                  className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => setExpandedSaved(prev => ({ ...prev, [ex.id]: !isExpanded }))}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                    <span className="text-xs font-semibold text-muted-foreground shrink-0">#{i + 1}</span>
                    <span className="text-xs text-foreground truncate">{preview}{(firstUser?.content?.length ?? msgs[0]?.content?.length ?? 0) > 90 ? "…" : ""}</span>
                    <span className="text-[10px] text-muted-foreground/60 shrink-0">({msgs.length} msg)</span>
                  </div>
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="h-6 w-6 ml-2 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); deleteExampleMutation.mutate(ex.id); }}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Expanded message list */}
                {isExpanded && (
                  <div className="border-t px-3 py-3 space-y-2">
                    {msgs.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No messages.</p>
                    ) : (
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      msgs.map((msg: any, mi: number) => (
                        <div key={mi} className="flex gap-2 items-start">
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${roleBadgeClass(msg.role)}`}>
                            {msg.role || "?"}
                          </span>
                          <pre className="text-xs whitespace-pre-wrap break-words flex-1 text-foreground font-sans leading-relaxed">
                            {typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content, null, 2)}
                          </pre>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {isFetchingNextPage && <div className="text-center py-2 text-xs text-muted-foreground">Loading more…</div>}
        </div>
      </div>
    );
  }

  // === CREATE MODE render ===
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center bg-muted/30 p-2 rounded">
        <h3 className="font-semibold text-sm">
          Conversation Examples for RAG
          {fields.length > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">({fields.length} queued)</span>
          )}
        </h3>
        <ActionButtons />
      </div>
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {fields.map((field, exampleIndex) => {
          const isExpanded = expanded[field.id] === true;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const msgs: any[] = watchedExamples[exampleIndex]?.messages ?? [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const firstUser = msgs.find((m: any) => m.role?.toUpperCase() === "USER");
          const preview = firstUser?.content?.slice(0, 90) || msgs[0]?.content?.slice(0, 90) || "—";
          return (
            <div key={field.id} className="border rounded-md bg-card/50">
              <div
                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors select-none"
                onClick={() => setExpanded(prev => ({ ...prev, [field.id]: !isExpanded }))}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                  <span className="text-xs font-semibold text-muted-foreground shrink-0">#{exampleIndex + 1}</span>
                  <span className="text-xs text-foreground truncate">{preview}{(firstUser?.content?.length ?? msgs[0]?.content?.length ?? 0) > 90 ? "…" : ""}</span>
                  <span className="text-[10px] text-muted-foreground/60 shrink-0">({msgs.length} msg)</span>
                </div>
                <Button
                  type="button" variant="ghost" size="icon"
                  className="h-6 w-6 ml-2 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); remove(exampleIndex); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {isExpanded && (
                <div className="border-t px-3 py-3 space-y-2">
                  {msgs.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No messages.</p>
                  ) : (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    msgs.map((msg: any, mi: number) => (
                      <div key={mi} className="flex gap-2 items-start">
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${roleBadgeClass(msg.role)}`}>
                          {msg.role || "?"}
                        </span>
                        <pre className="text-xs whitespace-pre-wrap break-words flex-1 text-foreground font-sans leading-relaxed">
                          {typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content, null, 2)}
                        </pre>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
        {fields.length === 0 && (
          <div className="text-center p-8 text-muted-foreground text-sm border border-dashed rounded-lg">
            No examples yet. Paste JSON or upload files to add conversation examples.
          </div>
        )}
      </div>
    </div>
  );
}

export function NpcsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNpc, setEditingNpc] = useState<Npc | null>(null);
  const [npcToDelete, setNpcToDelete] = useState<Npc | null>(null);
  
  // Pagination & Popover
  const [page, setPage] = useState(1);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [isToolDialogOpen, setIsToolDialogOpen] = useState(false);

  // Combobox infinite search 
  const [toolSearch, setToolSearch] = useState("");
  const debouncedToolSearch = useDebounce(toolSearch, 300);

  const { data: toolsInfinite, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["tools-infinite", debouncedToolSearch],
    queryFn: ({ pageParam = 1 }) => getTools(pageParam, 15, debouncedToolSearch),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.meta.lastPage > lastPage.meta.page ? lastPage.meta.page + 1 : undefined
  });

  const allTools = toolsInfinite?.pages.flatMap((p) => p.data) || [];

  const handleToolScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  };

  const { data, isLoading } = useQuery({ 
    queryKey: ["npcs", page, debouncedSearch], 
    queryFn: () => getNpcs(page, debouncedSearch) 
  });

  const form = useForm<NpcFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(npcSchema) as any,
    defaultValues: { 
      firstName: "", lastName: "", prefab: "Villager", 
      spawnX: 0, spawnY: 0, spawnZ: 0, spawnRotation: 0, characterPrompt: "",
      voiceId: "",
      toolNames: [],
      conversationExamples: []
    },
  });

  const resetForm = () => {
    form.reset({ firstName: "", lastName: "", prefab: "Villager", spawnX: 0, spawnY: 0, spawnZ: 0, spawnRotation: 0, characterPrompt: "", voiceId: "", toolNames: [], conversationExamples: [] });
    setEditingNpc(null);
  };

  const handleEdit = (npc: Npc) => {
    setEditingNpc(npc);
    form.reset({
      firstName: npc.firstName, lastName: npc.lastName, prefab: npc.prefab,
      spawnX: npc.spawnX, spawnY: npc.spawnY, spawnZ: npc.spawnZ, spawnRotation: npc.spawnRotation,
      characterPrompt: npc.characterPrompt,
      voiceId: npc.voiceId || "",
      toolNames: npc.tools ? npc.tools.map((t) => t.tool.name) : [],
        conversationExamples: []
    });
    setIsDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (data: NpcFormValues) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = { ...data };
      // For new NPCs, bundle examples in the create payload
      // For existing NPCs, examples are managed separately via the examples API — don't resend them
      if (editingNpc) {
        delete payload.conversationExamples;
      } else if (data.conversationExamples) {
        payload.conversationExamples = data.conversationExamples.map(ex => ex.messages);
      }
      if (!payload.voiceId) payload.voiceId = undefined;
      return editingNpc ? updateNpc(editingNpc.id, payload) : createNpc(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["npcs"] });
      toast({ title: "Success", description: `NPC ${editingNpc ? "updated" : "created"}.` });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNpc,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["npcs"] });
      toast({ title: "Deleted", description: "NPC removed." });
    },
  });

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 space-y-4">
      <AlertDialog open={!!npcToDelete} onOpenChange={(open) => !open && setNpcToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {npcToDelete?.firstName} and remove their data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (npcToDelete) deleteMutation.mutate(npcToDelete.id);
                setNpcToDelete(null);
            }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create tool dialog sits totally independent of everything else */}
      <CreateToolDialog 
        open={isToolDialogOpen} 
        onOpenChange={setIsToolDialogOpen} 
        onToolCreated={(name) => {
           const current = form.getValues("toolNames") || [];
           if (!current.includes(name)) {
             form.setValue("toolNames", [...current, name]);
           }
        }} 
      />

      <div className="flex justify-between items-center shrink-0">
        <h2 className="text-2xl font-bold tracking-tight">Non-Playable Characters (NPCs)</h2>
        <div className="flex space-x-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              className="pl-8 w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { 
              // Prevent closing parent NPC modal if the tool inner dialog is what caused focus loss
              if (!open && !isToolDialogOpen) {
                resetForm(); 
                setIsDialogOpen(open); 
              }
              if (open) setIsDialogOpen(true);
            }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingNpc(null)}><Users className="mr-2 h-4 w-4" /> Add NPC</Button>
            </DialogTrigger>
            <DialogContent 
              className="max-w-3xl h-[90vh] flex flex-col overflow-hidden p-0 z-[50]"
              // Crucial fix: do not close NPC dialog if we click "outside" because we might be interacting with the CreateToolDialog
              onInteractOutside={(e) => {
                if (isToolDialogOpen) {
                  e.preventDefault();
                }
              }}
            >
              <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b"><DialogTitle>{editingNpc ? "Edit NPC" : "Create NPC"}</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="flex flex-col flex-1 min-h-0">
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                  <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="general">General Info</TabsTrigger>
                      <TabsTrigger value="examples">Conversation Examples RAG</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="general" className="space-y-6 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                      <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                      <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  
                  <FormField control={form.control} name="prefab" render={({ field }) => (
                    <FormItem><FormLabel>Prefab ID / Model</FormLabel><FormControl><Input placeholder="Blacksmith_Model_V2" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <div className="grid grid-cols-4 gap-4 bg-muted/30 p-4 rounded-lg border">
                    <FormField control={form.control} name="spawnX" render={({ field }) => (
                      <FormItem><FormLabel>Spawn X</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="spawnY" render={({ field }) => (
                      <FormItem><FormLabel>Spawn Y</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="spawnZ" render={({ field }) => (
                      <FormItem><FormLabel>Spawn Z</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="spawnRotation" render={({ field }) => (
                       <FormItem><FormLabel>Rotation °</FormLabel><FormControl><Input type="number" step="1" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="characterPrompt" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Character Specific Persona / Prompt</FormLabel>
                      <FormControl><Textarea className="min-h-[150px]" placeholder="You are John the Blacksmith. You sell weapons to travelers." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="voiceId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>ElevenLabs Voice ID <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <FormControl><Input placeholder="e.g. JBFqnCBsd6RMkjVDRZzb" {...field} /></FormControl>
                      <p className="text-xs text-muted-foreground">Overrides the default <code>ELEVENLABS_VOICE_ID</code> env var for this NPC. Find IDs at <a href="https://elevenlabs.io/voices" target="_blank" rel="noreferrer" className="underline">elevenlabs.io/voices</a>.</p>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField
                    control={form.control}
                    name="toolNames"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-2">
                        <div className="flex flex-col gap-1.5">
                          <FormLabel>Assigned Tools</FormLabel>
                          {field.value?.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {field.value.map((val: string) => (
                                <Badge variant="secondary" key={val} className="flex items-center gap-1 px-2 py-1">
                                  {val}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      field.onChange(field.value.filter((v: string) => v !== val));
                                    }}
                                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-muted"
                                  >
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Popover modal={true} open={comboboxOpen} onOpenChange={setComboboxOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between h-10 px-3 text-muted-foreground"
                              >
                                {field.value?.length > 0 ? `${field.value.length} tool(s) selected...` : "Select tools..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0 shadow-lg border" sideOffset={5}>
                            <Command shouldFilter={false}>
                              <CommandInput 
                                placeholder="Search tools..." 
                                value={toolSearch}
                                onValueChange={setToolSearch}
                              />
                              <CommandList onScroll={handleToolScroll} className="max-h-[250px] overflow-y-auto">
                                <CommandEmpty>
                                  <div className="p-4 text-center text-sm text-muted-foreground">
                                    No tools match your search.
                                  </div>
                                </CommandEmpty>
                                <CommandGroup>
                                  {allTools.map((tool) => (
                                    <CommandItem
                                      key={tool.id}
                                      value={tool.name}
                                      onSelect={() => {
                                        const isSelected = field.value?.includes(tool.name);
                                        if (isSelected) {
                                          field.onChange(field.value.filter((v: string) => v !== tool.name));
                                        } else {
                                          field.onChange([...(field.value || []), tool.name]);
                                        }
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          field.value?.includes(tool.name) ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col overflow-hidden">
                                        <span className="font-medium truncate">{tool.name}</span>
                                        <span className="text-xs text-muted-foreground truncate max-w-[300px]">{tool.description}</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                  {isFetchingNextPage && (
                                    <div className="p-2 text-center text-xs text-muted-foreground">Loading more tools...</div>
                                  )}
                                </CommandGroup>
                              </CommandList>
                              <div className="border-t p-2 bg-muted/50">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  type="button" 
                                  className="w-full" 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setComboboxOpen(false);
                                    setIsToolDialogOpen(true);
                                  }}
                                >
                                  <Plus className="mr-2 h-4 w-4" /> Create New Tool
                                </Button>
                              </div>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                    </TabsContent>
                    
                    <TabsContent value="examples" className="pt-4">
                      <ConversationExamplesEditor control={form.control} npcId={editingNpc?.id ?? null} />
                    </TabsContent>
                  </Tabs>
                  </div>

                  <div className="shrink-0 flex justify-end px-6 py-4 border-t">
                    <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save NPC"}</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading NPCs...</div>
      ) : (
        <div className="rounded-md border flex-1 overflow-auto bg-card min-h-[300px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px]">ID</TableHead>
                <TableHead className="w-[120px]">First Name</TableHead>
                <TableHead className="w-[120px]">Last Name</TableHead>
                <TableHead className="w-[130px]">Prefab</TableHead>
                <TableHead className="w-[200px]">Position</TableHead>
                <TableHead>Tools</TableHead>
                <TableHead className="w-[90px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data?.map((npc) => (
                <TableRow key={npc.id} className="align-middle">
                  <TableCell>
                    <div 
                      className="flex items-center gap-2 cursor-pointer text-xs font-mono text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                      onClick={() => {
                        navigator.clipboard.writeText(npc.id);
                        toast({ title: "Copied!", description: "NPC ID copied to clipboard." });
                      }}
                      title="Click to copy ID"
                    >
                      {npc.id.slice(0, 8)}... <Copy className="h-3 w-3 shrink-0" />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{npc.firstName}</TableCell>
                  <TableCell className="whitespace-nowrap">{npc.lastName}</TableCell>
                  <TableCell><Badge variant="outline" className="whitespace-nowrap">{npc.prefab}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-xs font-mono whitespace-nowrap">
                    {npc.spawnX.toFixed(1)}, {npc.spawnY.toFixed(1)}, {npc.spawnZ.toFixed(1)} / {npc.spawnRotation}°
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-nowrap items-center gap-1">
                      {npc.tools?.slice(0, 3).map((nt) => <Badge key={nt.tool.id} variant="secondary" className="text-[10px] whitespace-nowrap shrink-0">{nt.tool.name}</Badge>)}
                      {npc.tools && npc.tools.length > 3 && <Badge variant="secondary" className="text-[10px] shrink-0">+{npc.tools.length - 3}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(npc)}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setNpcToDelete(npc)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {data?.data?.length === 0 && <TableRow><TableCell colSpan={7} className="h-24 text-center">No NPCs found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
      
      <div className="py-3 mt-auto shrink-0 border-t">
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
