import type { Meta, StoryObj } from '@storybook/react-vite';
import { QuizActionsPanel } from './QuizActionsPanel';

const action = (name: string) => () => console.log(`${name}`);

const meta = {
  title: 'Quiz/QuizActionsPanel',
  component: QuizActionsPanel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    isLocked: {
      control: 'boolean',
      description: 'Whether the quiz is password protected'
    },
    disableFlashcards: {
      control: 'boolean',
      description: 'Disable flashcards button'
    },
    disableSettings: {
      control: 'boolean',
      description: 'Disable settings button'
    },
  },
} satisfies Meta<typeof QuizActionsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default unlocked state
 */
export const Default: Story = {
  args: {
    isLocked: false,
    onStart: action('start-clicked'),
    onFlashcards: action('flashcards-clicked'),
    onSettings: action('settings-clicked'),
    disableFlashcards: false,
    disableSettings: false,
  },
};

/**
 * Locked state (password protected)
 */
export const Locked: Story = {
  args: {
    isLocked: true,
    onStart: action('unlock-clicked'),
    onFlashcards: action('flashcards-clicked'),
    onSettings: action('settings-clicked'),
    disableFlashcards: false,
    disableSettings: false,
  },
};

/**
 * Locked with buttons disabled
 */
export const LockedDisabled: Story = {
  args: {
    isLocked: true,
    onStart: action('unlock-clicked'),
    onFlashcards: action('flashcards-clicked'),
    onSettings: action('settings-clicked'),
    disableFlashcards: true,
    disableSettings: true,
  },
};

/**
 * Mobile view
 */
export const Mobile: Story = {
  args: {
    ...Default.args,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },
  decorators: [
    (Story) => (
      <div className="w-full px-4">
        <Story />
      </div>
    ),
  ],
};

/**
 * Dark mode
 */
export const DarkMode: Story = {
  args: {
    ...Default.args,
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};

/**
 * Dark mode locked
 */
export const DarkModeLocked: Story = {
  args: {
    ...Locked.args,
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};
