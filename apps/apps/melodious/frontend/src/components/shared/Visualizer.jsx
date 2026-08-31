import React, { useRef, useEffect, use } from 'react';
import AudioMotionAnalyzer from 'audiomotion-analyzer';
import { PlayerContext } from '../../contexts/PlayerContext';

const Visualizer = () => {
    const { audioRef, currentSong } = use(PlayerContext);
    const containerRef = useRef(null);
    const analyzerRef = useRef(null);

    useEffect(() => {
        if (!audioRef || !audioRef.current || !containerRef.current) return;

        const audioElement = audioRef.current;

        // The Web Audio API strictly allows a MediaElementSourceNode to be created exactly ONCE per HTMLMediaElement.
        // During React Strict Mode or Vite HMR, the Visualizer unmounts and remounts, which previously destroyed the analyzer
        // and attempted to recreate it on the *same* surviving audio tag, triggering the InvalidStateError.
        // We bypass this entirely by attaching the analyzer natively to the audio DOM element as a hidden property.
        if (!audioElement.__audioMotion) {
            audioElement.__audioMotion = new AudioMotionAnalyzer(containerRef.current, {
                source: audioElement,
                height: 100,
                mode: 4, // 1/12 octave bands (good balance)
                overlay: true,
                showBgColor: false,
                height: 100,
                fftSize: 512,
                smoothing: 0.7,
                ledBars: false,
                minFreq: 20,
                maxFreq: 16000,
                gradient: 'prism',
                colorMode: 'bar-level',
                showPeaks: true,
                peakHoldTime: 400,
                peakFadeTime: 600,
                fadePeaks: true,
                channelLayout: 'single',
                mirror: 1,
                showScaleX: false,
                showScaleY: false,
                maxFPS: 40,
                loRes: true,
                overlay: true,
                bgAlpha: 1,
                reflexRatio: 0.3,
            });
        } else {
            // If the analyzer survived an unmount (HMR), simply snatch its canvas and reparent it into the newly remounted container
            if (audioElement.__audioMotion.canvas) {
                containerRef.current.appendChild(audioElement.__audioMotion.canvas);
            }
        }

        // Force AudioContext to resume when playback starts if it was suspended by browser autoplay policies
        const handlePlay = () => {
            if (audioElement.__audioMotion && audioElement.__audioMotion.audioCtx.state === 'suspended') {
                audioElement.__audioMotion.audioCtx.resume();
            }
        };

        audioElement.addEventListener('play', handlePlay);

        return () => {
            audioElement.removeEventListener('play', handlePlay);
            // We deliberately DO NOT destroy() the analyzer on unmount.
            // Since the exact same audio tag lives on in PlayerContext, destroying its paired AudioContext
            // permanently breaks its ability to be visualized again natively.
        };
    }, [audioRef, currentSong]);

    return (
        <div ref={containerRef} className="visualiser-elmt" style={{ flex: 1, height: '100px', margin: '0 15px', minWidth: '100px', display: 'flex', alignItems: 'center' }}></div>
    );
};

export default Visualizer;
