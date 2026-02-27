'use client';

import { useEditorStore } from '@/store/editor-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Copy, Settings, Plus, X } from 'lucide-react';
import { useState } from 'react';

// Color Picker Component
function ColorPicker({ 
  value, 
  onChange, 
  label 
}: { 
  value: string; 
  onChange: (color: string) => void; 
  label?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && <Label className="text-xs text-gray-400">{label}</Label>}
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-8 rounded border border-gray-700 cursor-pointer bg-transparent"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-gray-800 border-gray-700 text-white flex-1 h-8 text-sm"
          placeholder="#FFFFFF"
        />
      </div>
    </div>
  );
}

// Slider Input Component
function SliderInput({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  step = 0.5,
  unit = 's',
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="text-xs text-gray-400">{label}</Label>
        <span className="text-xs text-white font-mono">{value}{unit}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
    </div>
  );
}

export function PropertiesPanel() {
  const { videoInput, selectedBlockIndex, updateBlock, duplicateBlock, removeBlock } = useEditorStore();

  const selectedBlock = selectedBlockIndex !== null 
    ? videoInput.contentBlocks[selectedBlockIndex] 
    : null;

  if (!selectedBlock) {
    return (
      <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col h-full">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-400" />
            Properties
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-gray-500 text-sm text-center">
            Select a block from the timeline to edit its properties
          </p>
        </div>
      </div>
    );
  }

  const blockType = selectedBlock.type;

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-400" />
            Properties
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-white"
              onClick={() => duplicateBlock(selectedBlockIndex!)}
              title="Duplicate"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-red-400"
              onClick={() => removeBlock(selectedBlockIndex!)}
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1 capitalize">
          {blockType.replace('-', ' ')} Block
        </p>
      </div>
      
      {/* Properties Form */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Duration - Common to all blocks */}
          <SliderInput
            label="Duration"
            value={(selectedBlock as { duration?: number }).duration || 4}
            onChange={(v) => updateBlock(selectedBlockIndex!, { duration: v })}
            min={1}
            max={30}
            step={0.5}
            unit="s"
          />
          
          {/* Render different forms based on block type */}
          {blockType === 'stat' && (
            <StatEditor block={selectedBlock} index={selectedBlockIndex} />
          )}
          {blockType === 'comparison' && (
            <ComparisonEditor block={selectedBlock} index={selectedBlockIndex} />
          )}
          {blockType === 'text' && (
            <TextEditor block={selectedBlock} index={selectedBlockIndex} />
          )}
          {blockType === 'image' && (
            <ImageEditor block={selectedBlock} index={selectedBlockIndex} />
          )}
          {blockType === 'quote' && (
            <QuoteEditor block={selectedBlock} index={selectedBlockIndex} />
          )}
          {blockType === 'list' && (
            <ListEditor block={selectedBlock} index={selectedBlockIndex} />
          )}
          {blockType === 'timeline' && (
            <TimelineEditor block={selectedBlock} index={selectedBlockIndex} />
          )}
          {blockType === 'callout' && (
            <CalloutEditor block={selectedBlock} index={selectedBlockIndex} />
          )}
          {blockType === 'code' && (
            <CodeEditor block={selectedBlock} index={selectedBlockIndex} />
          )}
          {blockType === 'testimonial' && (
            <TestimonialEditor block={selectedBlock} index={selectedBlockIndex} />
          )}
          {blockType === 'whatsapp-chat' && (
            <WhatsAppEditor block={selectedBlock} index={selectedBlockIndex} />
          )}
          {blockType === 'motivational-image' && (
            <MotivationalEditor block={selectedBlock} index={selectedBlockIndex} />
          )}
          {blockType === 'line-chart' && (
            <LineChartEditor block={selectedBlock} index={selectedBlockIndex} />
          )}
          {blockType === 'pie-chart' && (
            <PieChartEditor block={selectedBlock} index={selectedBlockIndex} />
          )}
          {blockType === 'icon-list' && (
            <IconListEditor block={selectedBlock} index={selectedBlockIndex} />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// BLOCK EDITORS
// ============================================================================

interface EditorProps {
  block: Record<string, unknown>;
  index: number;
}

function StatEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Heading</Label>
        <Input
          value={(block.heading as string) || ''}
          onChange={(e) => updateBlock(index, { heading: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white h-9"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Value</Label>
        <Input
          value={(block.value as string) || ''}
          onChange={(e) => updateBlock(index, { value: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white h-9"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Subtext</Label>
        <Input
          value={(block.subtext as string) || ''}
          onChange={(e) => updateBlock(index, { subtext: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white h-9"
        />
      </div>
    </div>
  );
}

function ComparisonEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  const items = (block.items as Array<{ label: string; value: number; color?: string }>) || [];
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Title</Label>
        <Input
          value={(block.title as string) || ''}
          onChange={(e) => updateBlock(index, { title: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white h-9"
        />
      </div>
      <div>
        <div className="flex justify-between items-center mb-2">
          <Label className="text-xs text-gray-400">Items</Label>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs"
            onClick={() => updateBlock(index, { 
              items: [...items, { label: 'New Item', value: 50, color: '#3B82F6' }] 
            })}
          >
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="bg-gray-800 rounded p-2 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={item.label}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[i] = { ...newItems[i], label: e.target.value };
                    updateBlock(index, { items: newItems });
                  }}
                  className="bg-gray-700 border-gray-600 text-white flex-1 h-8 text-sm"
                  placeholder="Label"
                />
                <Input
                  value={item.value.toString()}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[i] = { ...newItems[i], value: parseFloat(e.target.value) || 0 };
                    updateBlock(index, { items: newItems });
                  }}
                  className="bg-gray-700 border-gray-600 text-white w-16 h-8 text-sm"
                  type="number"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-400"
                  onClick={() => updateBlock(index, { items: items.filter((_, idx) => idx !== i) })}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <ColorPicker
                value={item.color || '#3B82F6'}
                onChange={(c) => {
                  const newItems = [...items];
                  newItems[i] = { ...newItems[i], color: c };
                  updateBlock(index, { items: newItems });
                }}
                label="Color"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TextEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Content</Label>
        <Textarea
          value={(block.content as string) || ''}
          onChange={(e) => updateBlock(index, { content: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Emphasis</Label>
        <Select
          value={(block.emphasis as string) || 'medium'}
          onValueChange={(v) => updateBlock(index, { emphasis: v })}
        >
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function ImageEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Image URL</Label>
        <Input
          value={(block.src as string) || ''}
          onChange={(e) => updateBlock(index, { src: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white h-9"
        />
      </div>
      {block.src && (
        <div className="aspect-video bg-gray-800 rounded overflow-hidden">
          <img src={block.src as string} alt="Preview" className="w-full h-full object-cover" />
        </div>
      )}
      <div>
        <Label className="text-xs text-gray-400">Alt Text</Label>
        <Input
          value={(block.alt as string) || ''}
          onChange={(e) => updateBlock(index, { alt: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white h-9"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Caption</Label>
        <Input
          value={(block.caption as string) || ''}
          onChange={(e) => updateBlock(index, { caption: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white h-9"
        />
      </div>
    </div>
  );
}

function QuoteEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Quote Text</Label>
        <Textarea
          value={(block.text as string) || ''}
          onChange={(e) => updateBlock(index, { text: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Author</Label>
        <Input
          value={(block.author as string) || ''}
          onChange={(e) => updateBlock(index, { author: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white h-9"
        />
      </div>
    </div>
  );
}

function ListEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  const items = (block.items as string[]) || [];
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Title</Label>
        <Input
          value={(block.title as string) || ''}
          onChange={(e) => updateBlock(index, { title: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white h-9"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Style</Label>
        <Select
          value={(block.style as string) || 'bullet'}
          onValueChange={(v) => updateBlock(index, { style: v })}
        >
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bullet">• Bullet</SelectItem>
            <SelectItem value="numbered">1. Numbered</SelectItem>
            <SelectItem value="checkmarks">✓ Checkmarks</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <div className="flex justify-between items-center mb-2">
          <Label className="text-xs text-gray-400">Items ({items.length})</Label>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs"
            onClick={() => updateBlock(index, { items: [...items, 'New Item'] })}
          >
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-1">
          {items.map((item, i) => (
            <div key={i} className="flex gap-1">
              <Input
                value={item}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[i] = e.target.value;
                  updateBlock(index, { items: newItems });
                }}
                className="bg-gray-800 border-gray-700 text-white flex-1 h-8 text-sm"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-400"
                onClick={() => updateBlock(index, { items: items.filter((_, idx) => idx !== i) })}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimelineEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  const events = (block.events as Array<{ year: string; title: string; description?: string }>) || [];
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Title</Label>
        <Input
          value={(block.title as string) || ''}
          onChange={(e) => updateBlock(index, { title: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white h-9"
        />
      </div>
      <div>
        <div className="flex justify-between items-center mb-2">
          <Label className="text-xs text-gray-400">Events</Label>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs"
            onClick={() => updateBlock(index, { 
              events: [...events, { year: '2024', title: 'New Event', description: '' }] 
            })}
          >
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-2">
          {events.map((event, i) => (
            <div key={i} className="bg-gray-800 rounded p-2 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={event.year}
                  onChange={(e) => {
                    const newEvents = [...events];
                    newEvents[i] = { ...newEvents[i], year: e.target.value };
                    updateBlock(index, { events: newEvents });
                  }}
                  className="bg-gray-700 border-gray-600 text-white w-20 h-8 text-sm"
                  placeholder="Year"
                />
                <Input
                  value={event.title}
                  onChange={(e) => {
                    const newEvents = [...events];
                    newEvents[i] = { ...newEvents[i], title: e.target.value };
                    updateBlock(index, { events: newEvents });
                  }}
                  className="bg-gray-700 border-gray-600 text-white flex-1 h-8 text-sm"
                  placeholder="Title"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-400"
                  onClick={() => updateBlock(index, { events: events.filter((_, idx) => idx !== i) })}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Input
                value={event.description || ''}
                onChange={(e) => {
                  const newEvents = [...events];
                  newEvents[i] = { ...newEvents[i], description: e.target.value };
                  updateBlock(index, { events: newEvents });
                }}
                className="bg-gray-700 border-gray-600 text-white h-8 text-sm"
                placeholder="Description (optional)"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalloutEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Title</Label>
        <Input
          value={(block.title as string) || ''}
          onChange={(e) => updateBlock(index, { title: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white h-9"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Content</Label>
        <Textarea
          value={(block.content as string) || ''}
          onChange={(e) => updateBlock(index, { content: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Variant</Label>
        <Select
          value={(block.variant as string) || 'default'}
          onValueChange={(v) => updateBlock(index, { variant: v })}
        >
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="success">Success (Green)</SelectItem>
            <SelectItem value="warning">Warning (Yellow)</SelectItem>
            <SelectItem value="info">Info (Blue)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function CodeEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Title</Label>
        <Input
          value={(block.title as string) || ''}
          onChange={(e) => updateBlock(index, { title: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white h-9"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Language</Label>
        <Select
          value={(block.language as string) || 'javascript'}
          onValueChange={(v) => updateBlock(index, { language: v })}
        >
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="javascript">JavaScript</SelectItem>
            <SelectItem value="typescript">TypeScript</SelectItem>
            <SelectItem value="python">Python</SelectItem>
            <SelectItem value="java">Java</SelectItem>
            <SelectItem value="cpp">C++</SelectItem>
            <SelectItem value="go">Go</SelectItem>
            <SelectItem value="rust">Rust</SelectItem>
            <SelectItem value="html">HTML</SelectItem>
            <SelectItem value="css">CSS</SelectItem>
            <SelectItem value="sql">SQL</SelectItem>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="bash">Bash</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-gray-400">Code</Label>
        <Textarea
          value={(block.code as string) || ''}
          onChange={(e) => updateBlock(index, { code: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white font-mono text-sm min-h-[150px]"
        />
      </div>
    </div>
  );
}

function TestimonialEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Quote</Label>
        <Textarea
          value={(block.quote as string) || ''}
          onChange={(e) => updateBlock(index, { quote: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Author</Label>
        <Input
          value={(block.author as string) || ''}
          onChange={(e) => updateBlock(index, { author: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white h-9"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Role</Label>
        <Input
          value={(block.role as string) || ''}
          onChange={(e) => updateBlock(index, { role: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white h-9"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Company</Label>
        <Input
          value={(block.company as string) || ''}
          onChange={(e) => updateBlock(index, { company: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white h-9"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Avatar URL</Label>
        <Input
          value={(block.avatar as string) || ''}
          onChange={(e) => updateBlock(index, { avatar: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white h-9"
          placeholder="https://..."
        />
      </div>
    </div>
  );
}

function WhatsAppEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  const messages = (block.messages as Array<{ from: string; text: string; time?: string }>) || [];
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Person 1 Name (You - Green bubbles)</Label>
        <Input
          value={((block.person1 as Record<string, unknown>)?.name as string) || ''}
          onChange={(e) => updateBlock(index, { person1: { ...block.person1, name: e.target.value } })}
          className="bg-gray-800 border-gray-700 text-white h-9"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Person 1 Avatar URL</Label>
        <Input
          value={((block.person1 as Record<string, unknown>)?.avatar as string) || ''}
          onChange={(e) => updateBlock(index, { person1: { ...block.person1, avatar: e.target.value } })}
          className="bg-gray-800 border-gray-700 text-white h-9"
          placeholder="https://..."
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Person 2 Name (White bubbles)</Label>
        <Input
          value={((block.person2 as Record<string, unknown>)?.name as string) || ''}
          onChange={(e) => updateBlock(index, { person2: { ...block.person2, name: e.target.value } })}
          className="bg-gray-800 border-gray-700 text-white h-9"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Person 2 Avatar URL</Label>
        <Input
          value={((block.person2 as Record<string, unknown>)?.avatar as string) || ''}
          onChange={(e) => updateBlock(index, { person2: { ...block.person2, avatar: e.target.value } })}
          className="bg-gray-800 border-gray-700 text-white h-9"
          placeholder="https://..."
        />
      </div>
      <div>
        <div className="flex justify-between items-center mb-2">
          <Label className="text-xs text-gray-400">Messages ({messages.length})</Label>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs"
            onClick={() => updateBlock(index, { 
              messages: [...messages, { from: 'person1', text: 'New message', time: '' }] 
            })}
          >
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {messages.map((msg, i) => (
            <div key={i} className="bg-gray-800 rounded p-2 space-y-1">
              <div className="flex gap-2 items-center">
                <Select
                  value={msg.from}
                  onValueChange={(v) => {
                    const newMessages = [...messages];
                    newMessages[i] = { ...newMessages[i], from: v };
                    updateBlock(index, { messages: newMessages });
                  }}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-7 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="person1">You</SelectItem>
                    <SelectItem value="person2">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={msg.time || ''}
                  onChange={(e) => {
                    const newMessages = [...messages];
                    newMessages[i] = { ...newMessages[i], time: e.target.value };
                    updateBlock(index, { messages: newMessages });
                  }}
                  className="bg-gray-700 border-gray-600 text-white w-20 h-7 text-xs"
                  placeholder="Time"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-red-400"
                  onClick={() => updateBlock(index, { messages: messages.filter((_, idx) => idx !== i) })}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <Input
                value={msg.text}
                onChange={(e) => {
                  const newMessages = [...messages];
                  newMessages[i] = { ...newMessages[i], text: e.target.value };
                  updateBlock(index, { messages: newMessages });
                }}
                className="bg-gray-700 border-gray-600 text-white h-8 text-sm"
                placeholder="Message"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={(block.showTypingIndicator as boolean) ?? true}
          onCheckedChange={(v) => updateBlock(index, { showTypingIndicator: v })}
        />
        <Label className="text-xs text-gray-400">Show typing indicator</Label>
      </div>
    </div>
  );
}

function MotivationalEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  const colorOverlay = block.colorOverlay as { enabled?: boolean; color?: string; opacity?: number } | undefined;
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Image URL</Label>
        <Input
          value={(block.imageSrc as string) || ''}
          onChange={(e) => updateBlock(index, { imageSrc: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white h-9"
        />
      </div>
      {block.imageSrc && (
        <div className="aspect-video bg-gray-800 rounded overflow-hidden">
          <img src={block.imageSrc as string} alt="Preview" className="w-full h-full object-cover" />
        </div>
      )}
      <div>
        <Label className="text-xs text-gray-400">Text</Label>
        <Textarea
          value={(block.text as string) || ''}
          onChange={(e) => updateBlock(index, { text: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white min-h-[60px]"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Text Style</Label>
        <Select
          value={(block.textStyle as string) || 'default'}
          onValueChange={(v) => updateBlock(index, { textStyle: v })}
        >
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="quote">Quote</SelectItem>
            <SelectItem value="typing">Typing Effect</SelectItem>
            <SelectItem value="words">Word by Word</SelectItem>
            <SelectItem value="glow">Glow</SelectItem>
            <SelectItem value="outline">Outline</SelectItem>
            <SelectItem value="bold-glow">Bold Glow</SelectItem>
            <SelectItem value="shadow">Shadow</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-gray-400">Font Size</Label>
        <Select
          value={(block.fontSize as string) || 'xlarge'}
          onValueChange={(v) => updateBlock(index, { fontSize: v })}
        >
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">Small</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="large">Large</SelectItem>
            <SelectItem value="xlarge">Extra Large</SelectItem>
            <SelectItem value="xxlarge">XX Large</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-gray-400">Font Weight</Label>
        <Select
          value={(block.fontWeight as string) || 'bold'}
          onValueChange={(v) => updateBlock(index, { fontWeight: v })}
        >
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="bold">Bold</SelectItem>
            <SelectItem value="black">Black</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-gray-400">Text Align</Label>
        <Select
          value={(block.textAlign as string) || 'center'}
          onValueChange={(v) => updateBlock(index, { textAlign: v })}
        >
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="right">Right</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-gray-400">Text Position</Label>
        <Select
          value={(block.textPosition as string) || 'center'}
          onValueChange={(v) => updateBlock(index, { textPosition: v })}
        >
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="top">Top</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="bottom">Bottom</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <ColorPicker
        value={(block.textColor as string) || '#FFFFFF'}
        onChange={(v) => updateBlock(index, { textColor: v })}
        label="Text Color"
      />
      <div>
        <Label className="text-xs text-gray-400">Image Effect</Label>
        <Select
          value={(block.imageEffect as string) || 'fade'}
          onValueChange={(v) => updateBlock(index, { imageEffect: v })}
        >
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="fade">Fade</SelectItem>
            <SelectItem value="slide-up">Slide Up</SelectItem>
            <SelectItem value="slide-down">Slide Down</SelectItem>
            <SelectItem value="zoom-in">Zoom In</SelectItem>
            <SelectItem value="zoom-out">Zoom Out</SelectItem>
            <SelectItem value="ken-burns">Ken Burns</SelectItem>
            <SelectItem value="blur">Blur</SelectItem>
            <SelectItem value="bounce">Bounce</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Color Overlay Section */}
      <div className="border border-gray-700 rounded p-3 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-gray-300">Color Overlay</Label>
          <Switch
            checked={colorOverlay?.enabled ?? false}
            onCheckedChange={(v) => updateBlock(index, { 
              colorOverlay: { ...colorOverlay, enabled: v, color: colorOverlay?.color || '#000000', opacity: colorOverlay?.opacity || 0.4 }
            })}
          />
        </div>
        {colorOverlay?.enabled && (
          <>
            <ColorPicker
              value={colorOverlay.color || '#000000'}
              onChange={(v) => updateBlock(index, { 
                colorOverlay: { ...colorOverlay, color: v } 
              })}
              label="Overlay Color"
            />
            <SliderInput
              label="Opacity"
              value={colorOverlay.opacity || 0.4}
              onChange={(v) => updateBlock(index, { 
                colorOverlay: { ...colorOverlay, opacity: v } 
              })}
              min={0}
              max={1}
              step={0.05}
              unit=""
            />
          </>
        )}
      </div>
      
      {/* Audio Section */}
      <div className="border border-gray-700 rounded p-3 space-y-3">
        <Label className="text-xs text-gray-300">Audio (Optional)</Label>
        <Input
          value={(block.audioSrc as string) || ''}
          onChange={(e) => updateBlock(index, { audioSrc: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white h-9"
          placeholder="Audio URL (mp3)"
        />
        {(block.audioSrc as string) && (
          <SliderInput
            label="Volume"
            value={(block.audioVolume as number) || 0.7}
            onChange={(v) => updateBlock(index, { audioVolume: v })}
            min={0}
            max={1}
            step={0.1}
            unit=""
          />
        )}
      </div>
    </div>
  );
}

function LineChartEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  const data = (block.data as number[]) || [];
  const labels = (block.labels as string[]) || [];
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Title</Label>
        <Input
          value={(block.title as string) || ''}
          onChange={(e) => updateBlock(index, { title: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white h-9"
        />
      </div>
      <ColorPicker
        value={(block.lineColor as string) || '#3B82F6'}
        onChange={(v) => updateBlock(index, { lineColor: v })}
        label="Line Color"
      />
      <div>
        <Label className="text-xs text-gray-400">Data Points (comma separated)</Label>
        <Input
          value={data.join(', ')}
          onChange={(e) => updateBlock(index, { 
            data: e.target.value.split(',').map(v => parseFloat(v.trim()) || 0) 
          })}
          className="bg-gray-800 border-gray-700 text-white h-9"
          placeholder="10, 20, 30, 40"
        />
      </div>
      <div>
        <Label className="text-xs text-gray-400">Labels (comma separated)</Label>
        <Input
          value={labels.join(', ')}
          onChange={(e) => updateBlock(index, { 
            labels: e.target.value.split(',').map(v => v.trim()) 
          })}
          className="bg-gray-800 border-gray-700 text-white h-9"
          placeholder="Jan, Feb, Mar, Apr"
        />
      </div>
    </div>
  );
}

function PieChartEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  const segments = (block.segments as Array<{ label: string; value: number; color?: string }>) || [];
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Title</Label>
        <Input
          value={(block.title as string) || ''}
          onChange={(e) => updateBlock(index, { title: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white h-9"
        />
      </div>
      <div>
        <div className="flex justify-between items-center mb-2">
          <Label className="text-xs text-gray-400">Segments</Label>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs"
            onClick={() => updateBlock(index, { 
              segments: [...segments, { label: 'New', value: 25, color: '#888888' }] 
            })}
          >
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-2">
          {segments.map((seg, i) => (
            <div key={i} className="bg-gray-800 rounded p-2 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={seg.label}
                  onChange={(e) => {
                    const newSegs = [...segments];
                    newSegs[i] = { ...newSegs[i], label: e.target.value };
                    updateBlock(index, { segments: newSegs });
                  }}
                  className="bg-gray-700 border-gray-600 text-white flex-1 h-8 text-sm"
                  placeholder="Label"
                />
                <Input
                  value={seg.value.toString()}
                  onChange={(e) => {
                    const newSegs = [...segments];
                    newSegs[i] = { ...newSegs[i], value: parseFloat(e.target.value) || 0 };
                    updateBlock(index, { segments: newSegs });
                  }}
                  className="bg-gray-700 border-gray-600 text-white w-16 h-8 text-sm"
                  type="number"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-400"
                  onClick={() => updateBlock(index, { segments: segments.filter((_, idx) => idx !== i) })}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <ColorPicker
                value={seg.color || '#888888'}
                onChange={(c) => {
                  const newSegs = [...segments];
                  newSegs[i] = { ...newSegs[i], color: c };
                  updateBlock(index, { segments: newSegs });
                }}
                label="Color"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IconListEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  const items = (block.items as Array<{ icon: string; title: string; description?: string }>) || [];
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-gray-400">Title</Label>
        <Input
          value={(block.title as string) || ''}
          onChange={(e) => updateBlock(index, { title: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white h-9"
        />
      </div>
      <div>
        <div className="flex justify-between items-center mb-2">
          <Label className="text-xs text-gray-400">Items</Label>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs"
            onClick={() => updateBlock(index, { 
              items: [...items, { icon: '⭐', title: 'New Item', description: '' }] 
            })}
          >
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="bg-gray-800 rounded p-2 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={item.icon}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[i] = { ...newItems[i], icon: e.target.value };
                    updateBlock(index, { items: newItems });
                  }}
                  className="bg-gray-700 border-gray-600 text-white w-12 h-8 text-sm text-center"
                  placeholder="emoji"
                />
                <Input
                  value={item.title}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[i] = { ...newItems[i], title: e.target.value };
                    updateBlock(index, { items: newItems });
                  }}
                  className="bg-gray-700 border-gray-600 text-white flex-1 h-8 text-sm"
                  placeholder="Title"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-400"
                  onClick={() => updateBlock(index, { items: items.filter((_, idx) => idx !== i) })}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Input
                value={item.description || ''}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[i] = { ...newItems[i], description: e.target.value };
                  updateBlock(index, { items: newItems });
                }}
                className="bg-gray-700 border-gray-600 text-white h-8 text-sm"
                placeholder="Description (optional)"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
