'use client';

import { useEditorStore, BLOCK_TEMPLATES } from '@/store/editor-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { 
  BarChart3, Type, Image, Quote, List, Clock, AlertCircle, 
  Grid3X3, LineChart, PieChart, Code, MessageSquare, Heart,
  MessageCircle, Sparkles, Zap, PlusCircle, Timer, QrCode,
  Video, Users, Share2, MousePointer, Palette, Waves, ChevronDown,
  Hourglass, CloudSun, Box
} from 'lucide-react';

const BLOCK_CATEGORIES = [
  {
    name: 'Content',
    icon: Type,
    blocks: [
      { type: 'text', label: 'Text', icon: Type, gradient: 'from-gray-400 to-gray-600', description: 'Text content' },
      { type: 'quote', label: 'Quote', icon: Quote, gradient: 'from-yellow-500 to-orange-500', description: 'Inspirational quote' },
      { type: 'list', label: 'List', icon: List, gradient: 'from-orange-500 to-red-500', description: 'Bullet list' },
      { type: 'callout', label: 'Callout', icon: AlertCircle, gradient: 'from-red-500 to-pink-500', description: 'Highlight info' },
      { type: 'code', label: 'Code', icon: Code, gradient: 'from-slate-500 to-zinc-600', description: 'Code snippet' },
      { type: 'gradient-text', label: 'Gradient', icon: Palette, gradient: 'from-violet-500 to-fuchsia-500', description: 'Gradient text' },
    ],
  },
  {
    name: 'Data & Stats',
    icon: BarChart3,
    blocks: [
      { type: 'stat', label: 'Stat', icon: BarChart3, gradient: 'from-blue-500 to-cyan-500', description: 'Key metrics' },
      { type: 'comparison', label: 'Compare', icon: BarChart3, gradient: 'from-purple-500 to-pink-500', description: 'Compare values' },
      { type: 'line-chart', label: 'Line Chart', icon: LineChart, gradient: 'from-emerald-500 to-teal-500', description: 'Data trend' },
      { type: 'pie-chart', label: 'Pie Chart', icon: PieChart, gradient: 'from-amber-500 to-yellow-500', description: 'Data breakdown' },
      { type: 'counter', label: 'Counter', icon: Timer, gradient: 'from-cyan-500 to-blue-500', description: 'Animated counter' },
      { type: 'progress-bar', label: 'Progress', icon: BarChart3, gradient: 'from-green-500 to-emerald-500', description: 'Progress bar' },
      { type: 'tower-chart-3d', label: '3D Tower', icon: Box, gradient: 'from-violet-600 to-indigo-500', description: '3D ranking tower' },
    ],
  },
  {
    name: 'Visual & Media',
    icon: Image,
    blocks: [
      { type: 'image', label: 'Image', icon: Image, gradient: 'from-green-500 to-emerald-500', description: 'Display image' },
      { type: 'video', label: 'Video', icon: Video, gradient: 'from-red-500 to-rose-500', description: 'Video playback' },
      { type: 'motivational-image', label: 'Poster', icon: Heart, gradient: 'from-rose-500 to-pink-500', description: 'Image + text' },
      { type: 'qr-code', label: 'QR Code', icon: QrCode, gradient: 'from-slate-500 to-gray-600', description: 'QR code' },
      { type: 'animated-bg', label: 'Background', icon: Waves, gradient: 'from-indigo-500 to-purple-500', description: 'Animated bg' },
      { type: 'weather-block', label: 'Weather', icon: CloudSun, gradient: 'from-sky-400 to-cyan-500', description: 'Weather widget' },
    ],
  },
  {
    name: 'Social & People',
    icon: Users,
    blocks: [
      { type: 'testimonial', label: 'Review', icon: MessageSquare, gradient: 'from-indigo-500 to-purple-500', description: 'Customer review' },
      { type: 'whatsapp-chat', label: 'Chat', icon: MessageCircle, gradient: 'from-green-500 to-green-600', description: 'Chat mockup' },
      { type: 'avatar-grid', label: 'Team', icon: Users, gradient: 'from-orange-500 to-amber-500', description: 'Team grid' },
      { type: 'social-stats', label: 'Social', icon: Share2, gradient: 'from-blue-500 to-indigo-500', description: 'Social stats' },
    ],
  },
  {
    name: 'Interactive',
    icon: MousePointer,
    blocks: [
      { type: 'cta', label: 'CTA Button', icon: MousePointer, gradient: 'from-emerald-500 to-teal-500', description: 'Call to action' },
      { type: 'countdown', label: 'Countdown', icon: Hourglass, gradient: 'from-rose-500 to-orange-500', description: 'Countdown timer' },
      { type: 'timeline', label: 'Timeline', icon: Clock, gradient: 'from-cyan-500 to-blue-500', description: 'Event timeline' },
      { type: 'icon-list', label: 'Features', icon: Grid3X3, gradient: 'from-pink-500 to-rose-500', description: 'Feature list' },
    ],
  },
];

// Total block count
const TOTAL_BLOCKS = BLOCK_CATEGORIES.reduce((acc, cat) => acc + cat.blocks.length, 0);

export function BlockLibrarySidebar() {
  const addBlock = useEditorStore((state) => state.addBlock);

  return (
    <div className="w-72 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border-r border-gray-800/50 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-800/50 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Blocks</h2>
            <p className="text-xs text-gray-400">Click to add to timeline</p>
          </div>
        </div>
      </div>
      
      {/* Block Categories */}
      <ScrollArea className="flex-1 h-full">
        <div className="p-3 space-y-4 pb-8">
          {BLOCK_CATEGORIES.map((category, catIndex) => {
            const CatIcon = category.icon;
            return (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: catIndex * 0.1 }}
                className="space-y-2"
              >
                {/* Category Header */}
                <div className="flex items-center gap-2 px-2">
                  <CatIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{category.name}</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-gray-700 to-transparent" />
                </div>
                
                {/* Blocks Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {category.blocks.map((blockType, index) => {
                    const Icon = blockType.icon;
                    return (
                      <motion.div
                        key={blockType.type}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: catIndex * 0.1 + index * 0.02 }}
                      >
                        <Button
                          variant="ghost"
                          className="w-full h-auto flex-col gap-1.5 p-3 bg-gray-800/30 hover:bg-gray-800/60 border border-gray-700/50 hover:border-gray-600 transition-all duration-300 group"
                          onClick={() => addBlock(blockType.type)}
                        >
                          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${blockType.gradient} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="text-center">
                            <span className="text-xs font-medium text-white block">{blockType.label}</span>
                          </div>
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-800/50 bg-gray-900/50">
        <div className="flex items-center gap-2 justify-center text-xs text-gray-500">
          <Zap className="w-3 h-3 text-yellow-500" />
          <span>{TOTAL_BLOCKS} blocks in {BLOCK_CATEGORIES.length} categories</span>
        </div>
      </div>
    </div>
  );
}
