'use client'

import { useMemo, useState } from 'react'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, Trash2, Download, Sparkles } from 'lucide-react'

import type { ContentBlock, VideoInput } from '@/lib/video/schemas'


type BlockType = ContentBlock['type']

type EditableBlock = ContentBlock & { id: string }

const BLOCK_OPTIONS: { type: BlockType; label: string }[] = [
  { type: 'text', label: 'Text' },
  { type: 'stat', label: 'Stat' },
  { type: 'quote', label: 'Quote' },
  { type: 'list', label: 'List' },
  { type: 'comparison', label: 'Comparison' },
  { type: 'timeline', label: 'Timeline' },
  { type: 'callout', label: 'Callout' },
  { type: 'icon-list', label: 'Icon List' },
  { type: 'line-chart', label: 'Line Chart' },
  { type: 'pie-chart', label: 'Pie Chart' },
  { type: 'code', label: 'Code' },
  { type: 'testimonial', label: 'Testimonial' },
  { type: 'whatsapp-chat', label: 'WhatsApp Chat' },
  { type: 'motivational-image', label: 'Motivational Image' },
  { type: 'image', label: 'Image' },
]

const createBlock = (type: BlockType): EditableBlock => {
  const id = crypto.randomUUID()

  const baseBlocks: Record<BlockType, EditableBlock> = {
    text: { id, type, content: 'Add your message here', emphasis: 'medium' },
    stat: { id, type, heading: 'Monthly Growth', value: '128%', subtext: 'Compared to last month' },
    quote: { id, type, text: 'Great design creates trust instantly.', author: 'Your Customer' },
    list: { id, type, title: 'Top Features', items: ['Fast export', 'AI planning', 'Reusable blocks'], style: 'checkmarks' },
    comparison: {
      id,
      type,
      title: 'Before vs After',
      items: [
        { label: 'Before', value: 20, color: '#ef4444' },
        { label: 'After', value: 88, color: '#22c55e' },
      ],
    },
    timeline: {
      id,
      type,
      title: 'Roadmap',
      events: [
        { year: 'Q1', title: 'Research' },
        { year: 'Q2', title: 'Build' },
      ],
    },
    callout: { id, type, title: 'Pro tip', content: 'Use short scenes for stronger retention.', variant: 'info' },
    'icon-list': {
      id,
      type,
      title: 'Highlights',
      items: [
        { icon: 'Rocket', title: 'Fast setup', description: 'Start in minutes' },
        { icon: 'Shield', title: 'Safe', description: 'Engine stays unchanged' },
      ],
    },
    'line-chart': { id, type, title: 'Audience growth', data: [18, 28, 40, 54], labels: ['W1', 'W2', 'W3', 'W4'] },
    'pie-chart': {
      id,
      type,
      title: 'Traffic split',
      segments: [
        { label: 'Organic', value: 60, color: '#3b82f6' },
        { label: 'Paid', value: 40, color: '#a855f7' },
      ],
    },
    code: { id, type, title: 'Code snippet', language: 'javascript', code: 'console.log("Hello video");' },
    testimonial: { id, type, quote: 'This editor is exactly what we needed.', author: 'Alex', role: 'Founder', company: 'Acme' },
    'whatsapp-chat': {
      id,
      type,
      title: 'Client Chat',
      person1: { name: 'You', isOnline: true },
      person2: { name: 'Client', isOnline: true },
      messages: [
        { from: 'person2', text: 'Can we get this done today?', time: '10:32 AM' },
        { from: 'person1', text: 'Yes, sharing first draft in 30 mins.', time: '10:33 AM' },
      ],
      showTypingIndicator: true,
    },
    'motivational-image': {
      id,
      type,
      imageSrc: 'https://images.unsplash.com/photo-1483721310020-03333e577078?w=1200',
      text: 'Consistency compounds.',
      textStyle: 'bold-glow',
      imageEffect: 'ken-burns',
      fontSize: 'xlarge',
      textPosition: 'center',
      imageFit: 'cover',
      imagePosition: 'center',
      backgroundColor: '#000000',
      imageEffectDuration: 1.5,
      textColor: '#FFFFFF',
      fontWeight: 'bold',
      textAlign: 'center',
      textAnimationDelay: 0.3,
      audioVolume: 0.7,
    },
    image: {
      id,
      type,
      src: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200',
      alt: 'Team collaborating',
      caption: 'Keep the visuals dynamic',
    },
  }

  return baseBlocks[type]
}

