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
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Copy, Settings, Plus, X, Sparkles, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { 
  BarChart3, Type, Image, Quote, List, Clock, AlertCircle, 
  Grid3X3, LineChart, PieChart, Code, MessageSquare, Heart, MessageCircle 
} from 'lucide-react';

const BLOCK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  stat: BarChart3, comparison: BarChart3, text: Type, image: Image, quote: Quote,
  list: List, timeline: Clock, callout: AlertCircle, 'icon-list': Grid3X3,
  'line-chart': LineChart, 'pie-chart': PieChart, code: Code, testimonial: MessageSquare,
  'whatsapp-chat': MessageCircle, 'motivational-image': Heart,
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
};

// Color Picker Component
function ColorPicker({ value, onChange, label }: { value: string; onChange: (color: string) => void; label?: string }) {
  return (
    <div className="space-y-2">
      {label && <Label className="text-xs text-gray-400 font-medium">{label}</Label>}
      <div className="flex gap-2">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer bg-gray-800 appearance-none"
            style={{ padding: 0 }}
          />
          <div 
            className="absolute inset-0 rounded-lg pointer-events-none ring-1 ring-inset ring-white/10"
            style={{ backgroundColor: value }}
          />
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-gray-800/50 border-gray-700/50 text-white flex-1 h-10 font-mono text-sm"
          placeholder="#FFFFFF"
        />
      </div>
    </div>
  );
}

