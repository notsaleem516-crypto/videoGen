'use client';

import { useEditorStore, BLOCK_TEMPLATES } from '@/store/editor-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Type, 
  Image, 
  Quote, 
  List, 
  Clock, 
  AlertCircle, 
  Grid3X3,
  LineChart,
  PieChart,
  Code,
  MessageSquare,
  Heart,
  MessageCircle,
  Sparkles,
  Zap
} from 'lucide-react';

const BLOCK_TYPES = [
  { type: 'stat', label: 'Stat', icon: BarChart3, gradient: 'from-blue-500 to-cyan-500', description: 'Key metrics' },
  { type: 'comparison', label: 'Compare', icon: BarChart3, gradient: 'from-purple-500 to-pink-500', description: 'Compare values' },
  { type: 'text', label: 'Text', icon: Type, gradient: 'from-gray-400 to-gray-600', description: 'Text content' },
  { type: 'image', label: 'Image', icon: Image, gradient: 'from-green-500 to-emerald-500', description: 'Display image' },
  { type: 'quote', label: 'Quote', icon: Quote, gradient: 'from-yellow-500 to-orange-500', description: 'Inspirational quote' },
  { type: 'list', label: 'List', icon: List, gradient: 'from-orange-500 to-red-500', description: 'Bullet list' },
  { type: 'timeline', label: 'Timeline', icon: Clock, gradient: 'from-cyan-500 to-blue-500', description: 'Event timeline' },
  { type: 'callout', label: 'Callout', icon: AlertCircle, gradient: 'from-red-500 to-pink-500', description: 'Highlight info' },
  { type: 'icon-list', label: 'Features', icon: Grid3X3, gradient: 'from-pink-500 to-rose-500', description: 'Feature list' },
  { type: 'line-chart', label: 'Line Chart', icon: LineChart, gradient: 'from-emerald-500 to-teal-500', description: 'Data trend' },
  { type: 'pie-chart', label: 'Pie Chart', icon: PieChart, gradient: 'from-amber-500 to-yellow-500', description: 'Data breakdown' },
  { type: 'code', label: 'Code', icon: Code, gradient: 'from-slate-500 to-zinc-600', description: 'Code snippet' },
  { type: 'testimonial', label: 'Review', icon: MessageSquare, gradient: 'from-indigo-500 to-purple-500', description: 'Customer review' },
  { type: 'whatsapp-chat', label: 'Chat', icon: MessageCircle, gradient: 'from-green-500 to-green-600', description: 'Chat mockup' },
  { type: 'motivational-image', label: 'Poster', icon: Heart, gradient: 'from-rose-500 to-pink-500', description: 'Image + text' },
];

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
      
      {/* Block Grid */}
      <ScrollArea className="flex-1">
        <div className="p-4 grid grid-cols-2 gap-3">
          {BLOCK_TYPES.map((blockType, index) => {
            const Icon = blockType.icon;
            return (
              <motion.div
                key={blockType.type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Button
                  variant="ghost"
                  className="w-full h-auto flex-col gap-2 p-4 bg-gray-800/30 hover:bg-gray-800/60 border border-gray-700/50 hover:border-gray-600 transition-all duration-300 group"
                  onClick={() => addBlock(blockType.type)}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${blockType.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-white block">{blockType.label}</span>
                    <span className="text-[10px] text-gray-500">{blockType.description}</span>
                  </div>
                </Button>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-800/50 bg-gray-900/50">
        <div className="flex items-center gap-2 justify-center text-xs text-gray-500">
          <Zap className="w-3 h-3 text-yellow-500" />
          <span>{BLOCK_TYPES.length} block types available</span>
        </div>
      </div>
    </div>
  );
}
