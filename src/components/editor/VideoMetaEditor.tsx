'use client';

import { useEditorStore } from '@/store/editor-store';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion } from 'framer-motion';
import { Settings2, Maximize2, Palette, Gauge } from 'lucide-react';

export function VideoMetaEditor() {
  const { videoInput, updateVideoMeta } = useEditorStore();
  const { videoMeta } = videoInput;

  const aspectRatios = [
    { value: '9:16', label: '9:16', desc: 'Vertical' },
    { value: '16:9', label: '16:9', desc: 'Horizontal' },
    { value: '1:1', label: '1:1', desc: 'Square' },
    { value: '4:5', label: '4:5', desc: 'Portrait' },
  ];

  const themes = [
    { value: 'dark_modern', label: 'Dark Modern', color: 'bg-gray-900' },
    { value: 'light_minimal', label: 'Light Minimal', color: 'bg-white border' },
    { value: 'bold_vibrant', label: 'Bold Vibrant', color: 'bg-gradient-to-r from-purple-600 to-pink-600' },
    { value: 'corporate', label: 'Corporate', color: 'bg-slate-700' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 space-y-4"
    >
      {/* Aspect Ratio */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
          <Label className="text-xs text-gray-400 font-medium">Aspect Ratio</Label>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {aspectRatios.map((ratio) => (
            <button
              key={ratio.value}
              onClick={() => updateVideoMeta({ aspectRatio: ratio.value as '9:16' | '16:9' | '1:1' | '4:5' })}
              className={`p-2 rounded-lg border text-center transition-all ${
                videoMeta.aspectRatio === ratio.value
                  ? 'border-purple-500 bg-purple-500/20 text-white'
                  : 'border-gray-700/50 bg-gray-800/30 text-gray-400 hover:border-gray-600'
              }`}
            >
              <div className="text-xs font-medium">{ratio.label}</div>
              <div className="text-[10px] opacity-60">{ratio.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-gray-400" />
          <Label className="text-xs text-gray-400 font-medium">Theme</Label>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {themes.map((theme) => (
            <button
              key={theme.value}
              onClick={() => updateVideoMeta({ theme: theme.value as 'dark_modern' | 'light_minimal' | 'bold_vibrant' | 'corporate' })}
              className={`p-2 rounded-lg border flex items-center gap-2 transition-all ${
                videoMeta.theme === theme.value
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600'
              }`}
            >
              <div className={`w-5 h-5 rounded ${theme.color}`} />
              <span className={`text-xs ${videoMeta.theme === theme.value ? 'text-white' : 'text-gray-400'}`}>
                {theme.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* FPS */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Gauge className="w-3.5 h-3.5 text-gray-400" />
          <Label className="text-xs text-gray-400 font-medium">Frame Rate</Label>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[24, 30, 60].map((fps) => (
            <button
              key={fps}
              onClick={() => updateVideoMeta({ fps })}
              className={`p-2 rounded-lg border text-center transition-all ${
                videoMeta.fps === fps
                  ? 'border-purple-500 bg-purple-500/20 text-white'
                  : 'border-gray-700/50 bg-gray-800/30 text-gray-400 hover:border-gray-600'
              }`}
            >
              <span className="text-sm font-medium">{fps}</span>
              <span className="text-[10px] ml-0.5 opacity-60">FPS</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
