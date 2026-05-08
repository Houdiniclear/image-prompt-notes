"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Trash2, Copy, Plus, Save, Image as ImageIcon, Loader2, AlertCircle, Wand2, RefreshCw, CheckCircle2 } from "lucide-react";
import type { Note, Category, ImageItem, PromptTemplate } from "@/types";

// 12维度信息（直接定义在客户端，避免导入问题）
interface StructuredPrompt {
  art_style: string;
  subject: string;
  composition: string;
  color_palette: string;
  elements: string;
  lighting: string;
  camera_angle: string;
  quality: string;
  aspect_ratio: string;
  layout: string;
  text_elements: string;
  negative: string;
}

const DIMENSION_INFO: Record<keyof StructuredPrompt, { name: string; icon: string }> = {
  art_style: { name: '风格', icon: '🎨' },
  subject: { name: '主题', icon: '📋' },
  composition: { name: '构图', icon: '🖼️' },
  color_palette: { name: '色彩', icon: '🌈' },
  elements: { name: '元素', icon: '✨' },
  lighting: { name: '光影', icon: '💡' },
  camera_angle: { name: '视角', icon: '📐' },
  quality: { name: '画质', icon: '🎯' },
  aspect_ratio: { name: '比例', icon: '📏' },
  layout: { name: '排版', icon: '📝' },
  text_elements: { name: '文字', icon: '🔤' },
  negative: { name: '负面', icon: '💭' },
};

