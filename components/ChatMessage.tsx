import React from 'react';
import { Message, Role } from '../types';
import { GeminiIcon } from './icons/GeminiIcon';
import { UserIcon } from './icons/UserIcon';
import { PdfIcon } from './icons/PdfIcon';

interface ChatMessageProps {
  message: Message;
}

const MediaPreview: React.FC<{ media: Message['media'] }> = ({ media }) => {
    if (!media) return null;

    if (media.type.startsWith('image/')) {
        return <img src={media.url} alt={media.name} className="max-w-xs rounded-lg mb-2" />;
    }
    if (media.type.startsWith('video/')) {
        return <video src={media.url} controls className="max-w-xs rounded-lg mb-2" />;
    }
    if (media.type.startsWith('audio/')) {
        return <audio src={media.url} controls className="mb-2 w-full max-w-xs" />;
    }
    if (media.type === 'application/pdf') {
        return (
            <div className="flex items-center gap-2 p-2 mb-2 bg-black/20 rounded-lg max-w-xs">
                <PdfIcon className="w-6 h-6 text-red-400 flex-shrink-0" />
                <span className="text-sm truncate">{media.name}</span>
            </div>
        )
    }
    if (media.name) {
         return (
            <div className="flex items-center gap-2 p-2 mb-2 bg-black/20 rounded-lg max-w-xs">
                <span className="text-sm truncate">[Archivo adjunto: {media.name}]</span>
            </div>
        )
    }
    return null;
};

const GroundingSources: React.FC<{ sources: Message['sources'] }> = ({ sources }) => {
    if (!sources || sources.length === 0) return null;

    return (
        <div className="mt-4 pt-3 border-t border-white/10">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Fuentes consultadas:</h3>
            <ul className="list-decimal list-inside space-y-1">
                {sources.map((source, index) => (
                    <li key={index} className="text-sm text-blue-300 hover:text-blue-200 truncate">
                        <a href={source.uri} target="_blank" rel="noopener noreferrer" title={source.title}>
                            {source.title || new URL(source.uri).hostname}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}


export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === Role.USER;
  const isModel = message.role === Role.MODEL;
  const isError = message.role === Role.ERROR;

  if (isError) {
    return (
      <div className="flex items-center gap-4 p-4 md:p-6 bg-red-900/20 text-red-300">
         <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-red-500 text-white font-bold">
            !
         </div>
         <div className="flex-grow">
            <p className="font-semibold">Error</p>
            <p className="text-sm">{message.parts}</p>
         </div>
      </div>
    );
  }

  const wrapperClasses = `flex items-start gap-3 p-4 md:px-6 ${isUser ? 'justify-end' : ''}`;
  const bubbleClasses = `max-w-xl rounded-2xl px-4 py-3 shadow-md ${isUser ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`;
  const iconWrapperClasses = `flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isModel ? 'bg-purple-500' : 'bg-blue-500'}`;

  const renderIcon = () => (
    <div className={iconWrapperClasses}>
      {isModel ? <GeminiIcon className="w-5 h-5" /> : <UserIcon className="w-5 h-5 text-white" />}
    </div>
  );
  
  const renderContent = () => (
    // Basic markdown-like formatting for newlines
    message.parts.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        <br />
      </React.Fragment>
    ))
  );

  return (
    <div className={wrapperClasses}>
      {isModel && renderIcon()}
      <div className={bubbleClasses}>
        <MediaPreview media={message.media} />
        <div className="prose prose-invert prose-sm max-w-none message-content">
          {renderContent()}
        </div>
        <GroundingSources sources={message.sources} />
      </div>
       {isUser && renderIcon()}
    </div>
  );
};