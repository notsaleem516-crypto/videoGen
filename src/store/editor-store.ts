import { create } from 'zustand';
import { ContentBlock, VideoMeta, VideoInput, AudioTrack, BlockCustomization } from '@/lib/video/schemas';

// Default customization values for all blocks
// Only set values that should override the BaseScene defaults
const DEFAULT_CUSTOMIZATION: Partial<BlockCustomization> = {
  enterAnimation: 'fade',
  exitAnimation: 'fade',
  animationDuration: 0.5,
  backgroundBlur: 0,
  borderWidth: 0,
  borderRadius: 0,
  shadowEnabled: false,
  shadowColor: 'rgba(0,0,0,0.5)',
  shadowBlur: 20,
  // Don't set padding - let BaseScene use its default of 60
  // padding: 20,  // Removed - this was causing blocks to appear at top
  margin: 0,
};

// Block templates for adding new blocks
export const BLOCK_TEMPLATES: Record<string, Partial<ContentBlock>> = {
  stat: {
    type: 'stat',
    heading: 'New Stat',
    value: '100%',
    subtext: 'Description here',
  } as ContentBlock,
  comparison: {
    type: 'comparison',
    title: 'Comparison',
    items: [
      { label: 'Item A', value: 50, color: '#3B82F6' },
      { label: 'Item B', value: 30, color: '#10B981' },
    ],
  } as ContentBlock,
  text: {
    type: 'text',
    content: 'Enter your text here',
    emphasis: 'medium',
  } as ContentBlock,
  image: {
    type: 'image',
    src: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
    alt: 'Image',
    caption: '',
  } as ContentBlock,
  quote: {
    type: 'quote',
    text: 'Enter your quote here',
    author: 'Author Name',
  } as ContentBlock,
  list: {
    type: 'list',
    title: 'List Title',
    items: ['Item 1', 'Item 2', 'Item 3'],
    style: 'bullet',
  } as ContentBlock,
  timeline: {
    type: 'timeline',
    title: 'Timeline',
    events: [
      { year: '2020', title: 'Event 1', description: '' },
      { year: '2022', title: 'Event 2', description: '' },
    ],
  } as ContentBlock,
  callout: {
    type: 'callout',
    title: 'Callout',
    content: 'Important information',
    variant: 'default',
  } as ContentBlock,
  'icon-list': {
    type: 'icon-list',
    title: 'Features',
    items: [
      { icon: '🚀', title: 'Feature 1', description: '' },
      { icon: '⭐', title: 'Feature 2', description: '' },
    ],
  } as ContentBlock,
  'line-chart': {
    type: 'line-chart',
    title: 'Chart',
    data: [10, 25, 40, 60, 80],
    labels: ['A', 'B', 'C', 'D', 'E'],
    lineColor: '#3B82F6',
  } as ContentBlock,
  'pie-chart': {
    type: 'pie-chart',
    title: 'Pie Chart',
    segments: [
      { label: 'Segment A', value: 40, color: '#3B82F6' },
      { label: 'Segment B', value: 35, color: '#10B981' },
      { label: 'Segment C', value: 25, color: '#F59E0B' },
    ],
  } as ContentBlock,
  code: {
    type: 'code',
    code: '// Your code here\nconsole.log("Hello World");',
    language: 'javascript',
    title: 'Code Example',
  } as ContentBlock,
  testimonial: {
    type: 'testimonial',
    quote: 'Customer testimonial here',
    author: 'Customer Name',
    role: 'Role',
    company: 'Company',
  } as ContentBlock,
  'whatsapp-chat': {
    type: 'whatsapp-chat',
    person1: { name: 'You', isOnline: true },
    person2: { name: 'Contact', isOnline: true },
    messages: [
      { from: 'person2', text: 'Hello!' },
      { from: 'person1', text: 'Hi there!' },
    ],
    showTypingIndicator: true,
  } as ContentBlock,
  'motivational-image': {
    type: 'motivational-image',
    imageSrc: 'https://images.unsplash.com/photo-1504805572947-34fad45aed93?w=800',
    imageEffect: 'ken-burns',
    text: 'Your motivational text',
    textStyle: 'default',
    fontSize: 'xlarge',
    fontWeight: 'bold',
    textColor: '#FFFFFF',
    textAlign: 'center',
    textPosition: 'center',
    colorOverlay: { enabled: true, color: '#000000', opacity: 0.4 },
    duration: 6,
  } as ContentBlock,
  // New block templates
  counter: {
    type: 'counter',
    label: 'Downloads',
    from: 0,
    to: 10000,
    duration: 3,
    suffix: '+',
    color: '#3B82F6',
    animationStyle: 'easeOut',
  } as ContentBlock,
  'progress-bar': {
    type: 'progress-bar',
    label: 'Progress',
    value: 75,
    color: '#10B981',
    backgroundColor: '#1F2937',
    height: 'medium',
    showPercentage: true,
    animated: true,
    stripes: false,
  } as ContentBlock,
  'qr-code': {
    type: 'qr-code',
    data: 'https://example.com',
    title: 'Scan Me',
    subtitle: 'Visit our website',
    size: 'medium',
    fgColor: '#000000',
    bgColor: '#FFFFFF',
  } as ContentBlock,
  video: {
    type: 'video',
    src: 'https://www.w3schools.com/html/mov_bbb.mp4',
    autoPlay: true,
    loop: false,
    muted: true,
    controls: false,
  } as ContentBlock,
  'avatar-grid': {
    type: 'avatar-grid',
    title: 'Our Team',
    subtitle: 'Meet the amazing people behind our success',
    avatars: [
      { name: 'John Doe', role: 'CEO', image: '' },
      { name: 'Jane Smith', role: 'CTO', image: '' },
      { name: 'Bob Wilson', role: 'Designer', image: '' },
    ],
    layout: 'grid',
    columns: 3,
  } as ContentBlock,
  'social-stats': {
    type: 'social-stats',
    platform: 'twitter',
    username: '@username',
    followers: 50000,
    posts: 1250,
    verified: true,
    showGrowth: true,
    growthPercentage: 15.5,
  } as ContentBlock,
  cta: {
    type: 'cta',
    text: 'Get Started Now',
    description: 'Join thousands of satisfied users',
    buttonStyle: 'primary',
    color: '#3B82F6',
    size: 'large',
    pulse: true,
  } as ContentBlock,
  'gradient-text': {
    type: 'gradient-text',
    text: 'Make It Happen',
    gradient: ['#3B82F6', '#8B5CF6', '#EC4899'],
    angle: 45,
    animate: true,
    animationSpeed: 3,
    fontSize: 'xxlarge',
    fontWeight: 'bold',
  } as ContentBlock,
  'animated-bg': {
    type: 'animated-bg',
    style: 'particles',
    primaryColor: '#3B82F6',
    secondaryColor: '#8B5CF6',
    speed: 1,
    intensity: 0.5,
    overlay: false,
  } as ContentBlock,
  countdown: {
    type: 'countdown',
    title: 'Limited Time Offer',
    days: 3,
    hours: 12,
    minutes: 30,
    seconds: 0,
    style: 'modern',
    color: '#FFFFFF',
    showLabels: true,
  } as ContentBlock,
  'tower-3d': {
    type: 'tower-3d',
    title: 'Top 20 Video Games',
    categoryLabel: 'All-Time Sales',
    valueLabel: 'million copies',
    environmentPreset: 'studio',
    pauseMs: 250,
    travelMs: 700,
    towerWidth: 2,
    towerDepth: 2,
    minHeight: 1.2,
    maxHeight: 8.5,
    laneSpacing: 4.5,
    laneCurve: 1.35,
    cameraAngleDeg: 46,
    cameraDistance: 20,
    cameraHeight: 12,
    items: [
      { rank: 1, name: 'Minecraft', value: 300, color: '#22C55E' },
      { rank: 2, name: 'GTA V', value: 200, color: '#F59E0B' },
      { rank: 3, name: 'Wii Sports', value: 83, color: '#3B82F6' },
      { rank: 4, name: 'PUBG', value: 75, color: '#0EA5E9' },
      { rank: 5, name: 'Mario Kart 8', value: 70, color: '#A855F7' },
      { rank: 6, name: 'Red Dead Redemption 2', value: 67, color: '#EF4444' },
      { rank: 7, name: 'Overwatch', value: 60, color: '#F97316' },
      { rank: 8, name: 'Terraria', value: 58, color: '#84CC16' },
      { rank: 9, name: 'Wii Fit', value: 56, color: '#14B8A6' },
      { rank: 10, name: 'Pokemon Red/Blue', value: 47, color: '#06B6D4' },
      { rank: 11, name: 'Tetris (EA)', value: 45, color: '#8B5CF6' },
      { rank: 12, name: 'Pac-Man', value: 42, color: '#EAB308' },
      { rank: 13, name: 'Mario Kart Wii', value: 38, color: '#22D3EE' },
      { rank: 14, name: 'Animal Crossing', value: 43, color: '#10B981' },
      { rank: 15, name: 'The Witcher 3', value: 50, color: '#6366F1' },
      { rank: 16, name: 'Super Smash Bros. Ultimate', value: 35, color: '#FB7185' },
      { rank: 17, name: 'Elden Ring', value: 28, color: '#F43F5E' },
      { rank: 18, name: 'The Last of Us', value: 37, color: '#2DD4BF' },
      { rank: 19, name: 'Cyberpunk 2077', value: 30, color: '#E879F9' },
      { rank: 20, name: 'Skyrim', value: 60, color: '#38BDF8' },
    ],
    duration: 9,
  } as ContentBlock,
};