function SortableBlock({
  block,
  selected,
  onSelect,
  onDelete,
}: {
  block: EditableBlock
  selected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-lg border p-3 ${selected ? 'border-blue-500 bg-blue-500/5' : 'border-neutral-800 bg-neutral-900'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onSelect} className="flex flex-1 items-center gap-2 text-left">
          <span className="rounded bg-neutral-800 px-2 py-1 text-xs uppercase tracking-wide text-neutral-300">{block.type}</span>
        </button>
        <button type="button" {...attributes} {...listeners} className="rounded p-1 text-neutral-400 hover:bg-neutral-800">
          <GripVertical size={16} />
        </button>
        <button type="button" onClick={onDelete} className="rounded p-1 text-red-400 hover:bg-red-500/10">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}

const blockField = (block: EditableBlock, key: string, value: string): EditableBlock => {
  const clone = { ...block } as EditableBlock & Record<string, unknown>
  clone[key] = value
  return clone as EditableBlock
}

export default function Home() {
  const [blocks, setBlocks] = useState<EditableBlock[]>([createBlock('text'), createBlock('stat')])
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1' | '4:5'>('9:16')
  const [theme, setTheme] = useState<'dark_modern' | 'light_minimal' | 'bold_vibrant' | 'corporate'>('dark_modern')
  const [isRendering, setIsRendering] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const selectedBlock = useMemo(
    () => blocks.find((block) => block.id === selectedBlockId) ?? blocks[0] ?? null,
    [blocks, selectedBlockId],
  )

  const payload: VideoInput = useMemo(
    () => ({
      videoMeta: { aspectRatio, theme, fps: 30 },
      contentBlocks: blocks.map(({ id: _id, ...block }) => block),
    }),
    [aspectRatio, theme, blocks],
  )

  const updateBlock = (nextBlock: EditableBlock) => {
    setBlocks((prev) => prev.map((item) => (item.id === nextBlock.id ? nextBlock : item)))
  }

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setBlocks((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === active.id)
      const newIndex = prev.findIndex((item) => item.id === over.id)
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  const addBlock = (type: BlockType) => {
    const block = createBlock(type)
    setBlocks((prev) => [...prev, block])
    setSelectedBlockId(block.id)
  }

  const deleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((block) => block.id !== id))
    setSelectedBlockId((prev) => (prev === id ? null : prev))
  }

  const downloadPayload = () => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'video-plan.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderVideo = async () => {
    setIsRendering(true)
    try {
      const response = await fetch('/api/video/render-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Render failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'video.mp4'
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
      alert('Rendering failed. Please make sure the renderer service is running.')
    } finally {
      setIsRendering(false)
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 p-6 text-neutral-100">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[280px_1fr_360px]">
        <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Sparkles size={18} /> Scene Blocks
          </div>
          <div className="grid grid-cols-2 gap-2">
            {BLOCK_OPTIONS.map((option) => (
              <button
                key={option.type}
                type="button"
                className="rounded-md border border-neutral-700 px-2 py-1 text-xs hover:bg-neutral-800"
                onClick={() => addBlock(option.type)}
              >
                <Plus size={12} className="mr-1 inline" />
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
                {blocks.map((block) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    selected={selectedBlock?.id === block.id}
                    onSelect={() => setSelectedBlockId(block.id)}
                    onDelete={() => deleteBlock(block.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </section>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <h1 className="text-2xl font-bold">Video Editor UI</h1>
          <p className="mt-1 text-sm text-neutral-400">Drag, reorder, and edit blocks visually. Rendering engine remains exactly the same underneath.</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-sm">
              Aspect Ratio
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as typeof aspectRatio)}
                className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 p-2"
              >
                <option value="9:16">9:16</option>
                <option value="16:9">16:9</option>
                <option value="1:1">1:1</option>
                <option value="4:5">4:5</option>
              </select>
            </label>
            <label className="text-sm">
              Theme
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as typeof theme)}
                className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 p-2"
              >
                <option value="dark_modern">Dark Modern</option>
                <option value="light_minimal">Light Minimal</option>
                <option value="bold_vibrant">Bold Vibrant</option>
                <option value="corporate">Corporate</option>
              </select>
            </label>
          </div>

          <div className="mt-4 rounded-lg border border-neutral-800 bg-black/30 p-3">
            <p className="mb-2 text-sm font-semibold">Live JSON Payload</p>
            <pre className="max-h-[460px] overflow-auto text-xs text-neutral-300">{JSON.stringify(payload, null, 2)}</pre>
          </div>

          <div className="mt-4 flex gap-2">
            <button type="button" onClick={downloadPayload} className="rounded-md border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800">
              <Download size={14} className="mr-1 inline" /> Download JSON
            </button>
            <button
              type="button"
              onClick={renderVideo}
              disabled={isRendering || blocks.length === 0}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
            >
              {isRendering ? 'Rendering...' : 'Render Video'}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="text-lg font-semibold">Block Inspector</h2>
          {selectedBlock ? (
            <div className="mt-3 space-y-3 text-sm">
              <p className="rounded bg-neutral-800 px-2 py-1 text-xs uppercase tracking-wide text-neutral-300">{selectedBlock.type}</p>
              {'content' in selectedBlock && (
                <textarea
                  value={selectedBlock.content}
                  onChange={(e) => updateBlock(blockField(selectedBlock, 'content', e.target.value))}
                  className="min-h-24 w-full rounded-md border border-neutral-700 bg-neutral-950 p-2"
                />
              )}
              {'heading' in selectedBlock && (
                <input
                  value={selectedBlock.heading}
                  onChange={(e) => updateBlock(blockField(selectedBlock, 'heading', e.target.value))}
                  className="w-full rounded-md border border-neutral-700 bg-neutral-950 p-2"
                />
              )}
              {'value' in selectedBlock && typeof selectedBlock.value === 'string' && (
                <input
                  value={selectedBlock.value}
                  onChange={(e) => updateBlock(blockField(selectedBlock, 'value', e.target.value))}
                  className="w-full rounded-md border border-neutral-700 bg-neutral-950 p-2"
                />
              )}
              {'text' in selectedBlock && typeof selectedBlock.text === 'string' && (
                <textarea
                  value={selectedBlock.text}
                  onChange={(e) => updateBlock(blockField(selectedBlock, 'text', e.target.value))}
                  className="min-h-20 w-full rounded-md border border-neutral-700 bg-neutral-950 p-2"
                />
              )}
              {'src' in selectedBlock && (
                <input
                  value={selectedBlock.src}
                  onChange={(e) => updateBlock(blockField(selectedBlock, 'src', e.target.value))}
                  className="w-full rounded-md border border-neutral-700 bg-neutral-950 p-2"
                />
              )}
              {'imageSrc' in selectedBlock && (
                <input
                  value={selectedBlock.imageSrc}
                  onChange={(e) => updateBlock(blockField(selectedBlock, 'imageSrc', e.target.value))}
                  className="w-full rounded-md border border-neutral-700 bg-neutral-950 p-2"
                />
              )}
              {'code' in selectedBlock && (
                <textarea
                  value={selectedBlock.code}
                  onChange={(e) => updateBlock(blockField(selectedBlock, 'code', e.target.value))}
                  className="min-h-36 w-full rounded-md border border-neutral-700 bg-neutral-950 p-2 font-mono"
                />
              )}
              {'quote' in selectedBlock && (
                <textarea
                  value={selectedBlock.quote}
                  onChange={(e) => updateBlock(blockField(selectedBlock, 'quote', e.target.value))}
                  className="min-h-24 w-full rounded-md border border-neutral-700 bg-neutral-950 p-2"
                />
              )}
              {'title' in selectedBlock && (
                <input
                  value={selectedBlock.title ?? ''}
                  onChange={(e) => updateBlock(blockField(selectedBlock, 'title', e.target.value))}
                  className="w-full rounded-md border border-neutral-700 bg-neutral-950 p-2"
                />
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-neutral-400">Select a block to edit its properties.</p>
          )}
        </section>
      </div>
    </main>
  )
}
