export interface ImageItem {
  id: string;
  url: string;
  localPath?: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
}

export interface Note {
  id: string;
  title: string;
  categoryId: string | null;
  url: string;
  images: ImageItem[];
  promptTemplates: PromptTemplate[];
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}
