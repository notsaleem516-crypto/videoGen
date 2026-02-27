'use client';

import { useEditorStore } from '@/store/editor-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Copy, Settings } from 'lucide-react';

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
      <div className="p-4 border-b border-gray-800">
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
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-red-400"
              onClick={() => removeBlock(selectedBlockIndex!)}
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
          {/* Render different forms based on block type */}
          {blockType === 'stat' && (
            <StatProperties block={selectedBlock} index={selectedBlockIndex} />
          )}
          {blockType === 'comparison' && (
            <ComparisonProperties block={selectedBlock} index={selectedBlockIndex} />
          )}
          {blockType === 'text' && (
            <TextProperties block={selectedBlock} index={selectedBlockIndex} />
          )}
          {blockType === 'image' && (
            <ImageProperties block={selectedBlock} index={selectedBlockIndex} />
          )}
          {blockType === 'quote' && (
            <QuoteProperties block={selectedBlock} index={selectedBlockIndex} />
          )}
          {blockType === 'list' && (
            <ListProperties block={selectedBlock} index={selectedBlockIndex} />
          )}
          {blockType === 'timeline' && (
            <TimelineProperties block={selectedBlock} index={selectedBlockIndex} />
          )}
          {blockType === 'callout' && (
            <CalloutProperties block={selectedBlock} index={selectedBlockIndex} />
          )}
          {blockType === 'code' && (
            <CodeProperties block={selectedBlock} index={selectedBlockIndex} />
          )}
          {blockType === 'testimonial' && (
            <TestimonialProperties block={selectedBlock} index={selectedBlockIndex} />
          )}
          {blockType === 'whatsapp-chat' && (
            <WhatsAppProperties block={selectedBlock} index={selectedBlockIndex} />
          )}
          {blockType === 'motivational-image' && (
            <MotivationalProperties block={selectedBlock} index={selectedBlockIndex} />
          )}
          {(blockType === 'line-chart' || blockType === 'pie-chart' || blockType === 'icon-list') && (
            <ChartProperties block={selectedBlock} index={selectedBlockIndex} />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Property Components
interface PropertyProps {
  block: Record<string, unknown>;
  index: number;
}

function StatProperties({ block, index }: PropertyProps) {
  const { updateBlock } = useEditorStore();
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-gray-300">Heading</Label>
        <Input
          value={(block.heading as string) || ''}
          onChange={(e) => updateBlock(index, { heading: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>
      <div>
        <Label className="text-gray-300">Value</Label>
        <Input
          value={(block.value as string) || ''}
          onChange={(e) => updateBlock(index, { value: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>
      <div>
        <Label className="text-gray-300">Subtext</Label>
        <Input
          value={(block.subtext as string) || ''}
          onChange={(e) => updateBlock(index, { subtext: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>
    </div>
  );
}

function ComparisonProperties({ block, index }: PropertyProps) {
  const { updateBlock } = useEditorStore();
  const items = (block.items as Array<{ label: string; value: number; color?: string }>) || [];
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-gray-300">Title</Label>
        <Input
          value={(block.title as string) || ''}
          onChange={(e) => updateBlock(index, { title: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>
      <div>
        <Label className="text-gray-300">Items ({items.length})</Label>
        <div className="space-y-2 mt-2">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={item.label}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[i] = { ...newItems[i], label: e.target.value };
                  updateBlock(index, { items: newItems });
                }}
                className="bg-gray-800 border-gray-700 text-white flex-1"
                placeholder="Label"
              />
              <Input
                value={item.value.toString()}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[i] = { ...newItems[i], value: parseFloat(e.target.value) || 0 };
                  updateBlock(index, { items: newItems });
                }}
                className="bg-gray-800 border-gray-700 text-white w-20"
                placeholder="Value"
                type="number"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TextProperties({ block, index }: PropertyProps) {
  const { updateBlock } = useEditorStore();
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-gray-300">Content</Label>
        <Textarea
          value={(block.content as string) || ''}
          onChange={(e) => updateBlock(index, { content: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
        />
      </div>
      <div>
        <Label className="text-gray-300">Emphasis</Label>
        <Select
          value={(block.emphasis as string) || 'medium'}
          onValueChange={(v) => updateBlock(index, { emphasis: v })}
        >
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
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

function ImageProperties({ block, index }: PropertyProps) {
  const { updateBlock } = useEditorStore();
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-gray-300">Image URL</Label>
        <Input
          value={(block.src as string) || ''}
          onChange={(e) => updateBlock(index, { src: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>
      <div>
        <Label className="text-gray-300">Alt Text</Label>
        <Input
          value={(block.alt as string) || ''}
          onChange={(e) => updateBlock(index, { alt: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>
      <div>
        <Label className="text-gray-300">Caption</Label>
        <Input
          value={(block.caption as string) || ''}
          onChange={(e) => updateBlock(index, { caption: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>
    </div>
  );
}

function QuoteProperties({ block, index }: PropertyProps) {
  const { updateBlock } = useEditorStore();
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-gray-300">Quote Text</Label>
        <Textarea
          value={(block.text as string) || ''}
          onChange={(e) => updateBlock(index, { text: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
        />
      </div>
      <div>
        <Label className="text-gray-300">Author</Label>
        <Input
          value={(block.author as string) || ''}
          onChange={(e) => updateBlock(index, { author: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>
    </div>
  );
}

function ListProperties({ block, index }: PropertyProps) {
  const { updateBlock } = useEditorStore();
  const items = (block.items as string[]) || [];
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-gray-300">Title</Label>
        <Input
          value={(block.title as string) || ''}
          onChange={(e) => updateBlock(index, { title: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>
      <div>
        <Label className="text-gray-300">Style</Label>
        <Select
          value={(block.style as string) || 'bullet'}
          onValueChange={(v) => updateBlock(index, { style: v })}
        >
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bullet">Bullet</SelectItem>
            <SelectItem value="numbered">Numbered</SelectItem>
            <SelectItem value="checkmarks">Checkmarks</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-gray-300">Items</Label>
        <div className="space-y-2 mt-2">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={item}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[i] = e.target.value;
                  updateBlock(index, { items: newItems });
                }}
                className="bg-gray-800 border-gray-700 text-white flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400"
                onClick={() => {
                  const newItems = items.filter((_, idx) => idx !== i);
                  updateBlock(index, { items: newItems });
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => updateBlock(index, { items: [...items, 'New Item'] })}
          >
            + Add Item
          </Button>
        </div>
      </div>
    </div>
  );
}

function TimelineProperties({ block, index }: PropertyProps) {
  const { updateBlock } = useEditorStore();
  const events = (block.events as Array<{ year: string; title: string; description?: string }>) || [];
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-gray-300">Title</Label>
        <Input
          value={(block.title as string) || ''}
          onChange={(e) => updateBlock(index, { title: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>
      <div>
        <Label className="text-gray-300">Events ({events.length})</Label>
        <p className="text-xs text-gray-500 mt-1">Edit events in JSON mode</p>
      </div>
    </div>
  );
}

function CalloutProperties({ block, index }: PropertyProps) {
  const { updateBlock } = useEditorStore();
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-gray-300">Title</Label>
        <Input
          value={(block.title as string) || ''}
          onChange={(e) => updateBlock(index, { title: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>
      <div>
        <Label className="text-gray-300">Content</Label>
        <Textarea
          value={(block.content as string) || ''}
          onChange={(e) => updateBlock(index, { content: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
        />
      </div>
      <div>
        <Label className="text-gray-300">Variant</Label>
        <Select
          value={(block.variant as string) || 'default'}
          onValueChange={(v) => updateBlock(index, { variant: v })}
        >
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function CodeProperties({ block, index }: PropertyProps) {
  const { updateBlock } = useEditorStore();
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-gray-300">Title</Label>
        <Input
          value={(block.title as string) || ''}
          onChange={(e) => updateBlock(index, { title: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>
      <div>
        <Label className="text-gray-300">Language</Label>
        <Input
          value={(block.language as string) || 'javascript'}
          onChange={(e) => updateBlock(index, { language: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>
      <div>
        <Label className="text-gray-300">Code</Label>
        <Textarea
          value={(block.code as string) || ''}
          onChange={(e) => updateBlock(index, { code: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white font-mono min-h-[150px]"
        />
      </div>
    </div>
  );
}

function TestimonialProperties({ block, index }: PropertyProps) {
  const { updateBlock } = useEditorStore();
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-gray-300">Quote</Label>
        <Textarea
          value={(block.quote as string) || ''}
          onChange={(e) => updateBlock(index, { quote: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
        />
      </div>
      <div>
        <Label className="text-gray-300">Author</Label>
        <Input
          value={(block.author as string) || ''}
          onChange={(e) => updateBlock(index, { author: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>
      <div>
        <Label className="text-gray-300">Role</Label>
        <Input
          value={(block.role as string) || ''}
          onChange={(e) => updateBlock(index, { role: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>
      <div>
        <Label className="text-gray-300">Company</Label>
        <Input
          value={(block.company as string) || ''}
          onChange={(e) => updateBlock(index, { company: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>
      <div>
        <Label className="text-gray-300">Avatar URL</Label>
        <Input
          value={(block.avatar as string) || ''}
          onChange={(e) => updateBlock(index, { avatar: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>
    </div>
  );
}

function WhatsAppProperties({ block, index }: PropertyProps) {
  const { updateBlock } = useEditorStore();
  const messages = (block.messages as Array<{ from: string; text: string }>) || [];
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-gray-300">Person 1 Name (You)</Label>
        <Input
          value={((block.person1 as { name: string })?.name) || ''}
          onChange={(e) => updateBlock(index, { person1: { ...block.person1, name: e.target.value } })}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>
      <div>
        <Label className="text-gray-300">Person 2 Name</Label>
        <Input
          value={((block.person2 as { name: string })?.name) || ''}
          onChange={(e) => updateBlock(index, { person2: { ...block.person2, name: e.target.value } })}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>
      <div>
        <Label className="text-gray-300">Messages ({messages.length})</Label>
        <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
          {messages.map((msg, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-xs text-gray-500 w-16">{msg.from === 'person1' ? 'You' : 'Other'}:</span>
              <Input
                value={msg.text}
                onChange={(e) => {
                  const newMessages = [...messages];
                  newMessages[i] = { ...newMessages[i], text: e.target.value };
                  updateBlock(index, { messages: newMessages });
                }}
                className="bg-gray-800 border-gray-700 text-white flex-1 text-sm"
              />
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2"
          onClick={() => updateBlock(index, { messages: [...messages, { from: 'person1', text: 'New message' }] })}
        >
          + Add Message
        </Button>
      </div>
    </div>
  );
}

function MotivationalProperties({ block, index }: PropertyProps) {
  const { updateBlock } = useEditorStore();
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-gray-300">Image URL</Label>
        <Input
          value={(block.imageSrc as string) || ''}
          onChange={(e) => updateBlock(index, { imageSrc: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>
      <div>
        <Label className="text-gray-300">Text</Label>
        <Textarea
          value={(block.text as string) || ''}
          onChange={(e) => updateBlock(index, { text: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white min-h-[60px]"
        />
      </div>
      <div>
        <Label className="text-gray-300">Text Style</Label>
        <Select
          value={(block.textStyle as string) || 'default'}
          onValueChange={(v) => updateBlock(index, { textStyle: v })}
        >
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="quote">Quote</SelectItem>
            <SelectItem value="typing">Typing</SelectItem>
            <SelectItem value="words">Words</SelectItem>
            <SelectItem value="glow">Glow</SelectItem>
            <SelectItem value="bold-glow">Bold Glow</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-gray-300">Image Effect</Label>
        <Select
          value={(block.imageEffect as string) || 'fade'}
          onValueChange={(v) => updateBlock(index, { imageEffect: v })}
        >
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="fade">Fade</SelectItem>
            <SelectItem value="ken-burns">Ken Burns</SelectItem>
            <SelectItem value="zoom-in">Zoom In</SelectItem>
            <SelectItem value="zoom-out">Zoom Out</SelectItem>
            <SelectItem value="blur">Blur</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-gray-300">Font Size</Label>
        <Select
          value={(block.fontSize as string) || 'xlarge'}
          onValueChange={(v) => updateBlock(index, { fontSize: v })}
        >
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
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
        <Label className="text-gray-300">Duration (seconds)</Label>
        <Input
          type="number"
          value={(block.duration as number) || 6}
          onChange={(e) => updateBlock(index, { duration: parseInt(e.target.value) || 6 })}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>
      <div>
        <Label className="text-gray-300">Audio URL (optional)</Label>
        <Input
          value={(block.audioSrc as string) || ''}
          onChange={(e) => updateBlock(index, { audioSrc: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
          placeholder="https://..."
        />
      </div>
    </div>
  );
}

function ChartProperties({ block, index }: PropertyProps) {
  const { updateBlock } = useEditorStore();
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-gray-300">Title</Label>
        <Input
          value={(block.title as string) || ''}
          onChange={(e) => updateBlock(index, { title: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>
      <p className="text-xs text-gray-500">
        Edit chart data in JSON mode for full customization
      </p>
    </div>
  );
}
