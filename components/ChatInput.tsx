import React, { useState, useRef, useEffect } from 'react';
import { SendIcon } from './icons/SendIcon';
import { AttachIcon } from './icons/AttachIcon';
import { CloseIcon } from './icons/CloseIcon';

interface ChatInputProps {
  onSendMessage: (message: string, file?: File | null) => void;
  isLoading: boolean;
}

const FilePreview: React.FC<{ file: File; onRemove: () => void }> = ({ file, onRemove }) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);
    
    if (!previewUrl) return null;

    let previewElement;
    if (file.type.startsWith('image/')) {
        previewElement = <img src={previewUrl} alt="Preview" className="max-h-40 rounded-lg" />;
    } else if (file.type.startsWith('video/')) {
        previewElement = <video src={previewUrl} controls className="max-h-40 rounded-lg" />;
    } else if (file.type.startsWith('audio/')) {
        previewElement = <audio src={previewUrl} controls />;
    } else {
        previewElement = <div className="text-sm p-2 bg-gray-700 rounded-lg">{file.name}</div>
    }

    return (
        <div className="relative inline-block mb-2">
            {previewElement}
            <button 
              onClick={onRemove}
              className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/75"
              aria-label="Remove file"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
        </div>
    );
};


export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSend = () => {
    if ((input.trim() || mediaFile) && !isLoading) {
      onSendMessage(input.trim(), mediaFile);
      setInput('');
      setMediaFile(null);
      if(fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMediaFile(e.target.files[0]);
    }
  };
  
  const handleRemoveFile = () => {
    setMediaFile(null);
    if(fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <div className="bg-gray-800 p-4">
      <div className="max-w-3xl mx-auto">
        {mediaFile && (
          <FilePreview file={mediaFile} onRemove={handleRemoveFile} />
        )}
        <div className="flex items-end gap-3 bg-gray-900 rounded-2xl p-2 pr-3 border border-gray-700 focus-within:border-purple-500 transition-colors">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-700 transition-colors"
            aria-label="Attach file"
          >
            <AttachIcon className="w-5 h-5" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange}
            className="hidden" 
            accept="image/*,video/*,audio/*,application/pdf"
          />
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe un mensaje o sube un archivo..."
            className="flex-grow bg-transparent text-gray-200 placeholder-gray-500 focus:outline-none resize-none max-h-48 px-2 py-2.5"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && !mediaFile)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-purple-600 text-white disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
            ) : (
              <SendIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
      <p className="text-xs text-center text-gray-500 pt-3">
        daniel ferrero puede cometer errores. Considera verificar la información importante.
      </p>
    </div>
  );
};
