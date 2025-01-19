import React, { useState } from 'react';
import { Download } from 'lucide-react';
import JSZip from 'jszip';
import { Peak, detectPeaks, createAudioBuffer, sliceAudio } from '../utils/audioProcessing';

interface ProcessingOptionsProps {
  audioFile: File | null;
  onThresholdChange: (threshold: number) => void;
}

const ProcessingOptions: React.FC<ProcessingOptionsProps> = ({ audioFile, onThresholdChange }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [threshold, setThreshold] = useState(0.1);

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newThreshold = Number(e.target.value);
    setThreshold(newThreshold);
    onThresholdChange(newThreshold);
  };

  const processAudio = async () => {
    if (!audioFile) return;

    setIsProcessing(true);
    try {
      const audioBuffer = await createAudioBuffer(audioFile);
      const peaks = await detectPeaks(audioBuffer, threshold);
      
      const zip = new JSZip();
      const folder = zip.folder('drum_samples');
      
      if (!folder) throw new Error('Failed to create zip folder');

      for (let i = 0; i < peaks.length; i++) {
        const peak = peaks[i];
        const slicedBuffer = await sliceAudio(audioBuffer, peak.start, peak.end);
        
        // Convert AudioBuffer to WAV
        const wavBlob = await audioBufferToWav(slicedBuffer);
        folder.file(`sample_${i + 1}.wav`, wavBlob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'drum_samples.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error processing audio:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium text-gray-700">
            Detection Threshold
          </label>
          <span className="text-sm text-gray-500">{threshold.toFixed(3)}</span>
        </div>
        <input
          type="range"
          min="0.001"
          max="0.5"
          step="0.001"
          value={threshold}
          onChange={handleThresholdChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <p className="text-xs text-gray-500">
          Lower values detect more peaks, higher values detect only the strongest peaks
        </p>
      </div>
      <button
        onClick={processAudio}
        disabled={!audioFile || isProcessing}
        className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg ${
          !audioFile || isProcessing
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600'
        } text-white transition-colors`}
      >
        <Download className="w-5 h-5" />
        <span>{isProcessing ? 'Processing...' : 'Process & Download'}</span>
      </button>
    </div>
  );
};

// Helper function to convert AudioBuffer to WAV blob
const audioBufferToWav = async (buffer: AudioBuffer): Promise<Blob> => {
  const numberOfChannels = buffer.numberOfChannels;
  const length = buffer.length * numberOfChannels * 2;
  const outputBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(outputBuffer);
  const channels = [];
  let offset = 0;
  let pos = 0;

  // Write WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * 2 * numberOfChannels, true);
  view.setUint16(32, numberOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);

  // Write audio data
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  offset = 44;
  while (pos < buffer.length) {
    for (let i = 0; i < numberOfChannels; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][pos]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, sample, true);
      offset += 2;
    }
    pos++;
  }

  return new Blob([outputBuffer], { type: 'audio/wav' });
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

export default ProcessingOptions;