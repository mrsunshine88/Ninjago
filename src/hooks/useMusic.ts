"use client";

import { useEffect, useRef } from 'react';
import { Howl } from 'howler';

export function useMusic(isMuted: boolean) {
  const musicRef = useRef<Howl | null>(null);
  const currentPathRef = useRef<string | null>(null);

  const playMusic = (path: string) => {
    if (currentPathRef.current === path) return;

    // Fade out old music
    if (musicRef.current) {
      const oldMusic = musicRef.current;
      oldMusic.fade(oldMusic.volume(), 0, 1000);
      setTimeout(() => oldMusic.stop(), 1000);
    }

    // Load and play new music
    const newMusic = new Howl({
      src: [path],
      loop: true,
      volume: 0,
      autoplay: !isMuted,
      html5: true // Better for large WAV files
    });

    newMusic.play();
    newMusic.fade(0, 0.6, 1000);
    
    musicRef.current = newMusic;
    currentPathRef.current = path;
  };

  useEffect(() => {
    if (musicRef.current) {
      musicRef.current.mute(isMuted);
    }
  }, [isMuted]);

  // Visibility Handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (musicRef.current && musicRef.current.playing()) {
          musicRef.current.pause();
        }
      } else {
        if (musicRef.current && !isMuted) {
          musicRef.current.play();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (musicRef.current) {
        musicRef.current.stop();
      }
    };
  }, [isMuted]);

  return { playMusic };
}
