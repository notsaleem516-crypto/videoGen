'use client';

import { useEditorStore } from '@/store/editor-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GripVertical, Trash2, Copy, Clock, BarChart3, Type, Image, Quote,
  List, AlertCircle, MessageSquare, Code, Heart, MessageCircle,
  LineChart, PieChart, Grid3X3, Sparkles, ZoomIn, ZoomOut, Timer,
  QrCode, Video, Users, Share2, MousePointer, Palette, Waves, Hourglass
} from 'lucide-react';
import { useState } from 'react';

const BLOCK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  stat: BarChart3, comparison: BarChart3, text: Type, image: Image, quote: Quote,
  list: List, timeline: Clock, callout: AlertCircle, 'icon-list': Grid3X3,
  'line-chart': LineChart, 'pie-chart': PieChart, code: Code, testimonial: MessageSquare,
  'whatsapp-chat': MessageCircle, 'motivational-image': Heart,
  // New blocks
  counter: Timer, 'progress-bar': BarChart3, 'qr-code': QrCode, video: Video,
  'avatar-grid': Users, 'social-stats': Share2, cta: MousePointer,
  'gradient-text': Palette, 'animated-bg': Waves, countdown: Hourglass,
};

const BLOCK_GRADIENTS: Record<string, string> = {
  stat: 'from-blue-500 to-cyan-500', comparison: 'from-purple-500 to-pink-500',
  text: 'from-gray-400 to-gray-600', image: 'from-green-500 to-emerald-500',
  quote: 'from-yellow-500 to-orange-500', list: 'from-orange-500 to-red-500',
  timeline: 'from-cyan-500 to-blue-500', callout: 'from-red-500 to-pink-500',
  'icon-list': 'from-pink-500 to-rose-500', 'line-chart': 'from-emerald-500 to-teal-500',
  'pie-chart': 'from-amber-500 to-yellow-500', code: 'from-slate-500 to-zinc-600',
  testimonial: 'from-indigo-500 to-purple-500', 'whatsapp-chat': 'from-green-500 to-green-600',
  'motivational-image': 'from-rose-500 to-pink-500',
  // New blocks
  counter: 'from-cyan-500 to-blue-500', 'progress-bar': 'from-green-500 to-emerald-500',
  'qr-code': 'from-slate-500 to-gray-600', video: 'from-red-500 to-rose-500',
  'avatar-grid': 'from-cyan-500 to-indigo-500', 'social-stats': 'from-blue-500 to-indigo-500',
  cta: 'from-emerald-500 to-teal-500', 'gradient-text': 'from-violet-500 to-fuchsia-500',
  'animated-bg': 'from-indigo-500 to-purple-500', countdown: 'from-rose-500 to-orange-500',
};

interface SortableBlockProps {
  block: { type: string; [key: string]: unknown };
  index: number;
  isSelected: boolean;
  zoom: number;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function SortableBlock({ block, index, isSelected, zoom, onSelect, onDuplicate, onDelete }: SortableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: index.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    width: `${width}px`,
  };

  const Icon = BLOCK_ICONS[block.type] || BarChart3;
  const gradient = BLOCK_GRADIENTS[block.type] || 'from-gray-500 to-gray-600';
  const duration = (block as { duration?: number }).duration || 3;
  
