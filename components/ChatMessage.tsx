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
        return <audio src={media.url} controls className="mb-2" />;
    }
    if (media.type === 'application/pdf') {
        return (
            <div className="flex items-center gap-2 p-2 mb-2 bg-gray-700 rounded-lg max-w-xs">
                <PdfIcon className="w-6 h-6 text-red-400 flex-shrink-0" />
                <span className="text-sm text-gray-200 truncate">{media.name}</span>
            </div>
        )
    }
    // Fallback for other file types from history
    if (media.name) {
         return (
            <div className="flex items-center gap-2 p-2 mb-2 bg-gray-700 rounded-lg max-w-xs">
                <span className="text-sm text-gray-200 truncate">[Archivo adjunto: {media.name}]</span>
            </div>
        )
    }
    return null;
};

const GroundingSources: React.FC<{ sources: Message['sources'] }> = ({ sources }) => {
    if (!sources || sources.length === 0) return null;

    return (
        <div className="mt-4 pt-3 border-t border-gray-700">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Fuentes consultadas:</h3>
            <ul className="list-decimal list-inside space-y-1">
                {sources.map((source, index) => (
                    <li key={index} className="text-sm text-blue-400 hover:text-blue-300 truncate">
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

  const wrapperClasses = `flex items-start gap-4 p-4 md:p-6 ${isUser ? '' : 'bg-gray-800/50'}`;
  const iconWrapperClasses = `flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isModel ? 'bg-purple-500' : 'bg-blue-500'}`;

  const renderIcon = () => {
    if (isModel) return <GeminiIcon className="w-5 h-5" />;
    if (isUser) return <UserIcon className="w-5 h-5 text-white" />;
    return null;
  };

  const renderContent = () => {
    // Basic markdown-like formatting for newlines
    const textContent = message.parts.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        <br />
      </React.Fragment>
    ));

    return (
      <div>
        <MediaPreview media={message.media} />
        {textContent}
        <GroundingSources sources={message.sources} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-4 p-4 md:p-6 bg-red-900/20 text-red-400">
         <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-red-500 text-white">
            !
         </div>
         <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm">{message.parts}</p>
         </div>
      </div>
    );
  }

  return (
    <div className={wrapperClasses}>
      <div className={iconWrapperClasses}>
        {renderIcon()}
      </div>
      <div className="flex-grow text-gray-200 pt-1 message-content">
        {renderContent()}
      </div>
    </div>
  );
};
