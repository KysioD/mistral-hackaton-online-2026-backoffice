export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
  };
}

export interface Npc {
  id: string;
  firstName: string;
  lastName: string;
  prefab: string;
  spawnX: number;
  spawnY: number;
  spawnZ: number;
  spawnRotation: number;
  characterPrompt: string;
  tools: { toolId: string; npcId: string; tool: Tool }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conversationExamples?: { id: string; messages: any[] }[];
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  parameters: ToolParameter[];
}

export interface ToolParameter {
  id?: string; // Optional for creation DTOs
  name: string;
  description: string;
  required: boolean;
}

export interface SystemPrompt {
  id: string;
  name: string;
  content: string;
  active: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 204) return null as unknown as T;
    throw new Error(`API Error: ${response.statusText}`);
  }

  // Handle No Content explicitly when fetch throws parsing JSON
  if (response.status === 204) return null as unknown as T;

  return response.json();
}

// APIs - NPCs
export const getNpcs = (page = 1, search = ""): Promise<PaginatedResult<Npc>> => {
  const query = new URLSearchParams({ page: page.toString(), perPage: "10" });
  if (search) query.append("search", search);
  return fetchApi<PaginatedResult<Npc>>(`/npcs?${query.toString()}`);
};

export const createNpc = (data: Partial<Npc>) => fetchApi<Npc>("/npcs", { method: "POST", body: JSON.stringify(data) });
export const updateNpc = (id: string, data: Partial<Npc>) => fetchApi<Npc>(`/npcs/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteNpc = (id: string) => fetchApi<void>(`/npcs/${id}`, { method: "DELETE" });

// APIs - Tools
export const getTools = (page = 1, limit = 10, search = ""): Promise<PaginatedResult<Tool>> => {
  const query = new URLSearchParams({ page: page.toString(), perPage: limit.toString() });
  if (search) query.append("search", search);
  return fetchApi<PaginatedResult<Tool>>(`/tools?${query.toString()}`);
};
export const createTool = (data: Partial<Tool>) => fetchApi<Tool>("/tools", { method: "POST", body: JSON.stringify(data) });
export const updateTool = (id: string, data: Partial<Tool>) => fetchApi<Tool>(`/tools/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteTool = (id: string) => fetchApi<void>(`/tools/${id}`, { method: "DELETE" });

// APIs - System Prompts
export const getSystemPrompts = (page = 1): Promise<PaginatedResult<SystemPrompt>> => fetchApi<PaginatedResult<SystemPrompt>>(`/system-prompts?page=${page}&perPage=10`);
export const createSystemPrompt = (data: Partial<SystemPrompt>) => fetchApi<SystemPrompt>("/system-prompts", { method: "POST", body: JSON.stringify(data) });
export const updateSystemPrompt = (id: string, data: Partial<SystemPrompt>) => fetchApi<SystemPrompt>(`/system-prompts/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteSystemPrompt = (id: string) => fetchApi<void>(`/system-prompts/${id}`, { method: "DELETE" });
