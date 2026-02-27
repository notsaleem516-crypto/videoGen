'use client';

import { useState, useCallback } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { AudioTrack } from '@/lib/video/schemas';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Volume2, 
  VolumeX, 
  GripVertical, 
  Music, 
  Clock,
  ChevronDown,
  ChevronUp,
  Play,
  Pause
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';

interface AudioTrackItemProps {
  track: AudioTrack;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onPlayPreview: () => void;
  isPlaying: boolean;
}

function AudioTrackItem({ 
  track, 
  index, 
  isExpanded, 
  onToggleExpand,
  onPlayPreview,
  isPlaying
}: AudioTrackItemProps) {
  const { updateAudioTrack, removeAudioTrack } = useEditorStore();
  
  const handleVolumeChange = useCallback((value: number[]) => {
    updateAudioTrack(track.id, { volume: value[0] / 100 });
  }, [track.id, updateAudioTrack]);
  
  const handleStartTimeChange = useCallback((value: number[]) => {
    updateAudioTrack(track.id, { startTime: value[0] });
  }, [track.id, updateAudioTrack]);
  
  const handleFadeInChange = useCallback((value: number[]) => {
    updateAudioTrack(track.id, { fadeIn: value[0] });
  }, [track.id, updateAudioTrack]);
  
  const handleFadeOutChange = useCallback((value: number[]) => {
    updateAudioTrack(track.id, { fadeOut: value[0] });
  }, [track.id, updateAudioTrack]);
  
  const handleToggleMute = useCallback(() => {
    updateAudioTrack(track.id, { muted: !track.muted });
  }, [track.id, track.muted, updateAudioTrack]);
  
  const handleToggleLoop = useCallback(() => {
    updateAudioTrack(track.id, { loop: !track.loop });
  }, [track.id, track.loop, updateAudioTrack]);
  
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateAudioTrack(track.id, { name: e.target.value });
  }, [track.id, updateAudioTrack]);
  
  const handleSrcChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateAudioTrack(track.id, { src: e.target.value });
  }, [track.id, updateAudioTrack]);
  
  const handleRemove = useCallback(() => {
    removeAudioTrack(track.id);
  }, [track.id, removeAudioTrack]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="border border-gray-700/50 rounded-lg bg-gray-800/40 overflow-hidden"
    >
      {/* Track Header */}
      <div className="flex items-center gap-2 p-3 bg-gray-800/60">
        <GripVertical className="w-4 h-4 text-gray-500 cursor-grab active:cursor-grabbing" />
        
        <button
          onClick={onPlayPreview}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Music className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-white font-medium truncate">{track.name}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {track.muted && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-red-500/50 text-red-400">
              Muted
            </Badge>
          )}
          {track.loop && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-green-500/50 text-green-400">
              Loop
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-gray-600 text-gray-400">
            {Math.round(track.volume * 100)}%
          </Badge>
        </div>
        
        <button
          onClick={handleToggleMute}
          className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
            track.muted 
              ? 'text-red-400 hover:text-red-300' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {track.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        
        <button
          onClick={onToggleExpand}
          className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-white transition-colors"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        <button
          onClick={handleRemove}
          className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      {/* Waveform Placeholder */}
      <div className="h-12 bg-gray-900/50 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center gap-0.5 px-4">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="w-1 rounded-full bg-gradient-to-t from-purple-500/60 to-purple-400/40"
              style={{ 
                height: `${20 + Math.random() * 60}%`,
                animationDelay: `${i * 20}ms`
              }}
            />
          ))}
        </div>
        
        {/* Start Time Indicator */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-green-500"
          style={{ left: `${Math.min(100, (track.startTime / 60) * 100)}%` }}
        >
          <div className="absolute -top-0 left-1/2 -translate-x-1/2 text-[8px] text-green-400 whitespace-nowrap">
            {track.startTime}s
          </div>
        </div>
      </div>
      
      {/* Expanded Controls */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-3 border-t border-gray-700/50">
              {/* Track Name */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400">Track Name</Label>
                <Input 
                  value={track.name}
                  onChange={handleNameChange}
                  className="bg-gray-800/50 border-gray-700/50 text-white h-8 text-xs"
                  placeholder="Track name"
                />
              </div>
              
              {/* Audio URL */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400">Audio URL</Label>
                <Input 
                  value={track.src}
                  onChange={handleSrcChange}
                  className="bg-gray-800/50 border-gray-700/50 text-white h-8 text-xs"
                  placeholder="https://..."
                />
              </div>
              
              {/* Volume */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Label className="text-xs text-gray-400">Volume</Label>
                  <span className="text-xs text-gray-500">{Math.round(track.volume * 100)}%</span>
                </div>
                <Slider 
                  value={[track.volume * 100]} 
                  min={0} 
                  max={100} 
                  step={1} 
                  onValueChange={handleVolumeChange}
                  className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
                />
              </div>
              
              {/* Start Time */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Start Time
                  </Label>
                  <span className="text-xs text-gray-500">{track.startTime}s</span>
                </div>
                <Slider 
                  value={[track.startTime]} 
                  min={0} 
                  max={120} 
                  step={0.5} 
                  onValueChange={handleStartTimeChange}
                  className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
                />
              </div>
              
              {/* Fade Controls */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-xs text-gray-400">Fade In</Label>
                    <span className="text-xs text-gray-500">{track.fadeIn}s</span>
                  </div>
                  <Slider 
                    value={[track.fadeIn]} 
                    min={0} 
                    max={10} 
                    step={0.1} 
                    onValueChange={handleFadeInChange}
                    className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-xs text-gray-400">Fade Out</Label>
                    <span className="text-xs text-gray-500">{track.fadeOut}s</span>
                  </div>
                  <Slider 
                    value={[track.fadeOut]} 
                    min={0} 
                    max={10} 
                    step={0.1} 
                    onValueChange={handleFadeOutChange}
                    className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
                  />
                </div>
              </div>
              
              {/* Loop Toggle */}
              <div className="flex items-center justify-between pt-1">
                <Label className="text-xs text-gray-400">Loop Audio</Label>
                <Switch 
                  checked={track.loop} 
                  onCheckedChange={handleToggleLoop}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function AudioTracksPanel() {
  const { videoInput, addAudioTrack, moveAudioTrack } = useEditorStore();
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(new Set());
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  
  const audioTracks = videoInput.videoMeta.audioTracks || [];
  
  const handleToggleExpand = useCallback((trackId: string) => {
    setExpandedTracks(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  }, []);
  
  const handlePlayPreview = useCallback((track: AudioTrack) => {
    if (playingTrack === track.id && audioElement) {
      audioElement.pause();
      setPlayingTrack(null);
      return;
    }
    
    if (audioElement) {
      audioElement.pause();
    }
    
    const audio = new Audio(track.src);
    audio.volume = track.muted ? 0 : track.volume;
    audio.onended = () => setPlayingTrack(null);
    audio.onerror = () => {
      console.error('Failed to load audio');
      setPlayingTrack(null);
    };
    audio.play().catch(() => {
      console.error('Failed to play audio');
      setPlayingTrack(null);
    });
    
    setAudioElement(audio);
    setPlayingTrack(track.id);
  }, [playingTrack, audioElement]);
  
  const handleAddTrack = useCallback(() => {
    addAudioTrack({
      name: `Audio Track ${audioTracks.length + 1}`,
      src: '',
      volume: 0.7,
      startTime: 0,
      fadeIn: 0,
      fadeOut: 0,
      loop: true,
      muted: false,
    });
  }, [addAudioTrack, audioTracks.length]);
  
  const handleReorder = useCallback((newOrder: AudioTrack[]) => {
    const currentTracks = audioTracks;
    
    // Find the move
    for (let i = 0; i < newOrder.length; i++) {
      if (newOrder[i].id !== currentTracks[i].id) {
        const fromIndex = currentTracks.findIndex(t => t.id === newOrder[i].id);
        moveAudioTrack(fromIndex, i);
        break;
      }
    }
  }, [audioTracks, moveAudioTrack]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="text-xs text-gray-400 font-medium">
          Audio Tracks ({audioTracks.length})
        </Label>
        <Button
          size="sm"
          variant="outline"
          onClick={handleAddTrack}
          className="h-7 text-xs border-gray-700 hover:border-purple-500 hover:text-purple-400"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Track
        </Button>
      </div>
      
      {/* Track List */}
      {audioTracks.length === 0 ? (
        <div className="border border-dashed border-gray-700 rounded-lg p-6 text-center">
          <Music className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No audio tracks added</p>
          <p className="text-xs text-gray-600 mt-1">
            Click &quot;Add Track&quot; to add background music or sound effects
          </p>
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={audioTracks}
          onReorder={handleReorder}
          className="space-y-2"
        >
          <AnimatePresence>
            {audioTracks.map((track, index) => (
              <Reorder.Item
                key={track.id}
                value={track}
                className="list-none"
              >
                <AudioTrackItem
                  track={track}
                  index={index}
                  isExpanded={expandedTracks.has(track.id)}
                  onToggleExpand={() => handleToggleExpand(track.id)}
                  onPlayPreview={() => handlePlayPreview(track)}
                  isPlaying={playingTrack === track.id}
                />
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}
      
      {/* Help Text */}
      <div className="text-[10px] text-gray-600 space-y-0.5">
        <p>Drag tracks to reorder. Click to expand for detailed controls.</p>
        <p>Supported formats: MP3, WAV, OGG, AAC</p>
      </div>
    </div>
  );
}
