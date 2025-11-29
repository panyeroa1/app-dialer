/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { FunctionResponseScheduling } from '@google/genai';
import { FunctionCall } from '../state';

export const customerSupportTools: FunctionCall[] = [
  {
    name: 'search_properties',
    description: 'Searches for properties based on user criteria like location, budget, and type.',
    parameters: {
      type: 'OBJECT',
      properties: {
        location: {
          type: 'STRING',
          description: 'The preferred city or area (e.g., Makati, BGC, Quezon City).',
        },
        maxBudget: {
          type: 'NUMBER',
          description: 'The maximum budget in PHP.',
        },
        propertyType: {
          type: 'STRING',
          description: 'The type of property (e.g., Condo, House, Apartment).',
        },
        bedrooms: {
          type: 'NUMBER',
          description: 'Minimum number of bedrooms required.',
        },
      },
      required: ['location', 'maxBudget'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  {
    name: 'schedule_viewing',
    description: 'Schedules a physical or virtual viewing for a specific property.',
    parameters: {
      type: 'OBJECT',
      properties: {
        location: {
          type: 'STRING',
          description: 'The location or name of the property to view.',
        },
        date: {
          type: 'STRING',
          description: 'Preferred date for the viewing (ISO 8601 or natural language).',
        },
        time: {
          type: 'STRING',
          description: 'Preferred time for the viewing.',
        },
      },
      required: ['location', 'date'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  {
    name: 'calculate_mortgage',
    description: 'Calculates estimated monthly amortization based on total price and downpayment.',
    parameters: {
      type: 'OBJECT',
      properties: {
        totalPrice: {
          type: 'NUMBER',
          description: 'Total price of the property in PHP.',
        },
        downPaymentPercent: {
          type: 'NUMBER',
          description: 'Downpayment percentage (e.g., 20).',
        },
        interestRate: {
          type: 'NUMBER',
          description: 'Annual interest rate percentage (default is usually 7-8%).',
        },
        years: {
          type: 'NUMBER',
          description: 'Loan term in years (e.g., 5, 10, 15, 20).',
        },
      },
      required: ['totalPrice'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
];