import React, { useState, useRef, useEffect } from 'react';
import { SendIcon } from './icons/SendIcon';
import { AttachIcon } from './icons/AttachIcon';
import { CloseIcon } from './icons/CloseIcon';
import { PdfIcon } from './icons/PdfIcon';
import { StopIcon } from './icons/StopIcon';

interface ChatInputProps {
  onSendMessage: (message: string, file?: File | null) => void;
  isLoading: boolean;
  onStopGenerating: () => void;
}

const FilePreview: React.FC<{ file: File; onRemove: () => void }> = ({ file, onRemove }) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!file.type.startsWith('application/pdf')) {
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        }
    }, [file]);
    
    let previewElement;
    if (file.type.startsWith('image/')) {
        previewElement = <img src={previewUrl} alt="Preview" className="max-h-40 rounded-lg" />;
    } else if (file.type.startsWith('video/')) {
        previewElement = <video src={previewUrl} controls className="max-h-40 rounded-lg" />;
    } else if (file.type.startsWith('audio/')) {
        previewElement = <audio src={previewUrl} controls />;
    } else if (file.type === 'application/pdf') {
        previewElement = (
             <div className="flex items-center gap-2 p-2 bg-slate-700 rounded-lg">
                <PdfIcon className="w-6 h-6 text-red-400 flex-shrink-0" />
                <span className="text-sm text-slate-200 truncate">{file.name}</span>
            </div>
        )
    } else {
        previewElement = <div className="text-sm p-2 bg-slate-700 rounded-lg">{file.name}</div>
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


export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, onStopGenerating }) => {
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
    <div className="bg-transparent p-4">
      <div className="max-w-3xl mx-auto">
        {mediaFile && (
          <FilePreview file={mediaFile} onRemove={handleRemoveFile} />
        )}
        <div className="flex items-end gap-2 bg-slate-800 rounded-full p-2 pl-4 border border-slate-700 focus-within:border-purple-500 transition-colors">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-700 transition-colors"
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
            placeholder="Escribe un mensaje..."
            className="flex-grow bg-transparent text-slate-200 placeholder-slate-500 focus:outline-none resize-none max-h-48 px-2 py-2"
            rows={1}
            disabled={isLoading}
          />
           {isLoading ? (
            <button
                onClick={onStopGenerating}
                className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
                aria-label="Stop generating"
            >
                <StopIcon className="w-5 h-5" />
            </button>
            ) : (
            <button
                onClick={handleSend}
                disabled={!input.trim() && !mediaFile}
                className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-purple-600 text-white disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
            >
                <SendIcon className="w-5 h-5" />
            </button>
            )}
        </div>
      </div>
      <p className="text-xs text-center text-slate-500 pt-3">
        Ferre puede cometer errores. Considera verificar la información importante.
      </p>
    </div>
  );
};