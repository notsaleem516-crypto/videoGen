'use client';

import { useEditorStore } from '@/store/editor-store';
import { Button } from '@/components/ui/button';
import { Undo2, Redo2, Code, FileJson, Upload, Video, Sparkles, Keyboard, Play, Download, Rocket } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export function EditorToolbar() {
  const { undo, redo, canUndo, canRedo, getVideoJson, setVideoInput, videoInput } = useEditorStore();
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [rendering, setRendering] = useState(false);
  const { shortcuts } = useKeyboardShortcuts();

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importJson);
      setVideoInput(parsed);
      setJsonDialogOpen(false);
      setImportJson('');
    } catch {
      alert('Invalid JSON format');
    }
  };

  const handleExportJson = () => {
    const json = getVideoJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video-project-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRender = async () => {
    setRendering(true);
    try {
      // For now, just export the JSON
      handleExportJson();
    } finally {
      setRendering(false);
    }
  };

  return (
    <div className="h-14 bg-gradient-to-r from-gray-900 via-gray-900 to-gray-950 border-b border-gray-800/50 flex items-center justify-between px-5 flex-shrink-0 backdrop-blur-xl">
      {/* Left side - Logo and title */}
      <div className="flex items-center gap-4">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Video Editor</h1>
            <p className="text-[10px] text-gray-500">Dynamic Video Engine</p>
          </div>
        </motion.div>
        
        <div className="h-6 w-px bg-gray-800" />
        
        <div className="flex items-center gap-1">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white disabled:opacity-30 h-8 w-8 p-0"
              onClick={undo}
              disabled={!canUndo()}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white disabled:opacity-30 h-8 w-8 p-0"
              onClick={redo}
              disabled={!canRedo()}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </div>
      
      {/* Center - Block count */}
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-800/50 border border-gray-700/50">
        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        <span className="text-xs text-gray-300">{videoInput.contentBlocks.length} blocks</span>
      </div>
      
      {/* Right side - Import/Export/Help */}
      <div className="flex items-center gap-2">
        {/* Keyboard Shortcuts */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white h-8">
              <Keyboard className="w-4 h-4 mr-2" />
              Shortcuts
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Keyboard className="w-5 h-5" />
                Keyboard Shortcuts
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {shortcuts.map((shortcut, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <span className="text-gray-300 text-sm">{shortcut.action}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, j) => (
                      <span key={j}>
                        <kbd className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 font-mono">
                          {key}
                        </kbd>
                        {j < shortcut.keys.length - 1 && <span className="text-gray-600 mx-1">+</span>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
        
        <div className="h-6 w-px bg-gray-800" />
        
        {/* Import */}
        <Dialog open={jsonDialogOpen} onOpenChange={setJsonDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white h-8">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-xl max-h-[500px] overflow-scroll">
            <DialogHeader>
              <DialogTitle className="text-white">Import JSON Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder="Paste your JSON here..."
                className="bg-gray-800/50 border-gray-700 text-white min-h-[300px] font-mono text-sm"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setJsonDialogOpen(false)} className="border-gray-700">Cancel</Button>
                <Button onClick={handleImport} className="bg-purple-600 hover:bg-purple-700">Import</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* View JSON */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white h-8">
              <Code className="w-4 h-4 mr-2" />
              JSON
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Video JSON</DialogTitle>
            </DialogHeader>
            <Textarea
              value={getVideoJson()}
              readOnly
              className="bg-gray-800/50 border-gray-700 text-white min-h-[400px] font-mono text-xs"
            />
          </DialogContent>
        </Dialog>
        
        {/* Export JSON */}
        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white h-8" onClick={handleExportJson}>
          <FileJson className="w-4 h-4 mr-2" />
          Export
        </Button>
        
        <div className="h-6 w-px bg-gray-800" />
        
        {/* Render Button */}
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button 
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-9 shadow-lg shadow-purple-500/25"
            onClick={handleRender}
            disabled={rendering || videoInput.contentBlocks.length === 0}
          >
            {rendering ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="mr-2"
                >
                  <Rocket className="w-4 h-4" />
                </motion.div>
                Rendering...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Render Video
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
