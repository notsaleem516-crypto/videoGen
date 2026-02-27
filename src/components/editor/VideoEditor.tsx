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
import { motion } from 'framer-motion';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export function VideoEditor() {
  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">
      {/* Top Toolbar */}
      <EditorToolbar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar - Block Library */}
        <BlockLibrarySidebar />
        
        {/* Left Panel - Video Settings */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-56 bg-gradient-to-b from-gray-900 to-gray-950 border-r border-gray-800/50 flex flex-col overflow-hidden flex-shrink-0"
        >
          <div className="p-4 border-b border-gray-800/50 bg-gray-900/50 flex-shrink-0">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-xs">⚙</span>
              Settings
            </h3>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <VideoMetaEditor />
          </ScrollArea>
        </motion.div>
        
        {/* Center - Video Preview */}
        <VideoPreview />
        
        {/* Right Sidebar - Properties Panel */}
        <PropertiesPanel />
      </div>
      
      {/* Bottom - Timeline */}
      <TimelineEditor />
    </div>
  );
}