// History for undo/redo
interface HistoryState {
  past: VideoInput[];
  present: VideoInput;
  future: VideoInput[];
}

interface EditorStore {
  // Current video state
  videoInput: VideoInput;
  
  // UI state
  selectedBlockIndex: number | null;
  isPlaying: boolean;
  currentTime: number;
  
  // History for undo/redo
  history: HistoryState;
  
  // Actions
  setVideoInput: (input: VideoInput) => void;
  updateVideoMeta: (meta: Partial<VideoMeta>) => void;
  addBlock: (type: string) => void;
  updateBlock: (index: number, block: Partial<ContentBlock>) => void;
  removeBlock: (index: number) => void;
  duplicateBlock: (index: number) => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;
  selectBlock: (index: number | null) => void;
  
  // Audio Track actions
  addAudioTrack: (track: Omit<AudioTrack, 'id'>) => void;
  updateAudioTrack: (trackId: string, track: Partial<AudioTrack>) => void;
  removeAudioTrack: (trackId: string) => void;
  moveAudioTrack: (fromIndex: number, toIndex: number) => void;
  
  // Playback
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Export
  getVideoJson: () => string;
  exportVideo: () => Promise<Blob | null>;
}

const defaultVideoMeta: VideoMeta = {
  aspectRatio: '9:16',
  theme: 'dark_modern',
  fps: 30,
  audioTracks: [],
};

