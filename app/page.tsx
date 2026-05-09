"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, FolderOpen, Tag, Image as ImageIcon, Trash2, Settings } from "lucide-react";
import type { Note, Category } from "@/types";
import * as db from "@/lib/local-db";

export default function Home() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#3B82F6");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNotes(db.getNotes());
    setCategories(db.getCategories());
  }, []);

  const filteredNotes = notes.filter((n) => {
    const matchCategory = !selectedCategory || n.categoryId === selectedCategory;
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const createNote = () => {
    setCreating(true);
    try {
      const note = db.createNote({
        title: "新笔记",
        categoryId: selectedCategory,
        url: "",
        images: [],
        promptTemplates: [],
        content: "",
        tags: [],
      });
      setNotes([note, ...notes]);
      router.push(`/note/${note.id}`);
    } catch (e: any) {
      alert("创建失败: " + e.message);
    }
    setCreating(false);
  };

  const createCategory = () => {
    if (!newCategoryName.trim()) return;
    try {
      const cat = db.createCategory({ name: newCategoryName, color: newCategoryColor, icon: "folder" });
      setCategories([...categories, cat]);
      setNewCategoryName("");
    } catch (e) {
      alert("创建分类失败: " + e);
    }
  };

  const deleteCategory = (id: string) => {
    if (!confirm("确定删除这个分类？笔记不会被删除")) return;
    try {
      db.deleteCategory(id);
      setCategories(categories.filter(c => c.id !== id));
      if (selectedCategory === id) setSelectedCategory(null);
    } catch (e) {
      alert("删除分类失败");
    }
  };

  const getCategoryColor = (id: string | null) => {
    const cat = categories.find((c) => c.id === id);
    return cat?.color || "#6B7280";
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 侧边栏 */}
      <div className="w-64 bg-white/80 backdrop-blur-xl border-r border-gray-200/50 flex flex-col shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <h1 className="text-xl font-bold flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ImageIcon size={20} className="text-white" />
            </div>
            生图笔记
          </h1>
        </div>
        <div className="p-4">
          <button onClick={createNote} disabled={creating} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-2.5 px-4 rounded-xl transition-all duration-300 disabled:opacity-50 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5">
            <Plus size={18} /> {creating ? "创建中..." : "新建笔记"}
          </button>
        </div>
        <div className="px-4 py-2 flex-1 overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase">分类</h3>
            <button
              onClick={() => setShowCategoryEditor(!showCategoryEditor)}
              className="text-xs text-blue-500 hover:text-blue-600"
            >
              {showCategoryEditor ? "完成" : "管理"}
            </button>
          </div>

          <button
            onClick={() => setSelectedCategory(null)}
            className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${!selectedCategory ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"}`}
          >
            <FolderOpen size={16} /> 全部 ({notes.length})
          </button>

          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg mt-1 group ${selectedCategory === cat.id ? "bg-blue-50" : "hover:bg-gray-50"}`}
            >
              <button
                onClick={() => setSelectedCategory(cat.id)}
                className="flex-1 text-left flex items-center gap-2"
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className={selectedCategory === cat.id ? "text-blue-600" : "text-gray-600"}>
                  {cat.name}
                </span>
                <span className="text-xs text-gray-400">
                  ({notes.filter((n) => n.categoryId === cat.id).length})
                </span>
              </button>
              {showCategoryEditor && (
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}

          {/* 添加新分类 */}
          {showCategoryEditor && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="分类名称"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === "Enter" && createCategory()}
                />
                <input
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="w-10 h-8 rounded cursor-pointer"
                />
              </div>
              <button
                onClick={createCategory}
                disabled={!newCategoryName.trim()}
                className="w-full py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                + 添加分类
              </button>
            </div>
          )}
        </div>

        {/* 底部设置按钮 */}
        <div className="p-4 border-t border-gray-100">
          <Link
            href="/settings"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 px-3 py-2 rounded-lg transition"
          >
            <Settings size={18} />
            <span className="text-sm">设置</span>
          </Link>
        </div>
      </div>

      {/* 主内容 */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="mb-8">
            <div className="relative">
              <input type="text" placeholder="搜索笔记..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 shadow-sm transition-all duration-300 placeholder-gray-400" />
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {filteredNotes.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                <ImageIcon size={40} className="text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">还没有笔记</h3>
              <p className="text-gray-400">点击左侧"新建笔记"开始你的创作之旅</p>
            </div>
          ) : (
            /* Pinterest 风格瀑布流 */
            <div className="columns-2 md:columns-3 xl:columns-4 gap-5 space-y-5">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="break-inside-avoid bg-white rounded-2xl border border-gray-100/50 shadow-sm hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-500 overflow-hidden group relative hover:-translate-y-1"
                >
                  {/* 删除按钮 */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (confirm(`确定删除「${note.title}」？`)) {
                        db.deleteNote(note.id);
                        setNotes(notes.filter(n => n.id !== note.id));
                      }
                    }}
                    className="absolute top-3 right-3 z-10 p-2 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-500 hover:scale-110 backdrop-blur-sm"
                  >
                    <Trash2 size={14} />
                  </button>

                  <Link href={`/note/${note.id}`} className="block">
                    {note.images.length > 0 && (
                      <div className="relative bg-gradient-to-br from-gray-50 to-gray-100">
                        <img
                          src={note.images[0].url}
                          alt=""
                          className="w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                          loading="lazy"
                        />
                        {/* 图片数量徽章 */}
                        {note.images.length > 1 && (
                          <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/50 backdrop-blur-md text-white text-xs rounded-full">
                            +{note.images.length - 1}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: getCategoryColor(note.categoryId) }} />
                        <h3 className="font-semibold text-gray-800 truncate text-sm">{note.title}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1.5"><ImageIcon size={13} /> {note.images.length}</span>
                        <span className="flex items-center gap-1.5"><Tag size={13} /> {note.promptTemplates.length}</span>
                      </div>
                      {note.promptTemplates.slice(0, 1).map((p) => (
                        <div key={p.id} className="mt-4 p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl text-xs text-gray-600 line-clamp-3 font-mono leading-relaxed">
                          {p.content}
                        </div>
                      ))}
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
