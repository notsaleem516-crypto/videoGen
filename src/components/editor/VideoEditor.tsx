'use client';

import {
  BlockLibrarySidebar,
  VideoPreview,
  TimelineEditor,
  PropertiesPanel,
  EditorToolbar,
  VideoMetaEditor,
} from '@/components/editor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ChevronDown, ChevronUp, PanelLeft, PanelRight, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';

export function VideoEditor() {
  useKeyboardShortcuts();

  const [showLibrary, setShowLibrary] = useState(true);
  const [showSettings, setShowSettings] = useState(true);
  const [showProperties, setShowProperties] = useState(true);
  const [showTimeline, setShowTimeline] = useState(true);

  return (
    <div className="h-screen flex flex-col bg-[#05070d] overflow-hidden text-white">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.15),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.13),transparent_32%)]" />
      <EditorToolbar />

      <div className="h-11 border-b border-white/10 bg-gray-900/50 backdrop-blur-xl px-4 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-300 hover:text-white" onClick={() => setShowLibrary((v) => !v)}>
            <PanelLeft className="w-4 h-4 mr-1.5" />
            Library
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-300 hover:text-white" onClick={() => setShowSettings((v) => !v)}>
            <SlidersHorizontal className="w-4 h-4 mr-1.5" />
            Settings
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-300 hover:text-white" onClick={() => setShowProperties((v) => !v)}>
            <PanelRight className="w-4 h-4 mr-1.5" />
            Properties
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-300 hover:text-white" onClick={() => setShowTimeline((v) => !v)}>
          {showTimeline ? <ChevronDown className="w-4 h-4 mr-1.5" /> : <ChevronUp className="w-4 h-4 mr-1.5" />}
          Timeline
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0 z-10">
        <AnimatePresence initial={false}>
          {showLibrary && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden flex-shrink-0"
            >
              <BlockLibrarySidebar />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {showSettings && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '14rem', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-gradient-to-b from-gray-900/95 to-gray-950/95 border-r border-white/10 flex flex-col overflow-hidden flex-shrink-0"
            >
              <div className="p-4 border-b border-white/10 bg-white/[0.02] flex-shrink-0">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-xs">⚙</span>
                  Scene Settings
                </h3>
              </div>
              <ScrollArea className="flex-1 min-h-0">
                <VideoMetaEditor />
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

        <VideoPreview />

        <AnimatePresence initial={false}>
          {showProperties && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden flex-shrink-0"
            >
              <PropertiesPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {showTimeline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: '18rem', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden z-10"
          >
            <TimelineEditor />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
