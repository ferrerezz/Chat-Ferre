import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, Part, GroundingChunk, Content } from '@google/genai';
import { Message, Role, GroundingSource, Media } from './types';
import { Header } from './components/Header';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { GeminiIcon } from './components/icons/GeminiIcon';

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
  const stopGenerationRef = useRef<boolean>(false);

  // Save chat history to local storage whenever it changes
  useEffect(() => {
    // We only save if there's more than the initial welcome message.
    if (chatHistory.length > 1) {
      // Strip media before saving, as Blob URLs are not persistent across sessions.
      const historyToSave = chatHistory.map(({ media, ...rest }) => rest);
      localStorage.setItem('chatFerreHistory', JSON.stringify(historyToSave));
    }
  }, [chatHistory]);

  // Initialize chat session, loading from history if available
  useEffect(() => {
    const initChat = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        
        const savedHistoryJSON = localStorage.getItem('chatFerreHistory');
        let historyForAI: Content[] = [];
        let historyForUI: Message[] = [];

        if (savedHistoryJSON) {
            const savedHistory = JSON.parse(savedHistoryJSON);
            if (Array.isArray(savedHistory) && savedHistory.length > 0) {
                historyForUI = savedHistory;
                historyForAI = savedHistory
                    .filter((msg: Message) => msg.role === Role.USER || msg.role === Role.MODEL)
                    .map((msg: Message) => ({
                        role: msg.role,
                        parts: [{ text: msg.parts }]
                    }));
            }
        }
        
        const newChatSession = ai.chats.create({
          model: 'gemini-2.5-flash',
          history: historyForAI, // Pass mapped history to the SDK
          config: {
            tools: [{googleSearch: {}}],
            systemInstruction: `Eres un asistente servicial y amigable. Tu nombre es Ferre. Responde en español.

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
        
        if (historyForUI.length > 0) {
            setChatHistory(historyForUI);
        } else {
            setChatHistory([
              { role: Role.MODEL, parts: '¡Hola! Soy Ferre, tu asistente personal. ¿En qué puedo ayudarte hoy?' }
            ]);
        }
      } catch (error) {
        console.error("Initialization error:", error);
        setChatHistory([{ role: Role.ERROR, parts: 'No se pudo inicializar la sesión de chat. Por favor, verifica tu clave de API y configuración.' }]);
      }
    };
    initChat();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleStopGenerating = () => {
    stopGenerationRef.current = true;
  };

  const handleSendMessage = async (userInput: string, mediaFile?: File | null) => {
    if (!chatSession) return;

    setIsLoading(true);
    stopGenerationRef.current = false;
    
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
        if (stopGenerationRef.current) {
            break; 
        }

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
      const errorMessage: Message = { role: Role.ERROR, parts: 'Ocurrió un error al obtener la respuesta. Por favor, inténtalo de nuevo.' };
      setChatHistory(prev => {
        const newHistory = [...prev];
        // Replace the optimistic message with the error
        newHistory[newHistory.length - 1] = errorMessage;
        return newHistory;
      });
    } finally {
      setIsLoading(false);
      stopGenerationRef.current = false;
    }
  };
  
  return (
    <div className="h-screen w-screen bg-slate-900 text-white flex flex-col font-sans">
      <Header />
      <main ref={chatContainerRef} className="flex-grow overflow-y-auto pt-24 pb-4">
        <div className="max-w-3xl mx-auto">
          {chatHistory.map((msg, index) => (
            <ChatMessage key={index} message={msg} />
          ))}
          {isLoading && chatHistory[chatHistory.length - 1]?.parts === '' && (
              <div className="flex items-start gap-3 p-4 md:px-6">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-purple-500">
                  <GeminiIcon className="w-5 h-5 animate-pulse" />
                </div>
                <div className="max-w-xl rounded-2xl px-4 py-3 shadow-md bg-slate-700 text-slate-400 rounded-bl-none italic">
                  Ferre está pensando...
                </div>
              </div>
          )}
        </div>
      </main>
      <footer className="w-full sticky bottom-0 left-0 bg-slate-900/80 backdrop-blur-sm">
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} onStopGenerating={handleStopGenerating} />
      </footer>
    </div>
  );
};

export default App;