// Slider Input Component
function SliderInput({ label, value, onChange, min = 0, max = 10, step = 0.5, unit = 's' }: {
  label: string; value: number; onChange: (value: number) => void;
  min?: number; max?: number; step?: number; unit?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label className="text-xs text-gray-400 font-medium">{label}</Label>
        <span className="text-xs text-white font-mono bg-gray-800 px-2 py-0.5 rounded">{value}{unit}</span>
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

// Collapsible Section
function CollapsibleSection({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-gray-700/50 rounded-xl overflow-hidden bg-gray-800/30">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-gray-400" />}
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 pt-0 space-y-4 border-t border-gray-700/50 mt-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PropertiesPanel() {
  const { videoInput, selectedBlockIndex, updateBlock, duplicateBlock, removeBlock } = useEditorStore();

  const selectedBlock = selectedBlockIndex !== null ? videoInput.contentBlocks[selectedBlockIndex] : null;

  if (!selectedBlock) {
    return (
      <div className="w-80 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border-l border-gray-800/50 flex flex-col h-full overflow-hidden">
        <div className="p-5 border-b border-gray-800/50 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Properties</h2>
              <p className="text-xs text-gray-400">Edit block settings</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-800/50 flex items-center justify-center mx-auto mb-4 border border-gray-700/50">
              <Sparkles className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-gray-400 text-sm">Select a block to edit</p>
          </motion.div>
        </div>
      </div>
    );
  }

  const blockType = selectedBlock.type;
  const Icon = BLOCK_ICONS[blockType] || Settings;
  const gradient = BLOCK_GRADIENTS[blockType] || 'from-gray-500 to-gray-600';

  return (
    <div className="w-80 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border-l border-gray-800/50 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800/50 bg-gray-900/50 backdrop-blur flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white capitalize">{blockType.replace('-', ' ')}</h2>
              <p className="text-[10px] text-gray-500">Block Properties</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800" onClick={() => duplicateBlock(selectedBlockIndex!)} title="Duplicate">
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-gray-800" onClick={() => removeBlock(selectedBlockIndex!)} title="Delete">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Properties Form */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {/* Duration Slider */}
          <CollapsibleSection title="Timing" icon={Clock} defaultOpen={true}>
            <SliderInput
              label="Duration"
              value={(selectedBlock as { duration?: number }).duration || 4}
              onChange={(v) => updateBlock(selectedBlockIndex!, { duration: v })}
              min={1}
              max={30}
              step={0.5}
              unit="s"
            />
          </CollapsibleSection>
          
          {/* Block-specific editors */}
          {blockType === 'stat' && <StatEditor block={selectedBlock} index={selectedBlockIndex} />}
          {blockType === 'comparison' && <ComparisonEditor block={selectedBlock} index={selectedBlockIndex} />}
          {blockType === 'text' && <TextEditor block={selectedBlock} index={selectedBlockIndex} />}
          {blockType === 'image' && <ImageEditor block={selectedBlock} index={selectedBlockIndex} />}
          {blockType === 'quote' && <QuoteEditor block={selectedBlock} index={selectedBlockIndex} />}
          {blockType === 'list' && <ListEditor block={selectedBlock} index={selectedBlockIndex} />}
          {blockType === 'timeline' && <TimelineEditor block={selectedBlock} index={selectedBlockIndex} />}
          {blockType === 'callout' && <CalloutEditor block={selectedBlock} index={selectedBlockIndex} />}
          {blockType === 'code' && <CodeEditor block={selectedBlock} index={selectedBlockIndex} />}
          {blockType === 'testimonial' && <TestimonialEditor block={selectedBlock} index={selectedBlockIndex} />}
          {blockType === 'whatsapp-chat' && <WhatsAppEditor block={selectedBlock} index={selectedBlockIndex} />}
          {blockType === 'motivational-image' && <MotivationalEditor block={selectedBlock} index={selectedBlockIndex} />}
          {blockType === 'line-chart' && <LineChartEditor block={selectedBlock} index={selectedBlockIndex} />}
          {blockType === 'pie-chart' && <PieChartEditor block={selectedBlock} index={selectedBlockIndex} />}
          {blockType === 'icon-list' && <IconListEditor block={selectedBlock} index={selectedBlockIndex} />}
        </div>
      </ScrollArea>
    </div>
  );
}

// Import necessary icon
import { Clock } from 'lucide-react';

// ============================================================================
// BLOCK EDITORS
// ============================================================================

interface EditorProps {
  block: Record<string, unknown>;
  index: number;
}

const { updateBlock: useUpdateBlock } = useEditorStore.getState();

function StatEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  return (
    <CollapsibleSection title="Content" icon={Type} defaultOpen={true}>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-gray-400">Heading</Label>
          <Input value={(block.heading as string) || ''} onChange={(e) => updateBlock(index, { heading: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" />
        </div>
        <div>
          <Label className="text-xs text-gray-400">Value</Label>
          <Input value={(block.value as string) || ''} onChange={(e) => updateBlock(index, { value: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white h-10 text-xl font-bold" />
        </div>
        <div>
          <Label className="text-xs text-gray-400">Subtext</Label>
          <Input value={(block.subtext as string) || ''} onChange={(e) => updateBlock(index, { subtext: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" />
        </div>
      </div>
    </CollapsibleSection>
  );
}

function ComparisonEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  const items = (block.items as Array<{ label: string; value: number; color?: string }>) || [];
  
  return (
    <CollapsibleSection title="Comparison Items" icon={BarChart3} defaultOpen={true}>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-gray-400">Title</Label>
          <Input value={(block.title as string) || ''} onChange={(e) => updateBlock(index, { title: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-xs text-gray-400">Items ({items.length})</Label>
            <Button variant="outline" size="sm" className="h-7 text-xs bg-gray-800 border-gray-700" onClick={() => updateBlock(index, { items: [...items, { label: 'New', value: 50, color: '#3B82F6' }] })}>
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </div>
          {items.map((item, i) => (
            <div key={i} className="bg-gray-800/50 rounded-lg p-3 space-y-2 border border-gray-700/30">
              <div className="flex gap-2">
                <Input value={item.label} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], label: e.target.value }; updateBlock(index, { items: n }); }} className="bg-gray-700/50 border-gray-600 text-white flex-1 h-9 text-sm" />
                <Input value={item.value.toString()} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], value: parseFloat(e.target.value) || 0 }; updateBlock(index, { items: n }); }} className="bg-gray-700/50 border-gray-600 text-white w-16 h-9 text-sm" type="number" />
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-red-400" onClick={() => updateBlock(index, { items: items.filter((_, idx) => idx !== i) })}><X className="w-4 h-4" /></Button>
              </div>
              <ColorPicker value={item.color || '#3B82F6'} onChange={(c) => { const n = [...items]; n[i] = { ...n[i], color: c }; updateBlock(index, { items: n }); }} />
            </div>
          ))}
        </div>
      </div>
    </CollapsibleSection>
  );
}

function TextEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  return (
    <CollapsibleSection title="Text Content" icon={Type} defaultOpen={true}>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-gray-400">Content</Label>
          <Textarea value={(block.content as string) || ''} onChange={(e) => updateBlock(index, { content: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white min-h-[100px]" />
        </div>
        <div>
          <Label className="text-xs text-gray-400">Emphasis</Label>
          <Select value={(block.emphasis as string) || 'medium'} onValueChange={(v) => updateBlock(index, { emphasis: v })}>
            <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </CollapsibleSection>
  );
}

function ImageEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  return (
    <CollapsibleSection title="Image Settings" icon={Image} defaultOpen={true}>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-gray-400">Image URL</Label>
          <Input value={(block.src as string) || ''} onChange={(e) => updateBlock(index, { src: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" />
        </div>
        {block.src && <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-700/30"><img src={block.src as string} alt="Preview" className="w-full h-full object-cover" /></div>}
        <div><Label className="text-xs text-gray-400">Alt Text</Label><Input value={(block.alt as string) || ''} onChange={(e) => updateBlock(index, { alt: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" /></div>
        <div><Label className="text-xs text-gray-400">Caption</Label><Input value={(block.caption as string) || ''} onChange={(e) => updateBlock(index, { caption: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" /></div>
      </div>
    </CollapsibleSection>
  );
}

function QuoteEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  return (
    <CollapsibleSection title="Quote" icon={Quote} defaultOpen={true}>
      <div className="space-y-3">
        <div><Label className="text-xs text-gray-400">Quote Text</Label><Textarea value={(block.text as string) || ''} onChange={(e) => updateBlock(index, { text: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white min-h-[100px]" /></div>
        <div><Label className="text-xs text-gray-400">Author</Label><Input value={(block.author as string) || ''} onChange={(e) => updateBlock(index, { author: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" /></div>
      </div>
    </CollapsibleSection>
  );
}

function ListEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  const items = (block.items as string[]) || [];
  return (
    <CollapsibleSection title="List Items" icon={List} defaultOpen={true}>
      <div className="space-y-3">
        <div><Label className="text-xs text-gray-400">Title</Label><Input value={(block.title as string) || ''} onChange={(e) => updateBlock(index, { title: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" /></div>
        <div><Label className="text-xs text-gray-400">Style</Label>
          <Select value={(block.style as string) || 'bullet'} onValueChange={(v) => updateBlock(index, { style: v })}>
            <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bullet">• Bullet</SelectItem>
              <SelectItem value="numbered">1. Numbered</SelectItem>
              <SelectItem value="checkmarks">✓ Checkmarks</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center"><Label className="text-xs text-gray-400">Items</Label><Button variant="outline" size="sm" className="h-7 text-xs bg-gray-800 border-gray-700" onClick={() => updateBlock(index, { items: [...items, 'New Item'] })}><Plus className="w-3 h-3 mr-1" /> Add</Button></div>
          {items.map((item, i) => (
            <div key={i} className="flex gap-1">
              <Input value={item} onChange={(e) => { const n = [...items]; n[i] = e.target.value; updateBlock(index, { items: n }); }} className="bg-gray-800/50 border-gray-700/50 text-white flex-1 h-9 text-sm" />
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-red-400" onClick={() => updateBlock(index, { items: items.filter((_, idx) => idx !== i) })}><X className="w-4 h-4" /></Button>
            </div>
          ))}
        </div>
      </div>
    </CollapsibleSection>
  );
}

function TimelineEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  const events = (block.events as Array<{ year: string; title: string; description?: string }>) || [];
  return (
    <CollapsibleSection title="Timeline Events" icon={Clock} defaultOpen={true}>
      <div className="space-y-3">
        <div><Label className="text-xs text-gray-400">Title</Label><Input value={(block.title as string) || ''} onChange={(e) => updateBlock(index, { title: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" /></div>
        <div className="space-y-2">
          <div className="flex justify-between items-center"><Label className="text-xs text-gray-400">Events</Label><Button variant="outline" size="sm" className="h-7 text-xs bg-gray-800 border-gray-700" onClick={() => updateBlock(index, { events: [...events, { year: '2024', title: 'New Event', description: '' }] })}><Plus className="w-3 h-3 mr-1" /> Add</Button></div>
          {events.map((event, i) => (
            <div key={i} className="bg-gray-800/50 rounded-lg p-3 space-y-2 border border-gray-700/30">
              <div className="flex gap-2">
                <Input value={event.year} onChange={(e) => { const n = [...events]; n[i] = { ...n[i], year: e.target.value }; updateBlock(index, { events: n }); }} className="bg-gray-700/50 border-gray-600 text-white w-20 h-9 text-sm" placeholder="Year" />
                <Input value={event.title} onChange={(e) => { const n = [...events]; n[i] = { ...n[i], title: e.target.value }; updateBlock(index, { events: n }); }} className="bg-gray-700/50 border-gray-600 text-white flex-1 h-9 text-sm" placeholder="Title" />
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-red-400" onClick={() => updateBlock(index, { events: events.filter((_, idx) => idx !== i) })}><X className="w-4 h-4" /></Button>
              </div>
              <Input value={event.description || ''} onChange={(e) => { const n = [...events]; n[i] = { ...n[i], description: e.target.value }; updateBlock(index, { events: n }); }} className="bg-gray-700/50 border-gray-600 text-white h-9 text-sm" placeholder="Description" />
            </div>
          ))}
        </div>
      </div>
    </CollapsibleSection>
  );
}

function CalloutEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  return (
    <CollapsibleSection title="Callout" icon={AlertCircle} defaultOpen={true}>
      <div className="space-y-3">
        <div><Label className="text-xs text-gray-400">Title</Label><Input value={(block.title as string) || ''} onChange={(e) => updateBlock(index, { title: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" /></div>
        <div><Label className="text-xs text-gray-400">Content</Label><Textarea value={(block.content as string) || ''} onChange={(e) => updateBlock(index, { content: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white min-h-[80px]" /></div>
        <div><Label className="text-xs text-gray-400">Variant</Label>
          <Select value={(block.variant as string) || 'default'} onValueChange={(v) => updateBlock(index, { variant: v })}>
            <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </CollapsibleSection>
  );
}

function CodeEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  return (
    <CollapsibleSection title="Code Block" icon={Code} defaultOpen={true}>
      <div className="space-y-3">
        <div><Label className="text-xs text-gray-400">Title</Label><Input value={(block.title as string) || ''} onChange={(e) => updateBlock(index, { title: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" /></div>
        <div><Label className="text-xs text-gray-400">Language</Label>
          <Select value={(block.language as string) || 'javascript'} onValueChange={(v) => updateBlock(index, { language: v })}>
            <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="typescript">TypeScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="java">Java</SelectItem>
              <SelectItem value="go">Go</SelectItem>
              <SelectItem value="rust">Rust</SelectItem>
              <SelectItem value="html">HTML</SelectItem>
              <SelectItem value="css">CSS</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs text-gray-400">Code</Label><Textarea value={(block.code as string) || ''} onChange={(e) => updateBlock(index, { code: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white font-mono text-sm min-h-[150px]" /></div>
      </div>
    </CollapsibleSection>
  );
}

function TestimonialEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  return (
    <CollapsibleSection title="Testimonial" icon={MessageSquare} defaultOpen={true}>
      <div className="space-y-3">
        <div><Label className="text-xs text-gray-400">Quote</Label><Textarea value={(block.quote as string) || ''} onChange={(e) => updateBlock(index, { quote: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white min-h-[80px]" /></div>
        <div><Label className="text-xs text-gray-400">Author</Label><Input value={(block.author as string) || ''} onChange={(e) => updateBlock(index, { author: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" /></div>
        <div><Label className="text-xs text-gray-400">Role</Label><Input value={(block.role as string) || ''} onChange={(e) => updateBlock(index, { role: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" /></div>
        <div><Label className="text-xs text-gray-400">Company</Label><Input value={(block.company as string) || ''} onChange={(e) => updateBlock(index, { company: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" /></div>
        <div><Label className="text-xs text-gray-400">Avatar URL</Label><Input value={(block.avatar as string) || ''} onChange={(e) => updateBlock(index, { avatar: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" placeholder="https://..." /></div>
      </div>
    </CollapsibleSection>
  );
}

function WhatsAppEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  const messages = (block.messages as Array<{ from: string; text: string; time?: string }>) || [];
  return (
    <>
      <CollapsibleSection title="Participants" icon={MessageCircle} defaultOpen={true}>
        <div className="space-y-3">
          <div><Label className="text-xs text-gray-400">Person 1 (You - Green)</Label><Input value={((block.person1 as Record<string, unknown>)?.name as string) || ''} onChange={(e) => updateBlock(index, { person1: { ...block.person1, name: e.target.value } })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" /></div>
          <div><Label className="text-xs text-gray-400">Person 1 Avatar</Label><Input value={((block.person1 as Record<string, unknown>)?.avatar as string) || ''} onChange={(e) => updateBlock(index, { person1: { ...block.person1, avatar: e.target.value } })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" placeholder="https://..." /></div>
          <div><Label className="text-xs text-gray-400">Person 2 (White)</Label><Input value={((block.person2 as Record<string, unknown>)?.name as string) || ''} onChange={(e) => updateBlock(index, { person2: { ...block.person2, name: e.target.value } })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" /></div>
          <div><Label className="text-xs text-gray-400">Person 2 Avatar</Label><Input value={((block.person2 as Record<string, unknown>)?.avatar as string) || ''} onChange={(e) => updateBlock(index, { person2: { ...block.person2, avatar: e.target.value } })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" placeholder="https://..." /></div>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Messages" icon={List} defaultOpen={false}>
        <div className="space-y-3">
          <div className="flex justify-end"><Button variant="outline" size="sm" className="h-7 text-xs bg-gray-800 border-gray-700" onClick={() => updateBlock(index, { messages: [...messages, { from: 'person1', text: 'New message', time: '' }] })}><Plus className="w-3 h-3 mr-1" /> Add</Button></div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {messages.map((msg, i) => (
              <div key={i} className="bg-gray-800/50 rounded-lg p-2 space-y-2 border border-gray-700/30">
                <div className="flex gap-2 items-center">
                  <Select value={msg.from} onValueChange={(v) => { const n = [...messages]; n[i] = { ...n[i], from: v }; updateBlock(index, { messages: n }); }}>
                    <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="person1">You</SelectItem><SelectItem value="person2">Other</SelectItem></SelectContent>
                  </Select>
                  <Input value={msg.time || ''} onChange={(e) => { const n = [...messages]; n[i] = { ...n[i], time: e.target.value }; updateBlock(index, { messages: n }); }} className="bg-gray-700/50 border-gray-600 text-white w-20 h-7 text-xs" placeholder="Time" />
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400" onClick={() => updateBlock(index, { messages: messages.filter((_, idx) => idx !== i) })}><X className="w-3 h-3" /></Button>
                </div>
                <Input value={msg.text} onChange={(e) => { const n = [...messages]; n[i] = { ...n[i], text: e.target.value }; updateBlock(index, { messages: n }); }} className="bg-gray-700/50 border-gray-600 text-white h-8 text-sm" placeholder="Message" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Switch checked={(block.showTypingIndicator as boolean) ?? true} onCheckedChange={(v) => updateBlock(index, { showTypingIndicator: v })} />
            <Label className="text-xs text-gray-400">Show typing indicator</Label>
          </div>
        </div>
      </CollapsibleSection>
    </>
  );
}

function MotivationalEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  const colorOverlay = block.colorOverlay as { enabled?: boolean; color?: string; opacity?: number } | undefined;
  
  return (
    <>
      <CollapsibleSection title="Image" icon={Image} defaultOpen={true}>
        <div className="space-y-3">
          <div><Label className="text-xs text-gray-400">Image URL</Label><Input value={(block.imageSrc as string) || ''} onChange={(e) => updateBlock(index, { imageSrc: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" /></div>
          {block.imageSrc && <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-700/30"><img src={block.imageSrc as string} alt="Preview" className="w-full h-full object-cover" /></div>}
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Text" icon={Type} defaultOpen={true}>
        <div className="space-y-3">
          <div><Label className="text-xs text-gray-400">Text</Label><Textarea value={(block.text as string) || ''} onChange={(e) => updateBlock(index, { text: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white min-h-[60px]" /></div>
          <div><Label className="text-xs text-gray-400">Style</Label>
            <Select value={(block.textStyle as string) || 'default'} onValueChange={(v) => updateBlock(index, { textStyle: v })}>
              <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem><SelectItem value="quote">Quote</SelectItem><SelectItem value="typing">Typing</SelectItem>
                <SelectItem value="words">Word by Word</SelectItem><SelectItem value="glow">Glow</SelectItem><SelectItem value="outline">Outline</SelectItem>
                <SelectItem value="bold-glow">Bold Glow</SelectItem><SelectItem value="shadow">Shadow</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs text-gray-400">Font Size</Label>
              <Select value={(block.fontSize as string) || 'xlarge'} onValueChange={(v) => updateBlock(index, { fontSize: v })}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="large">Large</SelectItem>
                  <SelectItem value="xlarge">XLarge</SelectItem><SelectItem value="xxlarge">XXLarge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs text-gray-400">Weight</Label>
              <Select value={(block.fontWeight as string) || 'bold'} onValueChange={(v) => updateBlock(index, { fontWeight: v })}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem><SelectItem value="bold">Bold</SelectItem><SelectItem value="black">Black</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs text-gray-400">Align</Label>
              <Select value={(block.textAlign as string) || 'center'} onValueChange={(v) => updateBlock(index, { textAlign: v })}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white h-10"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs text-gray-400">Position</Label>
              <Select value={(block.textPosition as string) || 'center'} onValueChange={(v) => updateBlock(index, { textPosition: v })}>
                <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white h-10"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="top">Top</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="bottom">Bottom</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <ColorPicker value={(block.textColor as string) || '#FFFFFF'} onChange={(v) => updateBlock(index, { textColor: v })} label="Text Color" />
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Image Effect" icon={Sparkles} defaultOpen={false}>
        <div className="space-y-3">
          <div><Label className="text-xs text-gray-400">Effect</Label>
            <Select value={(block.imageEffect as string) || 'fade'} onValueChange={(v) => updateBlock(index, { imageEffect: v })}>
              <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem><SelectItem value="fade">Fade</SelectItem><SelectItem value="slide-up">Slide Up</SelectItem>
                <SelectItem value="zoom-in">Zoom In</SelectItem><SelectItem value="zoom-out">Zoom Out</SelectItem>
                <SelectItem value="ken-burns">Ken Burns</SelectItem><SelectItem value="blur">Blur</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Color Overlay" icon={AlertCircle} defaultOpen={false}>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Switch checked={colorOverlay?.enabled ?? false} onCheckedChange={(v) => updateBlock(index, { colorOverlay: { ...colorOverlay, enabled: v, color: colorOverlay?.color || '#000000', opacity: colorOverlay?.opacity || 0.4 } })} />
            <Label className="text-xs text-gray-400">Enable Overlay</Label>
          </div>
          {colorOverlay?.enabled && (
            <>
              <ColorPicker value={colorOverlay.color || '#000000'} onChange={(v) => updateBlock(index, { colorOverlay: { ...colorOverlay, color: v } })} label="Color" />
              <SliderInput label="Opacity" value={colorOverlay.opacity || 0.4} onChange={(v) => updateBlock(index, { colorOverlay: { ...colorOverlay, opacity: v } })} min={0} max={1} step={0.05} unit="" />
            </>
          )}
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Audio" icon={MessageCircle} defaultOpen={false}>
        <div className="space-y-3">
          <div><Label className="text-xs text-gray-400">Audio URL (MP3)</Label><Input value={(block.audioSrc as string) || ''} onChange={(e) => updateBlock(index, { audioSrc: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" placeholder="https://..." /></div>
          {(block.audioSrc as string) && <SliderInput label="Volume" value={(block.audioVolume as number) || 0.7} onChange={(v) => updateBlock(index, { audioVolume: v })} min={0} max={1} step={0.1} unit="" />}
        </div>
      </CollapsibleSection>
    </>
  );
}

function LineChartEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  const data = (block.data as number[]) || [];
  return (
    <CollapsibleSection title="Chart Data" icon={LineChart} defaultOpen={true}>
      <div className="space-y-3">
        <div><Label className="text-xs text-gray-400">Title</Label><Input value={(block.title as string) || ''} onChange={(e) => updateBlock(index, { title: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" /></div>
        <ColorPicker value={(block.lineColor as string) || '#3B82F6'} onChange={(v) => updateBlock(index, { lineColor: v })} label="Line Color" />
        <div><Label className="text-xs text-gray-400">Data Points</Label><Input value={data.join(', ')} onChange={(e) => updateBlock(index, { data: e.target.value.split(',').map(v => parseFloat(v.trim()) || 0) })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" placeholder="10, 20, 30" /></div>
        <div><Label className="text-xs text-gray-400">Labels</Label><Input value={((block.labels as string[]) || []).join(', ')} onChange={(e) => updateBlock(index, { labels: e.target.value.split(',').map(v => v.trim()) })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" placeholder="Jan, Feb, Mar" /></div>
      </div>
    </CollapsibleSection>
  );
}

function PieChartEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  const segments = (block.segments as Array<{ label: string; value: number; color?: string }>) || [];
  return (
    <CollapsibleSection title="Pie Segments" icon={PieChart} defaultOpen={true}>
      <div className="space-y-3">
        <div><Label className="text-xs text-gray-400">Title</Label><Input value={(block.title as string) || ''} onChange={(e) => updateBlock(index, { title: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" /></div>
        <div className="space-y-2">
          <div className="flex justify-end"><Button variant="outline" size="sm" className="h-7 text-xs bg-gray-800 border-gray-700" onClick={() => updateBlock(index, { segments: [...segments, { label: 'New', value: 25, color: '#888888' }] })}><Plus className="w-3 h-3 mr-1" /> Add</Button></div>
          {segments.map((seg, i) => (
            <div key={i} className="bg-gray-800/50 rounded-lg p-3 space-y-2 border border-gray-700/30">
              <div className="flex gap-2">
                <Input value={seg.label} onChange={(e) => { const n = [...segments]; n[i] = { ...n[i], label: e.target.value }; updateBlock(index, { segments: n }); }} className="bg-gray-700/50 border-gray-600 text-white flex-1 h-9 text-sm" />
                <Input value={seg.value.toString()} onChange={(e) => { const n = [...segments]; n[i] = { ...n[i], value: parseFloat(e.target.value) || 0 }; updateBlock(index, { segments: n }); }} className="bg-gray-700/50 border-gray-600 text-white w-16 h-9 text-sm" type="number" />
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-red-400" onClick={() => updateBlock(index, { segments: segments.filter((_, idx) => idx !== i) })}><X className="w-4 h-4" /></Button>
              </div>
              <ColorPicker value={seg.color || '#888888'} onChange={(c) => { const n = [...segments]; n[i] = { ...n[i], color: c }; updateBlock(index, { segments: n }); }} />
            </div>
          ))}
        </div>
      </div>
    </CollapsibleSection>
  );
}

function IconListEditor({ block, index }: EditorProps) {
  const { updateBlock } = useEditorStore();
  const items = (block.items as Array<{ icon: string; title: string; description?: string }>) || [];
  return (
    <CollapsibleSection title="Features" icon={Grid3X3} defaultOpen={true}>
      <div className="space-y-3">
        <div><Label className="text-xs text-gray-400">Title</Label><Input value={(block.title as string) || ''} onChange={(e) => updateBlock(index, { title: e.target.value })} className="bg-gray-800/50 border-gray-700/50 text-white h-10" /></div>
        <div className="space-y-2">
          <div className="flex justify-end"><Button variant="outline" size="sm" className="h-7 text-xs bg-gray-800 border-gray-700" onClick={() => updateBlock(index, { items: [...items, { icon: '⭐', title: 'New Item', description: '' }] })}><Plus className="w-3 h-3 mr-1" /> Add</Button></div>
          {items.map((item, i) => (
            <div key={i} className="bg-gray-800/50 rounded-lg p-3 space-y-2 border border-gray-700/30">
              <div className="flex gap-2">
                <Input value={item.icon} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], icon: e.target.value }; updateBlock(index, { items: n }); }} className="bg-gray-700/50 border-gray-600 text-white w-12 h-9 text-sm text-center" placeholder="icon" />
                <Input value={item.title} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], title: e.target.value }; updateBlock(index, { items: n }); }} className="bg-gray-700/50 border-gray-600 text-white flex-1 h-9 text-sm" placeholder="Title" />
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-red-400" onClick={() => updateBlock(index, { items: items.filter((_, idx) => idx !== i) })}><X className="w-4 h-4" /></Button>
              </div>
              <Input value={item.description || ''} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], description: e.target.value }; updateBlock(index, { items: n }); }} className="bg-gray-700/50 border-gray-600 text-white h-9 text-sm" placeholder="Description" />
            </div>
          ))}
        </div>
      </div>
    </CollapsibleSection>
  );
}
