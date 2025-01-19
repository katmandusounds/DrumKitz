import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, SkipBack, ZoomIn, ZoomOut } from 'lucide-react';
import { detectPeaks, createAudioBuffer } from '../utils/audioProcessing';

interface AudioPreviewProps {
  audioFile: File | null;
  threshold: number;
  onWaveformReady?: () => void;
}

interface DetectedPeak {
  start: number;
  end: number;
  amplitude: number;
}

const AudioPreview: React.FC<AudioPreviewProps> = ({ audioFile, threshold, onWaveformReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const thresholdRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [peaks, setPeaks] = useState<DetectedPeak[]>([]);
  const [selectedPeak, setSelectedPeak] = useState<number | null>(null);
  const playbackTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      wavesurferRef.current = WaveSurfer.create({
        container: containerRef.current,
        waveColor: '#4F46E5',
        progressColor: '#818CF8',
        cursorColor: '#4F46E5',
        barWidth: 1,
        barGap: 2,
        barRadius: 3,
        responsive: true,
        height: 200,
        normalize: true,
        partialRender: true,
        pixelRatio: 1,
      });

      wavesurferRef.current.on('ready', () => {
        onWaveformReady?.();
        updateThresholdLine();
        detectAndUpdatePeaks();
      });

      wavesurferRef.current.on('finish', () => {
        setIsPlaying(false);
        setSelectedPeak(null);
      });

      return () => {
        if (playbackTimeoutRef.current) {
          window.clearTimeout(playbackTimeoutRef.current);
        }
        wavesurferRef.current?.destroy();
      };
    }
  }, [onWaveformReady]);

  useEffect(() => {
    if (audioFile && wavesurferRef.current) {
      wavesurferRef.current.loadBlob(audioFile);
    }
  }, [audioFile]);

  useEffect(() => {
    updateThresholdLine();
    detectAndUpdatePeaks();
  }, [threshold]);

  const detectAndUpdatePeaks = async () => {
    if (!audioFile) return;
    
    try {
      const audioBuffer = await createAudioBuffer(audioFile);
      const detectedPeaks = await detectPeaks(audioBuffer, threshold);
      setPeaks(detectedPeaks);
    } catch (error) {
      console.error('Error detecting peaks:', error);
    }
  };

  const updateThresholdLine = () => {
    if (!thresholdRef.current || !wavesurferRef.current) return;

    const height = wavesurferRef.current.getWrapper().offsetHeight;
    const thresholdPosition = (1 - threshold) * height;
    thresholdRef.current.style.top = `${thresholdPosition}px`;
  };

  const stopPlayback = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.stop();
      setIsPlaying(false);
      setSelectedPeak(null);
      if (playbackTimeoutRef.current) {
        window.clearTimeout(playbackTimeoutRef.current);
        playbackTimeoutRef.current = null;
      }
    }
  };

  const togglePlayPause = () => {
    if (!wavesurferRef.current) return;

    if (isPlaying) {
      stopPlayback();
    } else {
      wavesurferRef.current.play();
      setIsPlaying(true);
    }
  };

  const restart = () => {
    if (!wavesurferRef.current) return;
    
    stopPlayback();
    // Small delay to ensure stop completes
    setTimeout(() => {
      if (wavesurferRef.current) {
        wavesurferRef.current.play();
        setIsPlaying(true);
      }
    }, 50);
  };

  const handleZoomIn = () => {
    if (wavesurferRef.current) {
      const newZoom = zoom * 1.5;
      setZoom(newZoom);
      wavesurferRef.current.zoom(newZoom * 50);
    }
  };

  const handleZoomOut = () => {
    if (wavesurferRef.current) {
      const newZoom = Math.max(1, zoom / 1.5);
      setZoom(newZoom);
      wavesurferRef.current.zoom(newZoom * 50);
    }
  };

  const playPeak = (index: number) => {
    if (!wavesurferRef.current || !peaks[index]) return;
    
    // Stop current playback and clear any pending timeouts
    stopPlayback();
    
    // Small delay to ensure stop completes
    setTimeout(() => {
      if (!wavesurferRef.current || !peaks[index]) return;
      
      const peak = peaks[index];
      setSelectedPeak(index);
      setIsPlaying(true);
      
      wavesurferRef.current.play(peak.start, peak.end);
      
      // Set timeout to clear selection when sample finishes
      const duration = (peak.end - peak.start) * 1000;
      playbackTimeoutRef.current = window.setTimeout(() => {
        setSelectedPeak(null);
        setIsPlaying(false);
      }, duration);
    }, 50);
  };

  return (
    <div className="w-full space-y-4">
      <div className="relative">
        <div ref={containerRef} className="w-full" />
        <div
          ref={thresholdRef}
          className="absolute left-0 right-0 border-t-2 border-red-500 border-dashed pointer-events-none"
          style={{ opacity: 0.5 }}
        />
        {peaks.map((peak, index) => (
          <div
            key={index}
            className="absolute border-l-2 border-r-2 border-green-500 pointer-events-none"
            style={{
              left: `${peak.start * 100}%`,
              right: `${100 - peak.end * 100}%`,
              top: 0,
              bottom: 0,
              opacity: 0.2,
              backgroundColor: selectedPeak === index ? 'rgba(34, 197, 94, 0.2)' : 'transparent'
            }}
          />
        ))}
      </div>
      <div className="flex justify-center space-x-4">
        <button
          onClick={restart}
          className="p-2 rounded-full hover:bg-gray-100"
          title="Restart"
        >
          <SkipBack className="w-6 h-6" />
        </button>
        <button
          onClick={togglePlayPause}
          className="p-2 rounded-full hover:bg-gray-100"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6" />
          )}
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 rounded-full hover:bg-gray-100"
          title="Zoom Out"
        >
          <ZoomOut className="w-6 h-6" />
        </button>
        <button
          onClick={handleZoomIn}
          className="p-2 rounded-full hover:bg-gray-100"
          title="Zoom In"
        >
          <ZoomIn className="w-6 h-6" />
        </button>
      </div>

      {peaks.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Detected Samples ({peaks.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {peaks.map((peak, index) => (
              <button
                key={index}
                onClick={() => playPeak(index)}
                className={`p-2 text-sm rounded-lg transition-colors ${
                  selectedPeak === index
                    ? 'bg-green-100 text-green-800 border-green-300'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                Sample {index + 1}
                <br />
                <span className="text-xs text-gray-500">
                  {((peak.end - peak.start) * 1000).toFixed(0)}ms
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioPreview;