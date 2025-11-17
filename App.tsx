import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, Part, GroundingChunk } from '@google/genai';
import { Message, Role, GroundingSource, Media } from './types';
import { Header } from './components/Header';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

const App: React.FC = () => {
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const newChatSession = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            tools: [{googleSearch: {}}],
            systemInstruction: `Eres un asistente servicial y amigable. Tu nombre es daniel ferrero. Responde en español.

Sigue estos principios para todas tus respuestas:
- Claridad: Tus respuestas deben ser fáciles de entender. Evita la jerga innecesaria y las frases enrevesadas. Si usas términos técnicos, intenta explicarlos.
- Concisión: Intenta no dar información redundante o demasiado extensa a menos que se pida profundidad. La idea es que el usuario pueda leer y captar la respuesta rápidamente.
- Precisión: Procura que los datos sean correctos, verificables y actualizados (dentro de tus límites de conocimiento o usando herramientas web si es necesario).
- Relevancia: Incluye solo lo que responde directamente a la pregunta, evitando desviarte del tema.
- Estructura: Organiza la información de forma lógica: a veces en párrafos, otras en listas, pasos o comparaciones, según lo que facilite la comprensión de la respuesta.
- Adaptabilidad: Ajusta el nivel de detalle según la complejidad de la pregunta y lo que percibes del nivel de conocimiento o interés del usuario.
- Tono: Mantén un tono profesional, amigable o incluso ligero, según el contexto, para que la respuesta sea agradable de leer.
- Transparencia sobre limitaciones: Si algo no lo sabes con certeza o puede variar (como datos muy recientes), acláralo en tu respuesta.
- Seguridad y ética: Nunca des instrucciones peligrosas, ilegales o que puedan causar daño.`,
          },
        });
        setChatSession(newChatSession);
         setChatHistory([
          { role: Role.MODEL, parts: '¡Hola! ¿Cómo puedo ayudarte hoy? Puedes hacerme una pregunta, subir una imagen, un documento, un audio o un video.' }
        ]);
      } catch (error) {
        console.error("Initialization error:", error);
        setChatHistory([{ role: Role.ERROR, parts: 'Failed to initialize the chat session. Please check your API key and configuration.' }]);
      }
    };
    initChat();
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSendMessage = async (userInput: string, mediaFile?: File | null) => {
    if (!chatSession) return;

    setIsLoading(true);
    
    let mediaPreview: Media | undefined;
    if (mediaFile) {
        mediaPreview = {
            url: URL.createObjectURL(mediaFile),
            type: mediaFile.type,
            name: mediaFile.name
        };
    }

    const userMessage: Message = { 
      role: Role.USER, 
      parts: userInput,
      media: mediaPreview,
    };

    const optimisticModelMessage: Message = { role: Role.MODEL, parts: '' };
    setChatHistory(prev => [...prev, userMessage, optimisticModelMessage]);

    try {
      const messageParts: (string | Part)[] = [{ text: userInput }];

      if (mediaFile) {
        const base64Media = await fileToBase64(mediaFile);
        messageParts.unshift({
          inlineData: {
            data: base64Media,
            mimeType: mediaFile.type,
          },
        });
      }

      const stream = await chatSession.sendMessageStream({ message: messageParts });

      let fullResponse = '';
      let groundingSources: GroundingSource[] = [];

      for await (const chunk of stream) {
        const chunkText = chunk.text;
        fullResponse += chunkText;

        const webSources = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks
            ?.filter((chunk: GroundingChunk) => chunk.web)
            .map((chunk: GroundingChunk) => ({
                uri: chunk.web.uri,
                title: chunk.web.title,
            }));
        
        if (webSources) {
            groundingSources = [...webSources];
        }

        setChatHistory(prev => {
          const newHistory = [...prev];
          const lastMessage = newHistory[newHistory.length - 1];
          newHistory[newHistory.length - 1] = { ...lastMessage, parts: fullResponse, sources: groundingSources };
          return newHistory;
        });
      }

    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = { role: Role.ERROR, parts: 'An error occurred while getting the response. Please try again.' };
      setChatHistory(prev => {
        const newHistory = [...prev];
        // Replace the optimistic message with the error
        newHistory[newHistory.length - 1] = errorMessage;
        return newHistory;
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="h-screen w-screen bg-gray-900 text-white flex flex-col font-sans">
      <Header />
      <main ref={chatContainerRef} className="flex-grow overflow-y-auto pt-20 pb-4">
        <div className="max-w-3xl mx-auto">
          {chatHistory.map((msg, index) => (
            <ChatMessage key={index} message={msg} />
          ))}
          {isLoading && chatHistory[chatHistory.length - 1]?.parts === '' && (
              <div className="flex items-start gap-4 p-4 md:p-6">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-purple-500">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-75"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-150"></div>
                </div>
                <div className="flex-grow text-gray-400 pt-1 italic">
                  Pensando...
                </div>
              </div>
          )}
        </div>
      </main>
      <footer className="w-full sticky bottom-0 left-0 bg-gray-900/80 backdrop-blur-sm">
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </footer>
    </div>
  );
};

export default App;
