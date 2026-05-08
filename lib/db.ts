import fs from "fs/promises";
import path from "path";
import type { Note, Category } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const NOTES_FILE = path.join(DATA_DIR, "notes.json");
const CATEGORIES_FILE = path.join(DATA_DIR, "categories.json");

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (e) {}
}

async function readJSON<T>(filePath: string, defaultValue: T): Promise<T> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    return defaultValue;
  }
}

async function writeJSON<T>(filePath: string, data: T) {
  await ensureDataDir();
  const tempPath = filePath + ".tmp";
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tempPath, filePath);
}

// Notes
export async function getNotes(): Promise<Note[]> {
  return readJSON(NOTES_FILE, []);
}

export async function getNote(id: string): Promise<Note | undefined> {
  const notes = await getNotes();
  return notes.find((n) => n.id === id);
}

export async function createNote(note: Omit<Note, "id" | "createdAt" | "updatedAt">): Promise<Note> {
  const notes = await getNotes();
  const newNote: Note = {
    ...note,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  notes.unshift(newNote);
  await writeJSON(NOTES_FILE, notes);
  return newNote;
}

export async function updateNote(id: string, note: Partial<Note>): Promise<Note | undefined> {
  const notes = await getNotes();
  const index = notes.findIndex((n) => n.id === id);
  if (index === -1) return undefined;
  notes[index] = { ...notes[index], ...note, updatedAt: new Date().toISOString() };
  await writeJSON(NOTES_FILE, notes);
  return notes[index];
}

export async function deleteNote(id: string): Promise<boolean> {
  const notes = await getNotes();
  const filtered = notes.filter((n) => n.id !== id);
  await writeJSON(NOTES_FILE, filtered);
  return filtered.length < notes.length;
}

// Categories
export async function getCategories(): Promise<Category[]> {
  return readJSON(CATEGORIES_FILE, []);
}

export async function createCategory(category: Omit<Category, "id">): Promise<Category> {
  const categories = await getCategories();
  const newCategory: Category = { ...category, id: Date.now().toString() };
  categories.push(newCategory);
  await writeJSON(CATEGORIES_FILE, categories);
  return newCategory;
}

export async function updateCategory(id: string, category: Partial<Category>): Promise<Category | undefined> {
  const categories = await getCategories();
  const index = categories.findIndex((c) => c.id === id);
  if (index === -1) return undefined;
  categories[index] = { ...categories[index], ...category };
  await writeJSON(CATEGORIES_FILE, categories);
  return categories[index];
}

export async function deleteCategory(id: string): Promise<boolean> {
  const categories = await getCategories();
  const filtered = categories.filter((c) => c.id !== id);
  await writeJSON(CATEGORIES_FILE, filtered);
  return filtered.length < categories.length;
}
