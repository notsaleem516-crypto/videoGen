/**
 * Remotion Entry Point
 * This file is used by Remotion CLI to discover and bundle compositions
 */

import { registerRoot, Composition } from 'remotion';
import { DynamicVideo } from './src/lib/video/compositions/DynamicVideo';

// Default props for the composition
const defaultProps = {
  input: {
    videoMeta: {
      aspectRatio: '9:16',
      theme: 'dark_modern',
      fps: 30,
      intro: {
        title: 'Video Report',
        subtitle: '',
        duration: 2,
      },
      outro: {
        title: 'Thank You',
        subtitle: 'Follow for more!',
        duration: 2,
      },
    },
    contentBlocks: [
      {
        type: 'whatsapp-chat',
        person1: {
          name: 'You',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
          isOnline: true,
        },
        person2: {
          name: 'Sarah Johnson',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
          isOnline: true,
        },
        messages: [
          { from: 'person2', text: 'Hey! Did you see the new project updates?', time: '10:30 AM' },
          { from: 'person1', text: 'Yes! The results look amazing 🎉', time: '10:31 AM' },
          { from: 'person2', text: 'Revenue is up 400K this quarter!', time: '10:32 AM' },
          { from: 'person1', text: "That's incredible! Great work everyone 💪", time: '10:33 AM' },
          { from: 'person2', text: "Let's celebrate this win! 🚀", time: '10:34 AM' },
        ],
        showTypingIndicator: true,
        lastSeen: 'online',
      },
    ],
  },
  plan: {
    decisions: [
      {
        componentId: 'whatsapp-chat-scene',
        motionProfile: 'subtle',
        duration: 8,
        animation: { enter: 0.5, hold: 7, exit: 0.5 },
      },
    ],
    totalDuration: 12,
    suggestedTransitions: [],
  },
};

// Register the root composition
registerRoot(() => {
  return (
    <Composition
      id="DynamicVideo"
      component={DynamicVideo}
      durationInFrames={360}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={defaultProps}
    />
  );
});