export default function NotePage() {
  const params = useParams();
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [scraping, setScraping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [savingLearning, setSavingLearning] = useState(false);

  // 结构化提取结果
  const [structuredResult, setStructuredResult] = useState<{
    extraction: StructuredPrompt;
    confidence: Record<string, number>;
    sampleId?: string;
    hasBeenLearned?: boolean;
    referencedSamples?: number;
  } | null>(null);

  // 正在编辑的维度
  const [editingDim, setEditingDim] = useState<keyof StructuredPrompt | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then(setCategories);
    fetch(`/api/notes/${params.id}`).then((r) => r.json()).then(setNote);
  }, [params.id]);

  // 粘贴图片功能
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = event.target?.result as string;
              const newImg = { id: `img-${Date.now()}`, url: base64 };
              updateNote({ images: [...(note?.images || []), newImg] });
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [note?.images]);

  const handleScrape = async () => {
    if (!urlInput) return;
    setScraping(true);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });
      const data = await res.json();
      if (data.error) {
        const errMsg = data.error.replace(/^Error:\s*/, '');
        throw new Error(errMsg);
      }
      const newImages: ImageItem[] = (data.images || []).map((url: string, i: number) => ({ id: `img-${Date.now()}-${i}`, url }));
      const newPrompts: PromptTemplate[] = (data.prompts || []).map((p: any, i: number) => ({ id: `prompt-${Date.now()}-${i}`, ...p }));
      await updateNote({ title: data.title || "新笔记", url: urlInput, images: [...(note?.images || []), ...newImages], promptTemplates: [...(note?.promptTemplates || []), ...newPrompts], content: data.content || "" });
    } catch (e) {
      alert("抓取失败: " + e);
    }
    setScraping(false);
  };

  const updateNote = async (updates: Partial<Note>) => {
    const res = await fetch(`/api/notes/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const updated = await res.json();
    setNote(updated);
  };

  const deleteNote = async () => {
    if (confirm("确定删除?")) {
      await fetch(`/api/notes/${params.id}`, { method: "DELETE" });
      router.push("/");
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // AI提取提示词（结构化）
  const handleOCR = async () => {
    if (!note?.images?.length) return;
    setOcrRunning(true);
    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: note.images[0].url }),
      });
      const data = await res.json();
      console.log('=== 前端收到 API 响应 ===');
      console.log('完整 data:', data);
      console.log('structured:', data.structured);
      console.log('extraction keys:', Object.keys(data.structured || {}));

      if (data.error) {
        throw new Error(data.error);
      }

      // 保存结构化结果：把 API 返回的 structured 字段映射成 extraction
      setStructuredResult({
        ...data,
        extraction: data.structured,
      });

      // 同时兼容旧格式，添加到笔记
      if (data.prompts?.length) {
        const newPrompts = data.prompts.map((p: any, i: number) => ({
          id: `prompt-${Date.now()}-${i}`,
          ...p,
        }));
        updateNote({ promptTemplates: [...(note?.promptTemplates || []), ...newPrompts] });
      }

      const learnInfo = data.hasBeenLearned
        ? `\n\n💡 这张图 AI 之前已学习过，本次参考了 ${data.referencedSamples || 0} 个历史样本`
        : `\n\n✨ 已自动存入知识库，你可以修正后点击「💾 保存学习」让AI更精准`;

      alert(`✅ 提取成功！\n\n识别风格: ${data.style || '未知'}${learnInfo}`);
    } catch (e: any) {
      alert('❌ 提取失败: ' + e.message);
    }
    setOcrRunning(false);
  };

  // 开始编辑某个维度
  const startEdit = (dim: keyof StructuredPrompt) => {
    setEditingDim(dim);
    setEditValue(structuredResult?.extraction[dim] || "");
  };

  // 保存编辑
  const saveEdit = () => {
    if (!structuredResult || !editingDim) return;
    setStructuredResult({
      ...structuredResult,
      extraction: {
        ...structuredResult.extraction,
        [editingDim]: editValue,
      },
    });
    setEditingDim(null);
  };

  // 计算图片哈希
  function computeImageHash(base64: string): string {
    let hash = 0;
    const str = base64.slice(-1000);
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // 保存学习（用户修正后的版本）
  const handleSaveLearning = async () => {
    if (!structuredResult?.extraction) return;
    setSavingLearning(true);

    try {
      const imageHash = note?.images?.[0]?.url ? computeImageHash(note.images[0].url) : '';

      const res = await fetch('/api/learn/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleId: structuredResult.sampleId,
          imageHash,
          correction: structuredResult.extraction,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert('✅ ' + data.message);
        setStructuredResult({ ...structuredResult, hasBeenLearned: true });
      } else {
        alert('保存失败: ' + data.error);
      }
    } catch (e: any) {
      alert('保存失败: ' + e.message);
    }
    setSavingLearning(false);
  };

  // 复制完整提示词
  const copyFullPrompt = () => {
    if (!structuredResult?.extraction) return;
    const e = structuredResult.extraction;
    const full = `主题: ${e.subject}\n风格: ${e.art_style}\n构图: ${e.composition}\n色彩: ${e.color_palette}\n元素: ${e.elements}\n光影: ${e.lighting}\n视角: ${e.camera_angle}\n画质: ${e.quality}\n比例: ${e.aspect_ratio}\n排版: ${e.layout}\n文字: ${e.text_elements}\n负面: ${e.negative}`;
    navigator.clipboard.writeText(full);
    alert('✅ 完整提示词已复制到剪贴板');
  };

  if (!note) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 顶部栏 */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => router.push("/")} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-all">
            <ArrowLeft size={20} /> 返回
          </button>
          <div className="flex items-center gap-3">
            <select value={note.categoryId || ""} onChange={(e) => updateNote({ categoryId: e.target.value || null })} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all">
              <option value="">无分类</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={deleteNote} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* 图片展示 */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100/50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-gray-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <ImageIcon size={18} className="text-white" />
              </div>
              图片 ({note.images.length})
            </h2>
            <div className="flex items-center gap-3">
              {note.images.length > 0 && (
                <button
                  onClick={handleOCR}
                  disabled={ocrRunning}
                  className="px-5 py-2 text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all hover:-translate-y-0.5"
                >
                  {ocrRunning ? <><Loader2 size={14} className="animate-spin" /> AI分析中...</> : <><Wand2 size={14} /> AI提取提示词</>}
                </button>
              )}
              <input
                type="text"
                placeholder="粘贴图片URL..."
                className="px-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value) {
                    const url = e.currentTarget.value.trim();
                    const newImg = { id: `img-${Date.now()}`, url };
                    updateNote({ images: [...(note?.images || []), newImg] });
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
          </div>
          {note.images.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl bg-gradient-to-br from-gray-50 to-white">
              <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                <ImageIcon size={36} className="text-blue-500" />
              </div>
              <p className="text-gray-700 font-semibold text-lg mb-2">暂无图片</p>
              <p className="text-sm text-gray-500 mt-2">
                💡 按 <kbd className="px-3 py-1.5 bg-gray-200 rounded-lg font-mono mx-1">Cmd/Ctrl + V</kbd> 直接粘贴截图
              </p>
              <p className="text-sm text-gray-500 mt-2">然后点击「AI提取提示词」自动分析</p>
            </div>
          ) : (
            <div className="columns-2 md:columns-3 gap-4 space-y-4">
              {note.images.map((img) => (
                <div key={img.id} className="relative group break-inside-avoid bg-gray-100 rounded-xl overflow-hidden shadow-sm">
                  <img
                    src={img.url}
                    alt=""
                    className="w-full cursor-pointer hover:opacity-90 transition"
                    onClick={() => setSelectedImage(img.url)}
                  />
                  <button
                    onClick={() => updateNote({ images: note.images.filter((i) => i.id !== img.id) })}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 结构化提示词结果 */}
        {structuredResult && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-100/50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-gray-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Wand2 size={18} className="text-white" />
                </div>
                结构化提示词
              </h2>
              <div className="flex items-center gap-3">
                {structuredResult.hasBeenLearned && (
                  <span className="flex items-center gap-1.5 text-sm text-green-700 bg-gradient-to-r from-green-50 to-emerald-50 px-3 py-1.5 rounded-xl border border-green-200">
                    <CheckCircle2 size={14} /> 已学习
                  </span>
                )}
                {structuredResult.referencedSamples && structuredResult.referencedSamples > 0 && (
                  <span className="flex items-center gap-1.5 text-sm text-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1.5 rounded-xl border border-blue-200">
                    参考 {structuredResult.referencedSamples} 个历史样本
                  </span>
                )}
                <button
                  onClick={copyFullPrompt}
                  className="flex items-center gap-2 text-sm px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all"
                >
                  <Copy size={14} /> 复制全部
                </button>
                <button
                  onClick={handleSaveLearning}
                  disabled={savingLearning}
                  className="flex items-center gap-2 text-sm px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 transition-all shadow-lg shadow-green-500/25"
                >
                  <Save size={14} /> {savingLearning ? '保存中...' : '💾 保存学习'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.keys(DIMENSION_INFO) as Array<keyof StructuredPrompt>).map((dim) => {
                const info = DIMENSION_INFO[dim];
                const value = structuredResult?.extraction?.[dim] || '';
                const confidence = structuredResult?.confidence?.[dim] || 0;
                const isEditing = editingDim === dim;

                return (
                  <div
                    key={dim}
                    className={`p-4 rounded-xl border transition-all duration-300 ${
                      confidence < 0.5 ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50' :
                      confidence < 0.7 ? 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50' :
                      'border-gray-200 bg-gradient-to-br from-gray-50 to-white'
                    } hover:shadow-md`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{info.icon}</span>
                        <span className="font-semibold text-gray-700 text-sm">{info.name}</span>
                        <span className="text-xs text-gray-400 bg-white/60 px-1.5 py-0.5 rounded-md">{Math.round(confidence * 100)}%</span>
                      </div>
                      <button
                        onClick={() => startEdit(dim)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-lg transition-all"
                      >
                        ✏️
                      </button>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full p-3 text-sm bg-white border border-gray-200 rounded-xl resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={saveEdit}
                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => setEditingDim(null)}
                            className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                        {value || '-'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 完整提示词预览 */}
            <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-xs text-purple-600 mb-2 font-medium">📋 完整正面提示词</div>
              <p className="text-sm text-purple-800 font-mono leading-relaxed">
                {structuredResult?.extraction?.subject}, {structuredResult?.extraction?.art_style}, {structuredResult?.extraction?.composition}, {structuredResult?.extraction?.color_palette}, {structuredResult?.extraction?.elements}, {structuredResult?.extraction?.lighting}, {structuredResult?.extraction?.camera_angle}, {structuredResult?.extraction?.quality}
              </p>
            </div>
          </div>
        )}

        {/* 笔记标题 */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <input
            type="text"
            value={note.title}
            onChange={(e) => updateNote({ title: e.target.value })}
            className="w-full text-2xl font-bold outline-none text-gray-800"
            placeholder="笔记标题"
          />
        </div>

        {/* 提示词模板 */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">保存的提示词模板 ({(note.promptTemplates || []).length})</h2>
            <button onClick={() => {
              const newTemplate = {
                id: `prompt-${Date.now()}`,
                name: '新建提示词',
                content: ''
              };
              updateNote({
                promptTemplates: [...(note.promptTemplates || []), newTemplate]
              });
            }} className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600">
              <Plus size={16} /> 添加
            </button>
          </div>
          {(note.promptTemplates || []).length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              暂无提示词模板，点击「AI提取提示词」自动生成
            </div>
          ) : (
            <div className="space-y-4">
              {note.promptTemplates.map((p) => (
                <div key={p.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => {
                        const updated = note.promptTemplates.map((t: any) =>
                          t.id === p.id ? { ...t, name: e.target.value } : t
                        );
                        updateNote({ promptTemplates: updated });
                      }}
                      className="font-medium text-gray-700 bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 py-0.5"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(p.id, p.content)}
                        className={`p-1.5 rounded ${copiedId === p.id ? "bg-green-100 text-green-600" : "hover:bg-gray-100 text-gray-500"}`}
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('确定删除这个提示词吗？')) {
                            updateNote({
                              promptTemplates: note.promptTemplates.filter((t: any) => t.id !== p.id)
                            });
                          }
                        }}
                        className="p-1.5 rounded hover:bg-red-100 text-gray-500 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={p.content}
                    onChange={(e) => {
                      const updated = note.promptTemplates.map((t: any) =>
                        t.id === p.id ? { ...t, content: e.target.value } : t
                      );
                      updateNote({ promptTemplates: updated });
                    }}
                    className="w-full p-3 bg-gray-50 rounded-lg text-sm text-gray-600 whitespace-pre-wrap resize-y min-h-[80px] outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="输入提示词内容..."
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 大图预览模态框 */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={selectedImage}
              alt=""
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            />
            <button
              className="absolute -top-12 right-0 text-white/80 hover:text-white text-xl"
              onClick={() => setSelectedImage(null)}
            >
              ✕ 关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
