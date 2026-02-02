
# Code Redundancy Cleanup Plan

## Overview

After analyzing the codebase, I found significant code duplication across multiple components. This plan consolidates these duplicated patterns into shared utilities and hooks, improving maintainability and reducing bundle size.

## Identified Redundancies

### 1. Utility Functions Duplicated Across Files

**`getInitials(name)` - Duplicated in 5 files:**
- `MemoryContributions.tsx`
- `VoicePromptsView.tsx`
- `SendVoicePrompt.tsx`
- `CircleActivityFeed.tsx`
- `InboxView.tsx`

**`getCleanTitle(title)` - Duplicated in 4 files:**
- `MemoryLibrary.tsx`
- `CircleActivityFeed.tsx`
- `InboxView.tsx`
- `SharedMemoriesView.tsx`

**`formatTime(seconds)` - Duplicated in 3 files:**
- `RecordingInterface.tsx`
- `StoryRecordingInterface.tsx`
- `AudioPlayer.tsx`

**`textSizeClasses` object - Duplicated in 9 files:**
- `RecordingInterface.tsx`
- `StoryRecordingInterface.tsx`
- `ConversationRecordingInterface.tsx`
- `WritingInterface.tsx`
- `StoryWritingInterface.tsx`
- `ConversationWritingInterface.tsx`
- `FinalSaveScreen.tsx`
- `StoryFinalSaveScreen.tsx`

### 2. Audio Recording Logic Duplicated

**`startAudioRecording()` and `stopAudioRecording()` - Duplicated in 3 files:**
- `RecordingInterface.tsx`
- `StoryRecordingInterface.tsx`
- `ConversationRecordingInterface.tsx`

These components share nearly identical code for:
- Requesting microphone access
- Creating MediaRecorder
- Managing audio chunks
- Stopping and cleaning up streams

### 3. Profile Fetching Pattern Duplicated

Multiple components independently fetch user profiles with the same pattern:
- `VoicePromptsView.tsx`
- `InboxView.tsx`
- `CircleActivityFeed.tsx`
- `MemoryContributions.tsx`
- `SharedMemoriesView.tsx`

### 4. VoicePromptsView is Now Redundant

The `VoicePromptsView.tsx` component displays the exact same data as the "Received Prompts" section in `InboxView.tsx`. With the new Inbox tab in Shared Libraries, this standalone view is no longer needed.

## Solution: Create Shared Utilities

### File Changes

**1. Update `src/lib/utils.ts` - Add shared utility functions:**
```typescript
// Existing cn function...

// Get initials from a name for avatar fallbacks
export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

// Remove bracketed suffixes from memory titles (e.g., "[Recording]")
export function getCleanTitle(title: string): string {
  return title.replace(/\s*\[[^\]]+\]$/, "");
}

// Format seconds as MM:SS for timers and audio players
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// Text size CSS class mappings
export const TEXT_SIZE_CLASSES = {
  small: "text-base",
  medium: "text-lg",
  large: "text-xl",
} as const;

export type TextSize = keyof typeof TEXT_SIZE_CLASSES;

export function getTextSizeClass(size: TextSize): string {
  return TEXT_SIZE_CLASSES[size];
}
```

**2. Create `src/hooks/useAudioRecorder.ts` - Shared audio recording hook:**
```typescript
// Encapsulates all audio recording logic:
// - startRecording()
// - stopRecording()
// - pauseRecording()
// - resumeRecording()
// - audioChunks
// - isRecording state
// - Automatic cleanup on unmount
```

**3. Update components to use shared utilities:**

Remove local implementations and import from utils:

- `MemoryContributions.tsx` - Use `getInitials` from utils
- `VoicePromptsView.tsx` - Use `getInitials` from utils
- `SendVoicePrompt.tsx` - Use `getInitials` from utils
- `CircleActivityFeed.tsx` - Use `getInitials`, `getCleanTitle` from utils
- `InboxView.tsx` - Use `getInitials`, `getCleanTitle` from utils
- `MemoryLibrary.tsx` - Use `getCleanTitle` from utils
- `SharedMemoriesView.tsx` - Use `getCleanTitle` from utils
- `RecordingInterface.tsx` - Use `formatTime`, `TEXT_SIZE_CLASSES`, `useAudioRecorder`
- `StoryRecordingInterface.tsx` - Use `formatTime`, `TEXT_SIZE_CLASSES`, `useAudioRecorder`
- `ConversationRecordingInterface.tsx` - Use `TEXT_SIZE_CLASSES`, `useAudioRecorder`
- `AudioPlayer.tsx` - Use `formatTime` from utils
- `WritingInterface.tsx` - Use `TEXT_SIZE_CLASSES`
- `StoryWritingInterface.tsx` - Use `TEXT_SIZE_CLASSES`
- `ConversationWritingInterface.tsx` - Use `TEXT_SIZE_CLASSES`
- `FinalSaveScreen.tsx` - Use `TEXT_SIZE_CLASSES`
- `StoryFinalSaveScreen.tsx` - Use `TEXT_SIZE_CLASSES`

**4. Remove `VoicePromptsView.tsx` and update references:**

This component is now redundant since the Inbox tab provides the same functionality. Update:
- `src/pages/Index.tsx` - Remove VoicePromptsView import and usage
- Update notification click handler to navigate to Inbox instead

## Summary of Changes

| Action | Files |
|--------|-------|
| Modify | `src/lib/utils.ts` (add utilities) |
| Create | `src/hooks/useAudioRecorder.ts` |
| Modify | 15 components (remove local implementations) |
| Delete | `src/components/VoicePromptsView.tsx` |
| Modify | `src/pages/Index.tsx` (remove VoicePromptsView) |

## Benefits

1. **Reduced code duplication** - ~200 lines of duplicated code consolidated
2. **Single source of truth** - Changes to utilities only need to happen in one place
3. **Smaller bundle size** - Less code to download
4. **Easier testing** - Utility functions can be unit tested once
5. **Consistent behavior** - All components use the same implementation