  // Calculate width based on zoom level
  const baseWidth = 120;
  const width = Math.max(100, baseWidth * zoom);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: isDragging ? 0.8 : 1, scale: isDragging ? 1.05 : 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`
        relative flex-shrink-0 rounded-xl cursor-pointer transition-all duration-200 group
        ${isSelected 
          ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-gray-900 shadow-lg shadow-cyan-500/25' 
          : 'hover:ring-1 hover:ring-gray-600'
        }
        ${isDragging ? 'shadow-2xl' : ''}
      `}
      onClick={onSelect}
    >
      {/* Block Card */}
      <div className="p-3 bg-gray-800/80 backdrop-blur border border-gray-700/50 rounded-xl h-full">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <button
            {...attributes}
            {...listeners}
            className="p-1 hover:bg-white/10 rounded cursor-grab active:cursor-grabbing transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4 text-gray-500" />
          </button>
          
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {getBlockLabel(block)}
            </p>
          </div>
        </div>
        
        {/* Duration Bar */}
        <div className="h-1.5 bg-gray-700/50 rounded-full overflow-hidden mb-2">
          <div 
            className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-300`}
            style={{ width: `${Math.min((duration / 15) * 100, 100)}%` }}
          />
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {duration}s
          </span>
          
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-white/10"
              onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            >
              <Copy className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-400 hover:text-red-400 hover:bg-white/10"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function getBlockLabel(block: { type: string; [key: string]: unknown }): string {
  switch (block.type) {
    case 'stat': return (block as { heading?: string }).heading || 'Stat';
    case 'comparison': return (block as { title?: string }).title || 'Comparison';
    case 'text': return ((block as { content?: string }).content?.slice(0, 15) || 'Text') + '...';
    case 'image': return (block as { caption?: string }).caption || 'Image';
    case 'quote': return 'Quote';
    case 'list': return (block as { title?: string }).title || 'List';
    case 'timeline': return (block as { title?: string }).title || 'Timeline';
    case 'callout': return (block as { title?: string }).title || 'Callout';
    case 'icon-list': return (block as { title?: string }).title || 'Features';
    case 'line-chart': return (block as { title?: string }).title || 'Line Chart';
    case 'pie-chart': return (block as { title?: string }).title || 'Pie Chart';
    case 'code': return (block as { title?: string }).title || 'Code';
    case 'testimonial': return (block as { author?: string }).author || 'Review';
    case 'whatsapp-chat': return `${(block as { messages?: unknown[] }).messages?.length || 0} Messages`;
    case 'motivational-image': return ((block as { text?: string }).text?.slice(0, 12) || 'Poster') + '...';
    // New blocks
    case 'counter': return (block as { label?: string }).label || 'Counter';
    case 'progress-bar': return (block as { label?: string }).label || 'Progress';
    case 'qr-code': return (block as { title?: string }).title || 'QR Code';
    case 'video': return 'Video';
    case 'avatar-grid': return (block as { title?: string }).title || 'Team';
    case 'social-stats': return (block as { username?: string }).username || 'Social';
    case 'cta': return (block as { text?: string }).text || 'CTA';
    case 'gradient-text': return ((block as { text?: string }).text?.slice(0, 12) || 'Gradient') + '...';
    case 'animated-bg': return 'Background';
    case 'countdown': return (block as { title?: string }).title || 'Countdown';
    default: return block.type;
  }
}

export function TimelineEditor() {
  const { videoInput, selectedBlockIndex, selectBlock, moveBlock, duplicateBlock, removeBlock } = useEditorStore();
  const [zoom, setZoom] = useState(1);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      moveBlock(parseInt(active.id as string), parseInt(over.id as string));
    }
  };

  const totalDuration = videoInput.contentBlocks.reduce((acc, block) => 
    acc + ((block as { duration?: number }).duration || 3), 0);

  return (
    <div className="h-72 bg-gradient-to-b from-gray-900 to-gray-950 border-t border-gray-800/50 flex flex-col overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="h-12 border-b border-gray-800/50 flex items-center justify-between px-5 flex-shrink-0 bg-gray-900/50 backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-white">Timeline</h3>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800/50 border border-gray-700/50">
            <span className="text-xs text-gray-400">{videoInput.contentBlocks.length} blocks</span>
            <span className="text-gray-600">•</span>
            <span className="text-xs text-gray-400">{totalDuration}s total</span>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-400 hover:text-white"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Slider
              value={[zoom]}
              onValueChange={([v]) => setZoom(v)}
              min={0.5}
              max={2}
              step={0.25}
              className="w-20"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-400 hover:text-white"
              onClick={() => setZoom(Math.min(2, zoom + 0.25))}
              disabled={zoom >= 2}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <span className="text-xs text-gray-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
          </div>
          
          {/* Time ruler */}
          <div className="flex items-center gap-4 text-[10px] text-gray-600 font-mono">
            {[0, 5, 10, 15, 20, 25, 30].slice(0, Math.ceil(totalDuration / 5) + 1).map((t) => (
              <span key={t} className="flex flex-col items-center">
                <span>{t}s</span>
                <span className="w-px h-2 bg-gray-700 mt-1" />
              </span>
            ))}
          </div>
        </div>
      </div>
      
      {/* Timeline Content */}
      <div className="flex-1 p-4 overflow-hidden min-h-0">
        {videoInput.contentBlocks.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full flex flex-col items-center justify-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-800/50 flex items-center justify-center mb-4 border border-gray-700/50">
              <Sparkles className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-gray-500 text-sm">Add blocks from the library to start</p>
          </motion.div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={videoInput.contentBlocks.map((_, i) => i.toString())}
              strategy={horizontalListSortingStrategy}
            >
              <ScrollArea className="h-full">
                <div className="flex gap-3 pb-2">
                  <AnimatePresence>
                    {videoInput.contentBlocks.map((block, index) => (
                      <SortableBlock
                        key={index}
                        block={block}
                        index={index}
                        isSelected={selectedBlockIndex === index}
                        zoom={zoom}
                        onSelect={() => selectBlock(index)}
                        onDuplicate={() => duplicateBlock(index)}
                        onDelete={() => removeBlock(index)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
