import type { Meta, StoryObj } from '@storybook/react-vite';
import { QuizStatsCard } from './QuizStatsCard';
import { Clock, Target, Users, Trophy } from 'lucide-react';

/**
 * QuizStatsCard displays quiz statistics in a compact card format.
 * Used in the Quiz Preview page to show key metrics like duration, questions, difficulty, and players.
 */
const meta = {
  title: 'Quiz/QuizStatsCard',
  component: QuizStatsCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    icon: {
      control: false,
      description: 'Lucide icon component'
    },
    value: {
      control: 'text',
      description: 'The main value to display'
    },
    label: {
      control: 'text',
      description: 'The label text below the value'
    },
    iconColor: {
      control: 'text',
      description: 'Tailwind color class for the icon'
    },
    borderColor: {
      control: 'text',
      description: 'Tailwind border color class'
    },
    emoji: {
      control: 'text',
      description: 'Optional emoji instead of icon'
    }
  },
} satisfies Meta<typeof QuizStatsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state showing duration in minutes
 */
export const Duration: Story = {
  args: {
    icon: Clock,
    value: 15,
    label: 'minutes',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
};

/**
 * Shows number of questions
 */
export const Questions: Story = {
  args: {
    icon: Target,
    value: 5,
    label: 'questions',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
};

/**
 * Shows difficulty with emoji
 */
export const Difficulty: Story = {
  args: {
    emoji: '😊',
    value: 'Easy',
    label: 'Difficulty',
    borderColor: 'border-2 border-emerald-200 dark:border-emerald-800',
  },
};

/**
 * Shows player count
 */
export const Players: Story = {
  args: {
    icon: Users,
    value: 0,
    label: 'players',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
};

/**
 * Large number formatting (10k+ players)
 */
export const ManyPlayers: Story = {
  args: {
    icon: Users,
    value: '12,450',
    label: 'players',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
};

/**
 * Long label text edge case
 */
export const LongLabel: Story = {
  args: {
    icon: Trophy,
    value: 98.5,
    label: 'average completion rate',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
};

/**
 * Very large number
 */
export const LargeValue: Story = {
  args: {
    icon: Target,
    value: '1,234,567',
    label: 'attempts',
    iconColor: 'text-red-600 dark:text-red-400',
  },
};

/**
 * Mobile view (375px)
 */
export const Mobile: Story = {
  args: {
    icon: Clock,
    value: 15,
    label: 'minutes',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },
};

/**
 * Dark mode
 */
export const DarkMode: Story = {
  args: {
    icon: Target,
    value: 25,
    label: 'questions',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};
