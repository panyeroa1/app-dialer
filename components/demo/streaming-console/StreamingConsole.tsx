/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, useRef } from 'react';
import WelcomeScreen from '../welcome-screen/WelcomeScreen';
import { LiveConnectConfig, Modality, LiveServerContent, Tool } from '@google/genai';
import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';
import { useSettings, useLogStore, useTools, useSupervisor, ConversationTurn } from '@/lib/state';
import { checkCorrection } from '@/lib/supervisor';

const formatTimestamp = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const renderContent = (text: string) => {
  const parts = text.split(/(`{3}json\n[\s\S]*?\n`{3})/g);
  return parts.map((part, index) => {
    if (part.startsWith('```json')) {
      return null; // Hide raw JSON in chat view for cleanliness
    }
    const boldParts = part.split(/(\*\*.*?\*\*)/g);
    return boldParts.map((boldPart, boldIndex) => {
      if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
        return <strong key={boldIndex}>{boldPart.slice(2, -2)}</strong>;
      }
      return boldPart;
    });
  });
};

export default function StreamingConsole() {
  const { client, setConfig, connected } = useLiveAPIContext();
  const { systemPrompt, voice, style, googleSearch } = useSettings();
  const { tools } = useTools();
  const turns = useLogStore(state => state.turns);
  const { addSuggestion, setAnalyzing } = useSupervisor();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastActivityRef = useRef(Date.now());
  const silenceStageRef = useRef<number>(0);
  const API_KEY = process.env.API_KEY as string;

  useEffect(() => {
    if (connected) {
      client.send([{ text: `Style: ${style}` }]);
    }
  }, [style, connected, client]);

  // Silence Detection
  useEffect(() => {
    const interval = setInterval(() => {
      if (!connected) return;
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      
      if (timeSinceActivity > 12000 && silenceStageRef.current === 0) {
        silenceStageRef.current = 1;
        client.send([{ text: `[SYSTEM: Silence (12s). Re-engage naturally.]` }]);
        useLogStore.getState().addTurn({ role: 'system', text: `Silence (12s) - Re-engaging`, isFinal: true });
      }
      if (timeSinceActivity > 45000 && silenceStageRef.current === 1) {
        silenceStageRef.current = 2;
        client.send([{ text: `[SYSTEM: Silence (45s). Check connection.]` }]);
        useLogStore.getState().addTurn({ role: 'system', text: 'Persistent silence (45s) - Connection check', isFinal: true });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [connected, client]);

  // Config Update
  useEffect(() => {
    const functionDeclarations = tools.filter(tool => tool.isEnabled).map(tool => ({
      name: tool.name, description: tool.description, parameters: tool.parameters,
    }));
    const enabledTools: Tool[] = [];
    if (functionDeclarations.length > 0) enabledTools.push({ functionDeclarations });
    if (googleSearch) enabledTools.push({ googleSearch: {} });

    const config: any = {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      systemInstruction: { parts: [{ text: systemPrompt + (style && style !== 'Neutral' ? `\n\nStyle: ${style}` : '') }] },
      tools: enabledTools,
    };
    setConfig(config);
  }, [setConfig, systemPrompt, tools, voice, style, googleSearch]);

  // Event Handlers
  useEffect(() => {
    const { addTurn, updateLastTurn } = useLogStore.getState();

    const handleInputTranscription = async (text: string, isFinal: boolean) => {
      lastActivityRef.current = Date.now();
      silenceStageRef.current = 0;
      
      const turns = useLogStore.getState().turns;
      const last = turns[turns.length - 1];
      if (last && last.role === 'user' && !last.isFinal) {
        updateLastTurn({ text: last.text + text, isFinal });
      } else {
        addTurn({ role: 'user', text, isFinal });
      }

      if (isFinal && text.trim().length > 2) {
        setAnalyzing(true);
        const currentPrompt = useSettings.getState().systemPrompt;
        checkCorrection(API_KEY, currentPrompt, text, turns).then(result => {
           if (result.detected && result.newSystemPrompt) {
             addSuggestion({
               id: crypto.randomUUID(), timestamp: new Date(), originalFeedback: text,
               summary: result.summary || 'Correction', newSystemPrompt: result.newSystemPrompt
             });
             addTurn({ role: 'system', text: `⚡ Correction detected: "${result.summary}"`, isFinal: true });
           }
        }).finally(() => setAnalyzing(false));
      }
    };

    const handleOutputTranscription = (text: string, isFinal: boolean) => {
      lastActivityRef.current = Date.now();
      const turns = useLogStore.getState().turns;
      const last = turns[turns.length - 1];
      if (last && last.role === 'agent' && !last.isFinal) {
        updateLastTurn({ text: last.text + text, isFinal });
      } else {
        addTurn({ role: 'agent', text, isFinal });
      }
    };

    const handleContent = (serverContent: LiveServerContent) => {
      const text = serverContent.modelTurn?.parts?.map((p: any) => p.text).filter(Boolean).join(' ') ?? '';
      const groundingChunks = serverContent.groundingMetadata?.groundingChunks;
      if (!text && !groundingChunks) return;
      const turns = useLogStore.getState().turns;
      const last = turns[turns.length - 1];
      if (last?.role === 'agent' && !last.isFinal) {
        updateLastTurn({ text: last.text + text, ...(groundingChunks && { groundingChunks: [...(last.groundingChunks || []), ...groundingChunks] }) });
      } else {
        addTurn({ role: 'agent', text, isFinal: false, groundingChunks });
      }
    };

    const handleTurnComplete = () => {
      lastActivityRef.current = Date.now();
      const turns = useLogStore.getState().turns;
      const last = turns[turns.length - 1];
      if (last && !last.isFinal) updateLastTurn({ isFinal: true });
    };

    client.on('inputTranscription', handleInputTranscription);
    client.on('outputTranscription', handleOutputTranscription);
    client.on('content', handleContent);
    client.on('turncomplete', handleTurnComplete);

    return () => {
      client.off('inputTranscription', handleInputTranscription);
      client.off('outputTranscription', handleOutputTranscription);
      client.off('content', handleContent);
      client.off('turncomplete', handleTurnComplete);
    };
  }, [client]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [turns]);

  return (
    <div className="transcription-container">
      {turns.length === 0 ? (
        <WelcomeScreen />
      ) : (
        <div className="transcription-view" ref={scrollRef}>
          {turns.map((t, i) => (
            <div key={i} className={`transcription-entry ${t.role}`}>
              {t.role !== 'system' && renderContent(t.text)}
              {t.role === 'system' && <span>{t.text}</span>}
              {t.groundingChunks && t.groundingChunks.length > 0 && (
                <div className="grounding-chunks">
                  {t.groundingChunks.filter(chunk => chunk.web?.uri).map((chunk, idx) => (
                    <a key={idx} href={chunk.web?.uri} target="_blank" rel="noreferrer">
                      Source {idx + 1}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
