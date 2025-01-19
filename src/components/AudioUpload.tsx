import React, { useCallback } from 'react';
import { Upload } from 'lucide-react';

interface AudioUploadProps {
  onFileSelect: (file: File) => void;
}

const AudioUpload: React.FC<AudioUploadProps> = ({ onFileSelect }) => {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && (file.type === 'audio/wav' || file.type === 'audio/mpeg')) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="w-full p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <Upload className="w-12 h-12 text-gray-400" />
        <p className="text-lg font-medium text-gray-600">
          Drag and drop your audio file here
        </p>
        <p className="text-sm text-gray-500">or</p>
        <label className="px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors">
          Choose File
          <input
            type="file"
            className="hidden"
            accept=".wav,.mp3"
            onChange={handleFileInput}
          />
        </label>
        <p className="text-xs text-gray-400">Supports WAV and MP3 files</p>
      </div>
    </div>
  );
};

export default AudioUpload;