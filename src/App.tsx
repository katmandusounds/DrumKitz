import React, { useState } from 'react';
import { AudioWaveform as Waveform } from 'lucide-react';
import AudioUpload from './components/AudioUpload';
import AudioPreview from './components/AudioPreview';
import ProcessingOptions from './components/ProcessingOptions';

function App() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [threshold, setThreshold] = useState(0.1);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center space-x-3 mb-8">
          <Waveform className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-gray-900">DrumKitz</h1>
        </div>

        <div className="space-y-8">
          {!audioFile ? (
            <AudioUpload onFileSelect={setAudioFile} />
          ) : (
            <div className="space-y-8 bg-white p-6 rounded-lg shadow-sm">
              <AudioPreview 
                audioFile={audioFile} 
                threshold={threshold}
              />
              <ProcessingOptions 
                audioFile={audioFile}
                onThresholdChange={setThreshold}
              />
              <button
                onClick={() => setAudioFile(null)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Upload a different file
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;