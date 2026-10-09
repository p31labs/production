// useDataStore.ts — Personal planner / life visualizer data layer.
// Persists entries + uploaded file metadata to localStorage.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PlannerEntry {
  id: string;
  date: string;
  mood: number;
  energy: number;
  tasks: string[];
  notes: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: number;
}

interface DataState {
  entries: PlannerEntry[];
  files: UploadedFile[];
  addEntry: (entry: Omit<PlannerEntry, 'id'>) => void;
  removeEntry: (id: string) => void;
  addFile: (file: UploadedFile) => void;
  removeFile: (id: string) => void;
}

export const useDataStore = create<DataState>()(
  persist(
    (set) => ({
      entries: [],
      files: [],
      addEntry: (entry) =>
        set((state) => ({
          entries: [...state.entries, { ...entry, id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }],
        })),
      removeEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        })),
      addFile: (file) =>
        set((state) => ({
          files: [...state.files, file],
        })),
      removeFile: (id) =>
        set((state) => ({
          files: state.files.filter((f) => f.id !== id),
        })),
    }),
    { name: 'p31-data-v1', version: 1 }
  )
);
