/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { useTools, Template } from '../../../lib/state';

const welcomeContent: Record<Template, { title: string; description: string; prompts: string[] }> = {
  'customer-support': {
    title: 'Beatrice (Real Estate)',
    description: 'Senior Broker in Brussels. Professional, direct, and helpful.',
    prompts: ["Looking to buy", "Selling my apartment", "Just browsing"],
  },
  'leo': {
    title: 'Leo (Eburon Estate)',
    description: 'High-trust property broker. Casual, efficient, phone-style.',
    prompts: ["Find me a condo", "Rental market update", "Sell my house"],
  },
  'personal-assistant': {
    title: 'Personal Assistant',
    description: 'General task management and scheduling.',
    prompts: ["Set a reminder", "Draft an email", "Check schedule"],
  },
  'navigation-system': {
    title: 'Navigation System',
    description: 'Route planning and traffic updates.',
    prompts: ["Route to airport", "Find gas station", "Traffic check"],
  },
};

const WelcomeScreen: React.FC = () => {
  const { template, setTemplate } = useTools();
  const { description, prompts } = welcomeContent[template];
  
  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="title-container">
          <span className="material-symbols-outlined welcome-icon">contact_phone</span>
          
          <div className="title-selector">
            <select 
              value={template} 
              onChange={(e) => setTemplate(e.target.value as Template)} 
              aria-label="Select Persona"
            >
              <option value="leo">Leo (Eburon Estate)</option>
              <option value="customer-support">Beatrice (Real Estate)</option>
              <option value="personal-assistant">Personal Assistant</option>
              <option value="navigation-system">Navigation System</option>
            </select>
            <span className="material-symbols-outlined icon">expand_more</span>
          </div>
        </div>
        
        <p style={{marginBottom: '24px', lineHeight: '1.5', color: '#aaa'}}>{description}</p>
        
        <div className="example-prompts">
          {prompts.map((prompt, index) => (
            <div key={index} className="prompt">"{prompt}"</div>
          ))}
        </div>
      </div>
      <div style={{marginTop: '20px', fontSize: '12px', opacity: 0.5}}>
        Press the Green Phone Button to Call
      </div>
    </div>
  );
};

export default WelcomeScreen;
