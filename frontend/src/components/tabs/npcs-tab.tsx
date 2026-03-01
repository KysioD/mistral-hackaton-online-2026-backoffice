"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { getNpcs, createNpc, updateNpc, deleteNpc, Npc, getTools, createTool } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronsUpDown, Trash2, Users, Edit2, Search, Plus, X, ClipboardPaste } from "lucide-react";
import { useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useDebounce } from "@/hooks/use-debounce";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Copy, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import TextareaAutosize from 'react-textarea-autosize';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const npcSchema = z.object({
  firstName: z.string().min(1, "First name requried"),
  lastName: z.string().min(1, "Last name required"),
  prefab: z.string().min(1, "Prefab model ID required"),
  spawnX: z.coerce.number().default(0),
  spawnY: z.coerce.number().default(0),
  spawnZ: z.coerce.number().default(0),
  spawnRotation: z.coerce.number().default(0),
  characterPrompt: z.string().min(1, "Prompt instructions required"),
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
function ConversationExamplesEditor({ control, register }: { control: any; register: any }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "conversationExamples"
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-muted/30 p-2 rounded">
        <h3 className="font-semibold text-sm">Conversation Examples for RAG</h3>
        <div className="flex space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                const rawJson = JSON.parse(text);
                
                // Helper to format roles correctly (e.g. "user" -> "USER")
                // And to stringify nested tool content/objects
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const formatMessage = (msg: any) => {
                  let formattedRole = msg.role ? msg.role.toUpperCase() : "USER";
                  if (!["USER", "ASSISTANT", "SYSTEM", "TOOL"].includes(formattedRole)) {
                    formattedRole = "USER";
                  }
                  
                  let content = msg.content || "";
                  if (typeof content !== 'string') {
                    content = JSON.stringify(content, null, 2);
                  }
                  
                  return { role: formattedRole, content };
                };

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const formatMessagesArray = (msgs: any[]) => msgs.map(formatMessage);

                if (Array.isArray(rawJson)) {
                  // Check if it's an array of examples [{messages: [...]}] or just one example of messages [...]
                  if (rawJson.length > 0 && rawJson[0].messages) {
                    // It's an array of example objects
                    rawJson.forEach(ex => append({ messages: formatMessagesArray(ex.messages) }));
                  } else {
                    // Assume it's a single array of message objects (e.g., direct paste of the array)
                    append({ messages: formatMessagesArray(rawJson) });
                  }
                } else if (rawJson && rawJson.messages && Array.isArray(rawJson.messages)) {
                    // It's a single example object (e.g., {"messages": [...]})
                    append({ messages: formatMessagesArray(rawJson.messages) });
                } else {
                  alert("Pasted JSON format not recognized. Expected an array of messages.");
                }
              } catch (e) {
                alert("Failed to parse clipboard. Make sure you copied valid JSON.");
                console.error(e);
              }
            }}
          >
            <ClipboardPaste className="mr-2 h-4 w-4" /> Paste JSON
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={() => append({ 
              messages: [
                { role: "USER", content: "Hello there!" },
                { role: "ASSISTANT", content: "Greetings, traveler." }
              ] 
            })}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Example
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {fields.map((field, exampleIndex) => {
          const isExpanded = expanded[field.id] === true; // Default to collapsed
          return (
            <div key={field.id} className="border rounded-md relative bg-card/50">
              <div 
                className="flex items-center justify-between p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpanded(prev => ({ ...prev, [field.id]: !isExpanded }))}
              >
                <div className="flex items-center">
                  {isExpanded ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                    Example {exampleIndex + 1}
                  </h4>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(exampleIndex);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {isExpanded && (
                <div className="p-4">
                  <MessageListEditor control={control} register={register} exampleIndex={exampleIndex} />
                </div>
              )}
            </div>
          );
        })}
        {fields.length === 0 && (
          <div className="text-center p-8 text-muted-foreground text-sm border border-dashed rounded-lg">
            No examples added yet. Add a conversation example to improve the NPC&apos;s conversational ability using RAG.
          </div>
        )}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MessageListEditor({ control, register, exampleIndex }: { control: any; register: any; exampleIndex: number }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `conversationExamples.${exampleIndex}.messages`
  });

  return (
    <div className="space-y-3">
      {fields.map((msgField, msgIndex) => (
        <div key={msgField.id} className="flex gap-2">
          <div className="w-[120px] shrink-0">
            <Controller
              control={control}
              name={`conversationExamples.${exampleIndex}.messages.${msgIndex}.role`}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">USER</SelectItem>
                    <SelectItem value="ASSISTANT">ASSISTANT</SelectItem>
                    <SelectItem value="SYSTEM">SYSTEM</SelectItem>
                    <SelectItem value="TOOL">TOOL</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex-1 relative">
            <TextareaAutosize 
              {...register(`conversationExamples.${exampleIndex}.messages.${msgIndex}.content`)}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[40px] resize-none" 
              placeholder="Message content..." 
              minRows={2}
              maxRows={20}
            />
            {fields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => remove(msgIndex)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
      <Button 
        type="button" 
        variant="ghost" 
        size="sm" 
        className="w-full mt-2 border border-dashed"
        onClick={() => append({ role: "USER", content: "" })}
      >
        <Plus className="mr-2 h-4 w-4" /> Add Message Context
      </Button>
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
      toolNames: [],
      conversationExamples: []
    },
  });

  const resetForm = () => {
    form.reset({ firstName: "", lastName: "", prefab: "Villager", spawnX: 0, spawnY: 0, spawnZ: 0, spawnRotation: 0, characterPrompt: "", toolNames: [], conversationExamples: [] });
    setEditingNpc(null);
  };

  const handleEdit = (npc: Npc) => {
    setEditingNpc(npc);
    form.reset({
      firstName: npc.firstName, lastName: npc.lastName, prefab: npc.prefab,
      spawnX: npc.spawnX, spawnY: npc.spawnY, spawnZ: npc.spawnZ, spawnRotation: npc.spawnRotation,
      characterPrompt: npc.characterPrompt,
      toolNames: npc.tools ? npc.tools.map((t) => t.tool.name) : [],
      conversationExamples: npc.conversationExamples
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? npc.conversationExamples.map((ex: any) => ({
            // The backend sends messages as Prisma JSON, which might still be stringified,
            // or directly as an array depending on how it was saved.
            messages: Array.isArray(ex.messages)
              ? ex.messages 
              : (typeof ex.messages === 'string' ? JSON.parse(ex.messages) : [])
          }))
        : []
    });
    setIsDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (data: NpcFormValues) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        ...data,
      };
      if (data.conversationExamples) {
        payload.conversationExamples = data.conversationExamples.map(ex => ex.messages);
      }
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
              className="max-w-3xl max-h-[90vh] overflow-y-auto z-[50]"
              // Crucial fix: do not close NPC dialog if we click "outside" because we might be interacting with the CreateToolDialog
              onInteractOutside={(e) => {
                if (isToolDialogOpen) {
                  e.preventDefault();
                }
              }}
            >
              <DialogHeader><DialogTitle>{editingNpc ? "Edit NPC" : "Create NPC"}</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-6">
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
                      <ConversationExamplesEditor control={form.control} register={form.register} />
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-end pt-4">
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
                <TableHead>ID</TableHead>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Prefab</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Tools</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data?.map((npc) => (
                <TableRow key={npc.id}>
                  <TableCell>
                    <div 
                      className="flex items-center gap-2 cursor-pointer text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => {
                        navigator.clipboard.writeText(npc.id);
                        toast({ title: "Copied!", description: "NPC ID copied to clipboard." });
                      }}
                      title="Click to copy ID"
                    >
                      {npc.id.slice(0, 8)}... <Copy className="h-3 w-3" />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{npc.firstName}</TableCell>
                  <TableCell>{npc.lastName}</TableCell>
                  <TableCell><Badge variant="outline">{npc.prefab}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-xs font-mono">
                    {npc.spawnX.toFixed(1)}, {npc.spawnY.toFixed(1)}, {npc.spawnZ.toFixed(1)} / {npc.spawnRotation}°
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {npc.tools?.slice(0, 3).map((nt) => <Badge key={nt.tool.id} variant="secondary" className="text-[10px]">{nt.tool.name}</Badge>)}
                      {npc.tools && npc.tools.length > 3 && <Badge variant="secondary" className="text-[10px]">+{npc.tools.length - 3}</Badge>}
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
