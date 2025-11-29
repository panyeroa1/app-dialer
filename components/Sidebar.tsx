
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { FunctionCall, useSettings, useUI, useTools, useSupervisor, useLogStore } from '@/lib/state';
import c from 'classnames';
import { DEFAULT_LIVE_API_MODEL, AVAILABLE_VOICES, AVAILABLE_STYLES } from '@/lib/constants';
import { useLiveAPIContext } from '@/contexts/LiveAPIContext';
import { useState } from 'react';
import ToolEditorModal from './ToolEditorModal';

const AVAILABLE_MODELS = [
  DEFAULT_LIVE_API_MODEL
];

export default function Sidebar() {
  const { isSidebarOpen, toggleSidebar } = useUI();
  const { systemPrompt, model, voice, style, googleSearch, setSystemPrompt, setModel, setVoice, setStyle, setGoogleSearch } =
    useSettings();
  const { tools, toggleTool, addTool, removeTool, updateTool } = useTools();
  const { connected } = useLiveAPIContext();
  const { suggestions, removeSuggestion, acceptSuggestion, isAnalyzing, appliedCorrections } = useSupervisor();

  const [editingTool, setEditingTool] = useState<FunctionCall | null>(null);
  const [isCorrectionsOpen, setIsCorrectionsOpen] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleSaveTool = (updatedTool: FunctionCall) => {
    if (editingTool) {
      updateTool(editingTool.name, updatedTool);
    }
    setEditingTool(null);
  };

  const applyCorrection = (id: string, newPrompt: string) => {
    setSystemPrompt(newPrompt);
    acceptSuggestion(id);
    
    useLogStore.getState().addTurn({
      role: 'system',
      text: `✅ Correction applied: System prompt updated based on feedback.`,
      isFinal: true
    });
  };

  return (
    <>
      <aside className={c('sidebar', { open: isSidebarOpen })}>
        <div className="sidebar-header">
          <h3>Settings</h3>
          <button onClick={toggleSidebar} className="close-button">
            <span className="icon">close</span>
          </button>
        </div>
        <div className="sidebar-content">
          
          {/* Correction Section (Pending) */}
          <div className="sidebar-section">
             <button 
               className="accordion-header" 
               onClick={() => setIsCorrectionsOpen(!isCorrectionsOpen)}
             >
               <span className="icon">{isCorrectionsOpen ? 'expand_more' : 'chevron_right'}</span>
               <h4 className="sidebar-section-title" style={{marginBottom:0}}>
                 Attention: Agent Correction
                 {suggestions.length > 0 && <span className="badge">{suggestions.length}</span>}
               </h4>
               {isAnalyzing && <span className="analyzing-spinner icon">sync</span>}
             </button>
             
             {isCorrectionsOpen && (
               <div className="corrections-list">
                 {suggestions.length === 0 ? (
                   <div className="empty-state">No corrections detected yet.</div>
                 ) : (
                   suggestions.map(s => (
                     <div key={s.id} className="correction-card">
                       <div className="correction-header">
                         <span className="icon warning-icon">warning</span>
                         <span className="timestamp">{s.timestamp.toLocaleTimeString()}</span>
                       </div>
                       <p className="correction-summary"><strong>User said:</strong> "{s.originalFeedback}"</p>
                       <p className="correction-summary"><strong>Fix:</strong> {s.summary}</p>
                       <div className="correction-actions">
                         <button onClick={() => applyCorrection(s.id, s.newSystemPrompt)} className="apply-btn">
                           Apply Fix
                         </button>
                         <button onClick={() => removeSuggestion(s.id)} className="dismiss-btn">
                           Dismiss
                         </button>
                       </div>
                     </div>
                   ))
                 )}
               </div>
             )}
          </div>

          {/* Correction History Section */}
          <div className="sidebar-section">
             <button 
               className="accordion-header" 
               onClick={() => setIsHistoryOpen(!isHistoryOpen)}
             >
               <span className="icon">{isHistoryOpen ? 'expand_more' : 'chevron_right'}</span>
               <h4 className="sidebar-section-title" style={{marginBottom:0}}>
                 Corrections Log
                 {appliedCorrections.length > 0 && <span className="badge gray">{appliedCorrections.length}</span>}
               </h4>
             </button>
             
             {isHistoryOpen && (
               <div className="corrections-list">
                 {appliedCorrections.length === 0 ? (
                   <div className="empty-state">No corrections applied yet.</div>
                 ) : (
                   appliedCorrections.map(s => (
                     <div key={s.id} className="correction-card history-card">
                       <div className="correction-header">
                         <span className="icon check-icon">check_circle</span>
                         <span className="timestamp">{s.appliedAt.toLocaleTimeString()}</span>
                       </div>
                       <p className="correction-summary"><strong>Issue:</strong> {s.summary}</p>
                       <p className="correction-summary"><strong>User said:</strong> "{s.originalFeedback}"</p>
                     </div>
                   ))
                 )}
               </div>
             )}
          </div>
          
          <hr className="divider" />

          <div className="sidebar-section">
            <fieldset disabled={connected}>
              <label>
                System Prompt
                <textarea
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  rows={10}
                  placeholder="Describe the role and personality of the AI..."
                />
              </label>
              <label>
                Model
                <select value={model} onChange={e => setModel(e.target.value)}>
                  {/* This is an experimental model name that should not be removed from the options. */}
                  {AVAILABLE_MODELS.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Voice
                <select value={voice} onChange={e => setVoice(e.target.value)}>
                  {AVAILABLE_VOICES.map(v => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
            <label>
              Style
              <select value={style} onChange={e => setStyle(e.target.value)}>
                {AVAILABLE_STYLES.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <div className="tool-item" style={{ marginTop: '8px' }}>
              <label className="tool-checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={googleSearch}
                  onChange={() => setGoogleSearch(!googleSearch)}
                  disabled={connected}
                />
                <span className="checkbox-visual"></span>
              </label>
              <span className="tool-name-text">Use Google Search</span>
            </div>
          </div>
          <div className="sidebar-section">
            <h4 className="sidebar-section-title">Tools</h4>
            <div className="tools-list">
              {tools.map(tool => (
                <div key={tool.name} className="tool-item">
                  <label className="tool-checkbox-wrapper">
                    <input
                      type="checkbox"
                      id={`tool-checkbox-${tool.name}`}
                      checked={tool.isEnabled}
                      onChange={() => toggleTool(tool.name)}
                      disabled={connected}
                    />
                    <span className="checkbox-visual"></span>
                  </label>
                  <label
                    htmlFor={`tool-checkbox-${tool.name}`}
                    className="tool-name-text"
                  >
                    {tool.name}
                  </label>
                  <div className="tool-actions">
                    <button
                      onClick={() => setEditingTool(tool)}
                      disabled={connected}
                      aria-label={`Edit ${tool.name}`}
                    >
                      <span className="icon">edit</span>
                    </button>
                    <button
                      onClick={() => removeTool(tool.name)}
                      disabled={connected}
                      aria-label={`Delete ${tool.name}`}
                    >
                      <span className="icon">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addTool}
              className="add-tool-button"
              disabled={connected}
            >
              <span className="icon">add</span> Add function call
            </button>
          </div>
        </div>
      </aside>
      {editingTool && (
        <ToolEditorModal
          tool={editingTool}
          onClose={() => setEditingTool(null)}
          onSave={handleSaveTool}
        />
      )}
      <style>{`
        .accordion-header {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          color: var(--gray-200);
          cursor: pointer;
          width: 100%;
          text-align: left;
          padding: 4px 0;
        }
        .accordion-header:hover {
          color: white;
        }
        .badge {
          background: var(--Red-500);
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 99px;
          font-weight: bold;
          margin-left: auto;
        }
        .badge.gray {
          background: var(--Neutral-50);
        }
        .analyzing-spinner {
          animation: spin 1s linear infinite;
          margin-left: 8px;
          font-size: 16px;
          color: var(--Blue-400);
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        
        .corrections-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 12px;
          margin-bottom: 12px;
        }
        .empty-state {
          font-size: 13px;
          color: var(--gray-500);
          font-style: italic;
          padding: 8px;
        }
        .correction-card {
          background: var(--Neutral-15);
          border: 1px solid var(--Red-700);
          border-radius: 8px;
          padding: 12px;
        }
        .history-card {
          border-color: var(--Green-700);
        }
        .correction-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .warning-icon {
          color: var(--Red-500);
          font-size: 18px;
        }
        .check-icon {
          color: var(--Green-500);
          font-size: 18px;
        }
        .timestamp {
          font-size: 11px;
          color: var(--gray-500);
        }
        .correction-summary {
          font-size: 13px;
          margin-bottom: 6px;
          line-height: 1.4;
          color: var(--gray-200);
        }
        .correction-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }
        .apply-btn {
          background: var(--Green-700);
          color: white;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          flex: 1;
          justify-content: center;
        }
        .apply-btn:hover { background: var(--Green-500); }
        .dismiss-btn {
          background: var(--Neutral-30);
          color: var(--gray-200);
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
        }
        .dismiss-btn:hover { background: var(--Neutral-50); }
        .divider {
          border: 0;
          border-top: 1px solid var(--gray-800);
          margin: 0;
        }
      `}</style>
    </>
  );
}
