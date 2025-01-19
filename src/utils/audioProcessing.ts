export interface Peak {
  start: number;
  end: number;
  amplitude: number;
}

// Constants for peak detection
const MIN_PEAK_DISTANCE = 0.05; // Minimum 50ms between peaks
const PRE_PEAK_BUFFER = 0.025; // 25ms buffer before peak
const POST_PEAK_BUFFER = 0.05; // 50ms buffer after peak
const MIN_SEGMENT_DURATION = 0.05; // Minimum 50ms segment duration
const MAX_SEGMENT_DURATION = 0.2; // Maximum 200ms segment duration

// Calculate RMS (Root Mean Square) value for a section of audio data
const calculateRMS = (data: Float32Array, start: number, length: number): number => {
  let sum = 0;
  const end = Math.min(start + length, data.length);
  
  for (let i = start; i < end; i++) {
    sum += data[i] * data[i];
  }
  
  return Math.sqrt(sum / (end - start));
};

export const detectPeaks = async (audioBuffer: AudioBuffer, threshold = 0.1): Promise<Peak[]> => {
  const data = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const peaks: Peak[] = [];
  
  // Convert time-based constants to samples
  const minPeakDistanceSamples = Math.floor(MIN_PEAK_DISTANCE * sampleRate);
  const prePeakBufferSamples = Math.floor(PRE_PEAK_BUFFER * sampleRate);
  const postPeakBufferSamples = Math.floor(POST_PEAK_BUFFER * sampleRate);
  const minSegmentSamples = Math.floor(MIN_SEGMENT_DURATION * sampleRate);
  const maxSegmentSamples = Math.floor(MAX_SEGMENT_DURATION * sampleRate);
  
  // Window size for RMS calculation (about 5ms)
  const rmsWindowSize = Math.floor(0.005 * sampleRate);
  
  let lastPeakIndex = -minPeakDistanceSamples;
  let isInPeak = false;
  let peakStartIndex = 0;
  let maxAmplitude = 0;

  for (let i = 0; i < data.length; i++) {
    // Calculate RMS for current window
    const rms = calculateRMS(data, i, rmsWindowSize);
    
    if (rms > threshold && !isInPeak && i - lastPeakIndex >= minPeakDistanceSamples) {
      // Start of a new peak
      isInPeak = true;
      // Include pre-peak buffer, but don't go before the last peak
      peakStartIndex = Math.max(i - prePeakBufferSamples, lastPeakIndex + minPeakDistanceSamples);
      maxAmplitude = rms;
    } else if (rms > threshold && isInPeak) {
      // Update maximum amplitude if we're in a peak
      maxAmplitude = Math.max(maxAmplitude, rms);
    } else if (rms <= threshold && isInPeak) {
      // End of peak detected
      isInPeak = false;
      
      // Calculate end index with post-peak buffer
      let peakEndIndex = Math.min(i + postPeakBufferSamples, data.length);
      
      // Ensure minimum segment duration
      if (peakEndIndex - peakStartIndex < minSegmentSamples) {
        peakEndIndex = peakStartIndex + minSegmentSamples;
      }
      
      // Enforce maximum segment duration
      if (peakEndIndex - peakStartIndex > maxSegmentSamples) {
        peakEndIndex = peakStartIndex + maxSegmentSamples;
      }
      
      // Add peak if it meets duration requirements
      if (peakEndIndex - peakStartIndex >= minSegmentSamples) {
        peaks.push({
          start: peakStartIndex / sampleRate,
          end: peakEndIndex / sampleRate,
          amplitude: maxAmplitude
        });
        lastPeakIndex = peakEndIndex;
      }
    }
  }

  // Handle case where we're still in a peak at the end of the file
  if (isInPeak) {
    const peakEndIndex = Math.min(
      data.length,
      peakStartIndex + maxSegmentSamples
    );
    
    if (peakEndIndex - peakStartIndex >= minSegmentSamples) {
      peaks.push({
        start: peakStartIndex / sampleRate,
        end: peakEndIndex / sampleRate,
        amplitude: maxAmplitude
      });
    }
  }

  return peaks;
};

export const createAudioBuffer = async (file: File): Promise<AudioBuffer> => {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();
  return await audioContext.decodeAudioData(arrayBuffer);
};

export const sliceAudio = async (
  audioBuffer: AudioBuffer,
  start: number,
  end: number
): Promise<AudioBuffer> => {
  const duration = end - start;
  const sampleStart = Math.floor(start * audioBuffer.sampleRate);
  const sampleDuration = Math.floor(duration * audioBuffer.sampleRate);

  const newBuffer = new AudioContext().createBuffer(
    audioBuffer.numberOfChannels,
    sampleDuration,
    audioBuffer.sampleRate
  );

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    const newChannelData = newBuffer.getChannelData(channel);
    for (let i = 0; i < sampleDuration; i++) {
      newChannelData[i] = channelData[sampleStart + i];
    }
  }

  return newBuffer;
};