'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Key, CheckCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setHasKey(data.hasKeyConfigured);
      });
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: '请输入 API Key' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anthropicApiKey: apiKey.trim() }),
      });

      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setHasKey(true);
      } else {
        setMessage({ type: 'error', text: data.error || '保存失败' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: '保存失败' });
    }

    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
        >
          <ArrowLeft size={20} />
          返回
        </button>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Key size={24} className="text-blue-500" />
            设置
          </h1>

          {hasKey && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-center gap-3">
              <CheckCircle size={20} className="text-green-600" />
              <span className="text-green-700">API Key 已配置</span>
            </div>
          )}

          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
            >
              {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              <span>{message.text}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Anthropic API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <p className="mt-2 text-sm text-gray-500">
                获取地址：<a href="https://console.anthropic.com/" target="_blank" className="text-blue-500 underline">
                  https://console.anthropic.com/
                </a>
              </p>
            </div>

            <div className="pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save size={18} />
                {saving ? '保存中...' : '保存设置'}
              </button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">💡 使用说明</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• API Key 只保存在本地 .env 文件中</li>
                <li>• 保存后需要重启服务才能生效</li>
                <li>• 图片分析会消耗 Claude API 额度</li>
                <li>• AI 会学习你的提示词风格，越用越准确</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
