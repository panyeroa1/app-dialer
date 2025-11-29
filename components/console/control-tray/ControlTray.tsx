/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import cn from 'classnames';
import { memo, ReactNode, useEffect, useRef, useState } from 'react';
import { AudioRecorder } from '../../../lib/audio-recorder';
import { useSettings, useTools, useLogStore, useSupervisor } from '@/lib/state';
import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';

export type ControlTrayProps = {
  children?: ReactNode;
};

function ControlTray({ children }: ControlTrayProps) {
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0);
  const [isClipped, setIsClipped] = useState(false);
  const connectButtonRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const historyRef = useRef<number[]>(new Array(30).fill(0));
  const { client, connected, connect, disconnect } = useLiveAPIContext();

  useEffect(() => {
    if (!connected) {
      setMuted(false);
      setVolume(0);
      setIsClipped(false);
      historyRef.current.fill(0);
    }
  }, [connected]);

  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([{ mimeType: 'audio/pcm;rate=16000', data: base64 }]);
    };
    
    const onVolumetrics = (metrics: { volume: number; clipped: boolean }) => {
        setVolume(metrics.volume);
        if (metrics.clipped) {
          setIsClipped(true);
          setTimeout(() => setIsClipped(false), 1000);
        }
        historyRef.current.shift();
        historyRef.current.push(metrics.volume);
    };

    if (connected && !muted && audioRecorder) {
      audioRecorder.on('data', onData);
      audioRecorder.on('volumetrics', onVolumetrics);
      audioRecorder.start();
    } else {
      audioRecorder.stop();
    }
    return () => {
      audioRecorder.off('data', onData);
      audioRecorder.off('volumetrics', onVolumetrics);
    };
  }, [connected, client, muted, audioRecorder]);

  useEffect(() => {
      if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
              const width = canvasRef.current.width;
              const height = canvasRef.current.height;
              ctx.clearRect(0, 0, width, height);
              
              // Draw minimalistic visualizer
              const barWidth = width / historyRef.current.length;
              historyRef.current.forEach((val, i) => {
                const x = i * barWidth;
                const h = Math.min(1, val * 3) * height; 
                const y = (height - h) / 2; // Center vertically
                
                // Dynamic color based on call status
                ctx.fillStyle = connected ? (isClipped ? '#ff4d4d' : '#34c759') : '#555';
                ctx.fillRect(x, y, barWidth - 2, h);
              });
          }
      }
  }, [volume, isClipped, connected]);

  const handleMicClick = () => {
    if (connected) setMuted(!muted);
  };

  const handleExportLogs = () => {
    const { systemPrompt, model } = useSettings.getState();
    const { tools } = useTools.getState();
    const { turns } = useLogStore.getState();
    const { suggestions, appliedCorrections } = useSupervisor.getState();

    const logData = {
      configuration: { model, systemPrompt },
      tools,
      suggestions,
      appliedCorrections,
      conversation: turns.map(turn => ({ ...turn, timestamp: turn.timestamp.toISOString() })),
    };

    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="control-tray">
      {/* Visualizer floats above the tray */}
      <div className={cn('audio-monitor', { hidden: !connected })}>
        <canvas ref={canvasRef} width="100" height="30" />
      </div>

      <nav className="actions-nav">
        {/* Left: Log Export */}
        <button
          className="action-button"
          onClick={handleExportLogs}
          title="Export Logs"
        >
          <span className="material-symbols-outlined">download</span>
        </button>

        {/* Center: CALL / END BUTTON */}
        <button
          ref={connectButtonRef}
          className={cn('connect-toggle', { connected })}
          onClick={connected ? disconnect : connect}
          title={connected ? 'End Call' : 'Start Call'}
        >
          <span className="material-symbols-outlined">
            {connected ? 'call_end' : 'call'}
          </span>
        </button>

        {/* Right: Mic Toggle */}
        <button
          className={cn('action-button mic-button', { muted: muted && connected })}
          onClick={handleMicClick}
          disabled={!connected}
          title="Mute Microphone"
        >
          <span className="material-symbols-outlined">
            {muted ? 'mic_off' : 'mic'}
          </span>
        </button>
        
        {children}
      </nav>
    </section>
  );
}

export default memo(ControlTray);
