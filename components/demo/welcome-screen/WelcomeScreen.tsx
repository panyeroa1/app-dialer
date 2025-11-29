/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { useTools, Template } from '../../../lib/state';

const welcomeContent: Record<Template, { title: string; description: string; prompts: string[] }> = {
  'customer-support': {
    title: 'Beatrice',
    description: 'Senior Broker (Brussels)',
    prompts: ["Looking to buy", "Selling apartment"],
  },
  'leo': {
    title: 'Leo',
    description: 'Eburon Estate Broker',
    prompts: ["Find a condo", "Market check"],
  },
  'personal-assistant': {
    title: 'Assistant',
    description: 'Task & Scheduling',
    prompts: ["Set reminder", "Draft email"],
  },
  'navigation-system': {
    title: 'Nav',
    description: 'Route Planning',
    prompts: ["Airport route", "Traffic info"],
  },
};

const WelcomeScreen: React.FC = () => {
  const { template, setTemplate } = useTools();
  const { title, description } = welcomeContent[template];
  
  return (
    <div className="welcome-container">
      <div className="contact-avatar">
        <span className="material-symbols-outlined">person</span>
      </div>
      
      <div className="title-selector" style={{maxWidth: '200px', margin: '0 auto'}}>
        <select 
          value={template} 
          onChange={(e) => setTemplate(e.target.value as Template)} 
          aria-label="Select Persona"
          style={{background:'none', border:'none', fontSize:'28px', fontWeight:'700', color:'white', textAlign:'center', width:'100%', paddingRight:'0'}}
        >
          <option value="leo">Leo</option>
          <option value="customer-support">Beatrice</option>
          <option value="personal-assistant">Assistant</option>
          <option value="navigation-system">Nav System</option>
        </select>
        <div style={{fontSize: '16px', color:'#8e8e93', marginTop:'8px'}}>{description}</div>
      </div>
      
      <div style={{marginTop: '40px', opacity: 0.6, fontSize: '14px', maxWidth:'260px'}}>
        Select a contact above and tap the green button to call.
      </div>
    </div>
  );
};

export default WelcomeScreen;