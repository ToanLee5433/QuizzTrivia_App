import type { Preview } from '@storybook/react';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import i18n from '../src/lib/i18n';
import '../src/index.css';

const preview: Preview = {
  decorators: [
    (Story) => (
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <Story />
          </div>
        </BrowserRouter>
      </I18nextProvider>
    ),
  ],

  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      test: 'todo'
    },

    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile (375px)',
          styles: { width: '375px', height: '812px' },
          type: 'mobile'
        },
        tablet: {
          name: 'Tablet (768px)',
          styles: { width: '768px', height: '1024px' },
          type: 'tablet'
        },
        desktop: {
          name: 'Desktop (1280px)',
          styles: { width: '1280px', height: '800px' },
          type: 'desktop'
        },
        desktopLarge: {
          name: 'Desktop Large (1920px)',
          styles: { width: '1920px', height: '1080px' },
          type: 'desktop'
        }
      },
      defaultViewport: 'desktop'
    },

    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f8fafc' },
        { name: 'dark', value: '#0f172a' },
        { name: 'white', value: '#ffffff' }
      ]
    }
  },
};

export default preview;
