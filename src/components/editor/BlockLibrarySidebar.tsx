'use client';

import { useEditorStore, BLOCK_TEMPLATES } from '@/store/editor-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Plus
} from 'lucide-react';

// Block type configuration
const BLOCK_TYPES = [
  { type: 'stat', label: 'Stat', icon: BarChart3, color: 'bg-blue-500' },
  { type: 'comparison', label: 'Comparison', icon: BarChart3, color: 'bg-purple-500' },
  { type: 'text', label: 'Text', icon: Type, color: 'bg-gray-500' },
  { type: 'image', label: 'Image', icon: Image, color: 'bg-green-500' },
  { type: 'quote', label: 'Quote', icon: Quote, color: 'bg-yellow-500' },
  { type: 'list', label: 'List', icon: List, color: 'bg-orange-500' },
  { type: 'timeline', label: 'Timeline', icon: Clock, color: 'bg-cyan-500' },
  { type: 'callout', label: 'Callout', icon: AlertCircle, color: 'bg-red-500' },
  { type: 'icon-list', label: 'Icon List', icon: Grid3X3, color: 'bg-pink-500' },
  { type: 'line-chart', label: 'Line Chart', icon: LineChart, color: 'bg-emerald-500' },
  { type: 'pie-chart', label: 'Pie Chart', icon: PieChart, color: 'bg-amber-500' },
  { type: 'code', label: 'Code', icon: Code, color: 'bg-slate-500' },
  { type: 'testimonial', label: 'Testimonial', icon: MessageSquare, color: 'bg-indigo-500' },
  { type: 'whatsapp-chat', label: 'WhatsApp', icon: MessageCircle, color: 'bg-green-600' },
  { type: 'motivational-image', label: 'Motivational', icon: Heart, color: 'bg-rose-500' },
];

export function BlockLibrarySidebar() {
  const addBlock = useEditorStore((state) => state.addBlock);

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          Block Library
        </h2>
        <p className="text-xs text-gray-400 mt-1">Click to add blocks</p>
      </div>
      
      {/* Block List */}
      <ScrollArea className="flex-1">
        <div className="p-3 grid grid-cols-2 gap-2">
          {BLOCK_TYPES.map((blockType) => {
            const Icon = blockType.icon;
            return (
              <Button
                key={blockType.type}
                variant="outline"
                className="h-auto flex-col gap-2 p-3 bg-gray-800 border-gray-700 hover:bg-gray-700 hover:border-gray-600 transition-all"
                onClick={() => addBlock(blockType.type)}
              >
                <div className={`w-10 h-10 rounded-lg ${blockType.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs text-gray-300">{blockType.label}</span>
              </Button>
            );
          })}
        </div>
      </ScrollArea>
      
      {/* Footer */}
      <div className="p-3 border-t border-gray-800">
        <p className="text-xs text-gray-500 text-center">
          {Object.keys(BLOCK_TEMPLATES).length} block types available
        </p>
      </div>
    </div>
  );
}
