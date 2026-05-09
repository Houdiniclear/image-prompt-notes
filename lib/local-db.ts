// 前端 localStorage 数据存储
import type { Note, Category } from "@/types";

const NOTES_KEY = "prompt_notes";
const CATEGORIES_KEY = "prompt_categories";

// 初始化默认数据
function initDefaultData() {
  if (typeof window === "undefined") return;

  if (!localStorage.getItem(NOTES_KEY)) {
    localStorage.setItem(NOTES_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(CATEGORIES_KEY)) {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify([]));
  }
}

// Notes
export function getNotes(): Note[] {
  if (typeof window === "undefined") return [];
  initDefaultData();
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY) || "[]");
  } catch {
    return [];
  }
}

export function getNote(id: string): Note | undefined {
  return getNotes().find((n) => n.id === id);
}

export function createNote(note: Omit<Note, "id" | "createdAt" | "updatedAt">): Note {
  const notes = getNotes();
  const newNote: Note = {
    ...note,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  notes.unshift(newNote);
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  return newNote;
}

export function updateNote(id: string, note: Partial<Note>): Note | undefined {
  const notes = getNotes();
  const index = notes.findIndex((n) => n.id === id);
  if (index === -1) return undefined;
  notes[index] = { ...notes[index], ...note, updatedAt: new Date().toISOString() };
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  return notes[index];
}

export function deleteNote(id: string): boolean {
  const notes = getNotes();
  const filtered = notes.filter((n) => n.id !== id);
  localStorage.setItem(NOTES_KEY, JSON.stringify(filtered));
  return filtered.length < notes.length;
}

// Categories
export function getCategories(): Category[] {
  if (typeof window === "undefined") return [];
  initDefaultData();
  try {
    return JSON.parse(localStorage.getItem(CATEGORIES_KEY) || "[]");
  } catch {
    return [];
  }
}

export function createCategory(category: Omit<Category, "id">): Category {
  const categories = getCategories();
  const newCategory: Category = { ...category, id: Date.now().toString() };
  categories.push(newCategory);
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  return newCategory;
}

export function updateCategory(id: string, category: Partial<Category>): Category | undefined {
  const categories = getCategories();
  const index = categories.findIndex((c) => c.id === id);
  if (index === -1) return undefined;
  categories[index] = { ...categories[index], ...category };
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  return categories[index];
}

export function deleteCategory(id: string): boolean {
  const categories = getCategories();
  const filtered = categories.filter((c) => c.id !== id);
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(filtered));
  return filtered.length < categories.length;
}
