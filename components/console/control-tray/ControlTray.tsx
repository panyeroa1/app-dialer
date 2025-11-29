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
  
  const historyRef = useRef<number[]>(new Array(40).fill(0));
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

  // Audio Visualizer Rendering
  useEffect(() => {
      if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
              const width = canvasRef.current.width;
              const height = canvasRef.current.height;
              ctx.clearRect(0, 0, width, height);
              
              const barWidth = 3;
              const gap = 2;
              const totalBars = Math.floor(width / (barWidth + gap));
              
              // Use only the latest N samples that fit
              const data = historyRef.current.slice(-totalBars);

              data.forEach((val, i) => {
                const x = i * (barWidth + gap) + (width - (data.length * (barWidth + gap))) / 2;
                // Non-linear scaling for better visuals
                const h = Math.max(2, Math.min(1, val * 5) * height); 
                const y = (height - h) / 2;
                
                // Color logic
                let color = '#555'; // Idle
                if (connected) {
                    if (isClipped) color = '#ff453a'; // Red
                    else if (val > 0.01) color = '#34c759'; // Green active
                    else color = 'rgba(255,255,255,0.3)'; // Connected silent
                }

                ctx.fillStyle = color;
                
                // Rounded caps
                ctx.beginPath();
                ctx.roundRect(x, y, barWidth, h, 2);
                ctx.fill();
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
    <div className="control-tray">
      {/* Floating Visualizer */}
      <div className={cn('audio-monitor', { hidden: !connected })}>
        <canvas ref={canvasRef} width="160" height="40" />
      </div>

      <nav className="actions-nav">
        {/* Logs Export */}
        <button
          className="action-button"
          onClick={handleExportLogs}
          title="Export Logs"
        >
          <span className="material-symbols-outlined">description</span>
        </button>

        {/* Main Dialer Button */}
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

        {/* Microphone Toggle */}
        <button
          className={cn('action-button mic-button', { muted: muted && connected })}
          onClick={handleMicClick}
          disabled={!connected}
          title={muted ? 'Unmute' : 'Mute'}
        >
          <span className="material-symbols-outlined">
            {muted ? 'mic_off' : 'mic'}
          </span>
        </button>
      </nav>
      {children}
    </div>
  );
}

export default memo(ControlTray);