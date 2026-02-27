'use client';

import { useEditorStore } from '@/store/editor-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  GripVertical, 
  Trash2, 
  Copy, 
  Clock,
  BarChart3,
  Type,
  Image,
  Quote,
  List,
  Clock as ClockIcon,
  AlertCircle,
  MessageSquare,
  Code,
  Heart,
  MessageCircle,
  LineChart,
  PieChart,
  Grid3X3
} from 'lucide-react';

// Block type icons
const BLOCK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  stat: BarChart3,
  comparison: BarChart3,
  text: Type,
  image: Image,
  quote: Quote,
  list: List,
  timeline: ClockIcon,
  callout: AlertCircle,
  'icon-list': Grid3X3,
  'line-chart': LineChart,
  'pie-chart': PieChart,
  code: Code,
  testimonial: MessageSquare,
  'whatsapp-chat': MessageCircle,
  'motivational-image': Heart,
};

// Block colors
const BLOCK_COLORS: Record<string, string> = {
  stat: 'bg-blue-500/20 border-blue-500',
  comparison: 'bg-purple-500/20 border-purple-500',
  text: 'bg-gray-500/20 border-gray-500',
  image: 'bg-green-500/20 border-green-500',
  quote: 'bg-yellow-500/20 border-yellow-500',
  list: 'bg-orange-500/20 border-orange-500',
  timeline: 'bg-cyan-500/20 border-cyan-500',
  callout: 'bg-red-500/20 border-red-500',
  'icon-list': 'bg-pink-500/20 border-pink-500',
  'line-chart': 'bg-emerald-500/20 border-emerald-500',
  'pie-chart': 'bg-amber-500/20 border-amber-500',
  code: 'bg-slate-500/20 border-slate-500',
  testimonial: 'bg-indigo-500/20 border-indigo-500',
  'whatsapp-chat': 'bg-green-600/20 border-green-600',
  'motivational-image': 'bg-rose-500/20 border-rose-500',
};

interface SortableBlockProps {
  block: { type: string; [key: string]: unknown };
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function SortableBlock({ block, index, isSelected, onSelect, onDuplicate, onDelete }: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: index.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = BLOCK_ICONS[block.type] || BarChart3;
  const colorClass = BLOCK_COLORS[block.type] || 'bg-gray-500/20 border-gray-500';
  const duration = (block as { duration?: number }).duration || 3;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all
        ${colorClass}
        ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''}
        ${isDragging ? 'shadow-lg' : ''}
      `}
      onClick={onSelect}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 hover:bg-white/10 rounded cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4 text-gray-400" />
      </button>
      
      {/* Block Icon */}
      <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-white" />
      </div>
      
      {/* Block Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {getBlockLabel(block)}
        </p>
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {duration}s
        </p>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-white/10"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
        >
          <Copy className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-gray-400 hover:text-red-400 hover:bg-white/10"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

function getBlockLabel(block: { type: string; [key: string]: unknown }): string {
  switch (block.type) {
    case 'stat':
      return (block as { heading?: string }).heading || 'Stat';
    case 'comparison':
      return (block as { title?: string }).title || 'Comparison';
    case 'text':
      return (block as { content?: string }).content?.slice(0, 20) || 'Text';
    case 'image':
      return (block as { caption?: string }).caption || 'Image';
    case 'quote':
      return (block as { author?: string }).author ? `Quote by ${(block as { author?: string }).author}` : 'Quote';
    case 'list':
      return (block as { title?: string }).title || 'List';
    case 'timeline':
      return (block as { title?: string }).title || 'Timeline';
    case 'callout':
      return (block as { title?: string }).title || 'Callout';
    case 'icon-list':
      return (block as { title?: string }).title || 'Icon List';
    case 'line-chart':
      return (block as { title?: string }).title || 'Line Chart';
    case 'pie-chart':
      return (block as { title?: string }).title || 'Pie Chart';
    case 'code':
      return (block as { title?: string }).title || 'Code';
    case 'testimonial':
      return (block as { author?: string }).author || 'Testimonial';
    case 'whatsapp-chat':
      return `${(block as { messages?: unknown[] }).messages?.length || 0} Messages`;
    case 'motivational-image':
      return (block as { text?: string }).text?.slice(0, 20) || 'Motivational';
    default:
      return block.type;
  }
}

export function TimelineEditor() {
  const { 
    videoInput, 
    selectedBlockIndex, 
    selectBlock, 
    moveBlock, 
    duplicateBlock, 
    removeBlock 
  } = useEditorStore();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const fromIndex = parseInt(active.id as string);
      const toIndex = parseInt(over.id as string);
      moveBlock(fromIndex, toIndex);
    }
  };

  // Calculate total duration
  const totalDuration = videoInput.contentBlocks.reduce((acc, block) => {
    return acc + ((block as { duration?: number }).duration || 3);
  }, 0);

  return (
    <div className="h-64 bg-gray-900 border-t border-gray-800 flex flex-col">
      {/* Timeline Header */}
      <div className="h-10 border-b border-gray-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-medium text-white">Timeline</h3>
          <span className="text-xs text-gray-400">
            {videoInput.contentBlocks.length} blocks • {totalDuration}s total
          </span>
        </div>
        
        {/* Time ruler */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {[0, 5, 10, 15, 20, 25, 30].map((t) => (
            <span key={t}>{t}s</span>
          ))}
        </div>
      </div>
      
      {/* Timeline Content */}
      <div className="flex-1 p-4">
        {videoInput.contentBlocks.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500 text-sm">
              Add blocks from the library to start building your video
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={videoInput.contentBlocks.map((_, i) => i.toString())}
              strategy={horizontalListSortingStrategy}
            >
              <ScrollArea className="h-full">
                <div className="flex gap-3 pb-2">
                  {videoInput.contentBlocks.map((block, index) => (
                    <SortableBlock
                      key={index}
                      block={block}
                      index={index}
                      isSelected={selectedBlockIndex === index}
                      onSelect={() => selectBlock(index)}
                      onDuplicate={() => duplicateBlock(index)}
                      onDelete={() => removeBlock(index)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
