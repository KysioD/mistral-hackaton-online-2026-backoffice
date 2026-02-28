"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NpcsTab } from "@/components/tabs/npcs-tab";
import { ToolsTab } from "@/components/tabs/tools-tab";
import { SystemPromptsTab } from "@/components/tabs/system-prompts-tab";

export default function Home() {
  return (
    <main className="container mx-auto p-8 pt-12 max-w-6xl">
      <div className="flex flex-col space-y-2 mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight">Mistral Backoffice</h1>
        <p className="text-muted-foreground text-lg">Manage game intelligence: NPCs, functions, and world lore.</p>
      </div>

      <Tabs defaultValue="npcs" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 h-12">
          <TabsTrigger value="npcs" className="text-base">NPCs Roster</TabsTrigger>
          <TabsTrigger value="tools" className="text-base">Tools Registry</TabsTrigger>
          <TabsTrigger value="prompts" className="text-base">Global Prompts</TabsTrigger>
        </TabsList>

        <div className="bg-card text-card-foreground shadow-sm rounded-xl border p-6 h-[calc(100vh-250px)] min-h-[600px] flex flex-col">
          <TabsContent value="npcs" className="m-0 focus-visible:outline-none h-full data-[state=active]:flex flex-col min-h-0">
            <NpcsTab />
          </TabsContent>
          <TabsContent value="tools" className="m-0 focus-visible:outline-none h-full data-[state=active]:flex flex-col min-h-0">
            <ToolsTab />
          </TabsContent>
          <TabsContent value="prompts" className="m-0 focus-visible:outline-none h-full data-[state=active]:flex flex-col min-h-0">
            <SystemPromptsTab />
          </TabsContent>
        </div>
      </Tabs>
    </main>
  );
}