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
      {/* Backdrop for mobile focus */}
      <div 
        className={c('sidebar-backdrop', { open: isSidebarOpen })} 
        onClick={toggleSidebar}
      />
      
      <aside className={c('sidebar', { open: isSidebarOpen })}>
        <div className="sidebar-header">
          <h3>Settings</h3>
          <button onClick={toggleSidebar} className="close-button">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="sidebar-content">
          
          {/* Agent Corrections */}
          <div className="sidebar-section">
             <button 
               className="accordion-header" 
               onClick={() => setIsCorrectionsOpen(!isCorrectionsOpen)}
               style={{width: '100%', display:'flex', alignItems:'center', justifyContent:'space-between', background:'none', border:'none', color:'white', padding:'8px 0', cursor:'pointer'}}
             >
               <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                 <span className="material-symbols-outlined">{isCorrectionsOpen ? 'expand_more' : 'chevron_right'}</span>
                 <h4 style={{margin:0}}>Supervisor Alerts</h4>
                 {isAnalyzing && <span className="material-symbols-outlined analyzing-spinner" style={{fontSize:16, color:'#34c759'}}>sync</span>}
               </div>
               {suggestions.length > 0 && <span className="badge" style={{background:'#ff453a', padding:'2px 8px', borderRadius:'12px', fontSize:'12px'}}>{suggestions.length}</span>}
             </button>
             
             {isCorrectionsOpen && (
               <div className="corrections-list">
                 {suggestions.length === 0 ? (
                   <div className="empty-state" style={{opacity:0.5, fontSize:14, padding:'8px'}}>All good. No issues detected.</div>
                 ) : (
                   suggestions.map(s => (
                     <div key={s.id} className="correction-card">
                       <div className="correction-header">
                         <span className="material-symbols-outlined warning-icon">warning</span>
                         <span className="timestamp">{s.timestamp.toLocaleTimeString()}</span>
                       </div>
                       <p className="correction-summary"><strong>Said:</strong> "{s.originalFeedback}"</p>
                       <p className="correction-summary"><strong>Fix:</strong> {s.summary}</p>
                       <div className="correction-actions">
                         <button onClick={() => applyCorrection(s.id, s.newSystemPrompt)} className="apply-btn">
                           Apply Fix
                         </button>
                         <button onClick={() => removeSuggestion(s.id)} className="dismiss-btn">
                           Ignore
                         </button>
                       </div>
                     </div>
                   ))
                 )}
               </div>
             )}
          </div>

          <div className="sidebar-section">
             <button 
               className="accordion-header" 
               onClick={() => setIsHistoryOpen(!isHistoryOpen)}
               style={{width: '100%', display:'flex', alignItems:'center', justifyContent:'space-between', background:'none', border:'none', color:'white', padding:'8px 0', cursor:'pointer'}}
             >
               <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                 <span className="material-symbols-outlined">{isHistoryOpen ? 'expand_more' : 'chevron_right'}</span>
                 <h4 style={{margin:0}}>History</h4>
               </div>
               {appliedCorrections.length > 0 && <span className="badge" style={{background:'#333', padding:'2px 8px', borderRadius:'12px', fontSize:'12px'}}>{appliedCorrections.length}</span>}
             </button>
             
             {isHistoryOpen && (
               <div className="corrections-list">
                 {appliedCorrections.map(s => (
                   <div key={s.id} className="correction-card history-card">
                     <div className="correction-header">
                       <span className="material-symbols-outlined check-icon">check_circle</span>
                       <span className="timestamp">{s.appliedAt.toLocaleTimeString()}</span>
                     </div>
                     <p className="correction-summary"><strong>Applied:</strong> {s.summary}</p>
                   </div>
                 ))}
               </div>
             )}
          </div>
          
          <hr style={{borderColor:'rgba(255,255,255,0.1)', margin:'20px 0'}} />

          <div className="sidebar-section">
            <fieldset disabled={connected} style={{border:'none', padding:0, margin:0}}>
              <label>
                System Persona
                <textarea
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  rows={8}
                  style={{resize:'vertical'}}
                />
              </label>
              <label>
                Model
                <select value={model} onChange={e => setModel(e.target.value)}>
                  {AVAILABLE_MODELS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label>
                Voice
                <select value={voice} onChange={e => setVoice(e.target.value)}>
                  {AVAILABLE_VOICES.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </label>
            </fieldset>
            <label>
              Expressive Style
              <select value={style} onChange={e => setStyle(e.target.value)}>
                {AVAILABLE_STYLES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <div className="tool-item">
              <label className="tool-checkbox-wrapper" style={{display:'flex', alignItems:'center', gap:'12px', width:'100%', cursor:'pointer'}}>
                <input
                  type="checkbox"
                  checked={googleSearch}
                  onChange={() => setGoogleSearch(!googleSearch)}
                  disabled={connected}
                  style={{width:'20px', height:'20px'}}
                />
                <span className="tool-name-text">Enable Google Search</span>
              </label>
            </div>
          </div>
          <div className="sidebar-section">
            <h4 style={{marginBottom:'16px'}}>Active Tools</h4>
            <div className="tools-list">
              {tools.map(tool => (
                <div key={tool.name} className="tool-item">
                  <label className="tool-checkbox-wrapper" style={{display:'flex', alignItems:'center', flex:1}}>
                    <input
                      type="checkbox"
                      checked={tool.isEnabled}
                      onChange={() => toggleTool(tool.name)}
                      disabled={connected}
                    />
                    <span className="tool-name-text">{tool.name}</span>
                  </label>
                  <div className="tool-actions">
                    <button onClick={() => setEditingTool(tool)} disabled={connected}>
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button onClick={() => removeTool(tool.name)} disabled={connected}>
                      <span className="material-symbols-outlined">delete</span>
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
              <span className="material-symbols-outlined" style={{verticalAlign:'middle', marginRight:'8px'}}>add_circle</span> 
              Add Function
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
    </>
  );
}