const defaultVideoInput: VideoInput = {
  videoMeta: defaultVideoMeta,
  contentBlocks: [],
};

// Helper to create history snapshot
const createSnapshot = (videoInput: VideoInput): VideoInput => {
  return JSON.parse(JSON.stringify(videoInput));
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  // Initial state
  videoInput: defaultVideoInput,
  selectedBlockIndex: null,
  isPlaying: false,
  currentTime: 0,
  history: {
    past: [],
    present: defaultVideoInput,
    future: [],
  },
  
  // Set entire video input
  setVideoInput: (input) => {
    const currentPresent = get().history.present;
    set({
      videoInput: input,
      history: {
        past: [...get().history.past, currentPresent].slice(-50),
        present: createSnapshot(input),
        future: [],
      },
    });
  },
  
  // Update video meta
  updateVideoMeta: (meta) => {
    const currentPresent = get().history.present;
    const newInput = {
      ...get().videoInput,
      videoMeta: { ...get().videoInput.videoMeta, ...meta },
    };
    set({
      videoInput: newInput,
      history: {
        past: [...get().history.past, currentPresent].slice(-50),
        present: createSnapshot(newInput),
        future: [],
      },
    });
  },
  
  // Add a new block
  addBlock: (type) => {
    const template = BLOCK_TEMPLATES[type];
    if (!template) return;
    
    const currentPresent = get().history.present;
    // Merge template with default customization values
    const newBlock = { 
      ...DEFAULT_CUSTOMIZATION,
      ...template 
    } as ContentBlock;
    const newInput = {
      ...get().videoInput,
      contentBlocks: [...get().videoInput.contentBlocks, newBlock],
    };
    
    set({
      videoInput: newInput,
      selectedBlockIndex: newInput.contentBlocks.length - 1,
      history: {
        past: [...get().history.past, currentPresent].slice(-50),
        present: createSnapshot(newInput),
        future: [],
      },
    });
  },
  
  // Update a block
  updateBlock: (index, blockUpdate) => {
    const blocks = get().videoInput.contentBlocks;
    if (index < 0 || index >= blocks.length) return;
    
    const currentPresent = get().history.present;
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], ...blockUpdate } as ContentBlock;
    
    const newInput = {
      ...get().videoInput,
      contentBlocks: newBlocks,
    };
    
    set({
      videoInput: newInput,
      history: {
        past: [...get().history.past, currentPresent].slice(-50),
        present: createSnapshot(newInput),
        future: [],
      },
    });
  },
  
  // Remove a block
  removeBlock: (index) => {
    const blocks = get().videoInput.contentBlocks;
    if (index < 0 || index >= blocks.length) return;
    
    const currentPresent = get().history.present;
    const newBlocks = blocks.filter((_, i) => i !== index);
    
    const newInput = {
      ...get().videoInput,
      contentBlocks: newBlocks,
    };
    
    set({
      videoInput: newInput,
      selectedBlockIndex: null,
      history: {
        past: [...get().history.past, currentPresent].slice(-50),
        present: createSnapshot(newInput),
        future: [],
      },
    });
  },
  
  // Duplicate a block
  duplicateBlock: (index) => {
    const blocks = get().videoInput.contentBlocks;
    if (index < 0 || index >= blocks.length) return;
    
    const currentPresent = get().history.present;
    const blockToCopy = JSON.parse(JSON.stringify(blocks[index]));
    const newBlocks = [...blocks, blockToCopy];
    
    const newInput = {
      ...get().videoInput,
      contentBlocks: newBlocks,
    };
    
    set({
      videoInput: newInput,
      selectedBlockIndex: newBlocks.length - 1,
      history: {
        past: [...get().history.past, currentPresent].slice(-50),
        present: createSnapshot(newInput),
        future: [],
      },
    });
  },
  
  // Move a block
  moveBlock: (fromIndex, toIndex) => {
    const blocks = get().videoInput.contentBlocks;
    if (fromIndex < 0 || fromIndex >= blocks.length) return;
    if (toIndex < 0 || toIndex >= blocks.length) return;
    
    const currentPresent = get().history.present;
    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex, 0, movedBlock);
    
    const newInput = {
      ...get().videoInput,
      contentBlocks: newBlocks,
    };
    
    set({
      videoInput: newInput,
      history: {
        past: [...get().history.past, currentPresent].slice(-50),
        present: createSnapshot(newInput),
        future: [],
      },
    });
  },
  
  // Select a block
  selectBlock: (index) => {
    set({ selectedBlockIndex: index });
  },
  
  // Audio Track actions
  addAudioTrack: (track) => {
    const currentPresent = get().history.present;
    const newTrack: AudioTrack = {
      ...track,
      id: `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    
    const currentTracks = get().videoInput.videoMeta.audioTracks || [];
    const newInput = {
      ...get().videoInput,
      videoMeta: {
        ...get().videoInput.videoMeta,
        audioTracks: [...currentTracks, newTrack],
      },
    };
    
    set({
      videoInput: newInput,
      history: {
        past: [...get().history.past, currentPresent].slice(-50),
        present: createSnapshot(newInput),
        future: [],
      },
    });
  },
  
  updateAudioTrack: (trackId, trackUpdate) => {
    const currentTracks = get().videoInput.videoMeta.audioTracks || [];
    const trackIndex = currentTracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;
    
    const currentPresent = get().history.present;
    const newTracks = [...currentTracks];
    newTracks[trackIndex] = { ...newTracks[trackIndex], ...trackUpdate };
    
    const newInput = {
      ...get().videoInput,
      videoMeta: {
        ...get().videoInput.videoMeta,
        audioTracks: newTracks,
      },
    };
    
    set({
      videoInput: newInput,
      history: {
        past: [...get().history.past, currentPresent].slice(-50),
        present: createSnapshot(newInput),
        future: [],
      },
    });
  },
  
  removeAudioTrack: (trackId) => {
    const currentTracks = get().videoInput.videoMeta.audioTracks || [];
    const trackIndex = currentTracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;
    
    const currentPresent = get().history.present;
    const newTracks = currentTracks.filter(t => t.id !== trackId);
    
    const newInput = {
      ...get().videoInput,
      videoMeta: {
        ...get().videoInput.videoMeta,
        audioTracks: newTracks,
      },
    };
    
    set({
      videoInput: newInput,
      history: {
        past: [...get().history.past, currentPresent].slice(-50),
        present: createSnapshot(newInput),
        future: [],
      },
    });
  },
  
  moveAudioTrack: (fromIndex, toIndex) => {
    const currentTracks = get().videoInput.videoMeta.audioTracks || [];
    if (fromIndex < 0 || fromIndex >= currentTracks.length) return;
    if (toIndex < 0 || toIndex >= currentTracks.length) return;
    
    const currentPresent = get().history.present;
    const newTracks = [...currentTracks];
    const [movedTrack] = newTracks.splice(fromIndex, 1);
    newTracks.splice(toIndex, 0, movedTrack);
    
    const newInput = {
      ...get().videoInput,
      videoMeta: {
        ...get().videoInput.videoMeta,
        audioTracks: newTracks,
      },
    };
    
    set({
      videoInput: newInput,
      history: {
        past: [...get().history.past, currentPresent].slice(-50),
        present: createSnapshot(newInput),
        future: [],
      },
    });
  },
  
  // Playback controls
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: time }),
  
  // Undo
  undo: () => {
    const { past, present, future } = get().history;
    if (past.length === 0) return;
    
    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);
    
    set({
      videoInput: previous,
      history: {
        past: newPast,
        present: previous,
        future: [present, ...future],
      },
    });
  },
  
  // Redo
  redo: () => {
    const { past, present, future } = get().history;
    if (future.length === 0) return;
    
    const next = future[0];
    const newFuture = future.slice(1);
    
    set({
      videoInput: next,
      history: {
        past: [...past, present],
        present: next,
        future: newFuture,
      },
    });
  },
  
  // Check if can undo
  canUndo: () => get().history.past.length > 0,
  
  // Check if can redo
  canRedo: () => get().history.future.length > 0,
  
  // Get video JSON
  getVideoJson: () => {
    return JSON.stringify(get().videoInput, null, 2);
  },
  
  // Export video
  exportVideo: async () => {
    try {
      const response = await fetch('/api/render?XTransformPort=3031', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(get().videoInput),
      });
      
      if (!response.ok) {
        throw new Error('Render failed');
      }
      
      return await response.blob();
    } catch (error) {
      console.error('Export failed:', error);
      return null;
    }
  },
}));
