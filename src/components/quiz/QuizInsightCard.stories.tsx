import type { Meta, StoryObj } from '@storybook/react-vite';
import { QuizInsightCard } from './QuizInsightCard';
import { Eye, Users, Trophy, CheckCircle2, TrendingUp } from 'lucide-react';

const meta = {
  title: 'Quiz/QuizInsightCard',
  component: QuizInsightCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof QuizInsightCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Views metric
 */
export const Views: Story = {
  args: {
    label: 'Views',
    subLabel: 'Total',
    value: '1,234',
    icon: Eye,
    background: 'bg-blue-50 dark:bg-blue-950/30',
    accent: 'text-blue-600 dark:text-blue-400',
  },
};

/**
 * Attempts metric
 */
export const Attempts: Story = {
  args: {
    label: 'Attempts',
    subLabel: 'Retakes allowed',
    value: 567,
    icon: Users,
    background: 'bg-purple-50 dark:bg-purple-950/30',
    accent: 'text-purple-600 dark:text-purple-400',
  },
};

/**
 * Average score metric
 */
export const AvgScore: Story = {
  args: {
    label: 'Avg. Score',
    subLabel: 'Out of 100',
    value: '85.3%',
    icon: Trophy,
    background: 'bg-amber-50 dark:bg-amber-950/30',
    accent: 'text-amber-600 dark:text-amber-400',
  },
};

/**
 * Completion rate
 */
export const Completion: Story = {
  args: {
    label: 'Completion',
    subLabel: 'Success rate',
    value: '92%',
    icon: CheckCircle2,
    background: 'bg-emerald-50 dark:bg-emerald-950/30',
    accent: 'text-emerald-600 dark:text-emerald-400',
  },
};

/**
 * Zero state
 */
export const NoData: Story = {
  args: {
    label: 'Views',
    subLabel: 'No data yet',
    value: 0,
    icon: Eye,
    background: 'bg-slate-50 dark:bg-slate-800/50',
    accent: 'text-slate-400 dark:text-slate-600',
  },
};

/**
 * Large number
 */
export const LargeNumber: Story = {
  args: {
    label: 'Total Plays',
    subLabel: 'All time',
    value: '1,234,567',
    icon: TrendingUp,
    background: 'bg-indigo-50 dark:bg-indigo-950/30',
    accent: 'text-indigo-600 dark:text-indigo-400',
  },
};

/**
 * Mobile view
 */
export const Mobile: Story = {
  args: {
    ...Views.args,
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
 * Grid of insight cards
 */
export const InsightsGrid: Story = {
  args: {
    label: 'Sample',
    subLabel: 'Total',
    value: 0,
    icon: Eye
  },
  render: () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
      <QuizInsightCard
        label="Views"
        subLabel="Total"
        value="1,234"
        icon={Eye}
        background="bg-blue-50 dark:bg-blue-950/30"
        accent="text-blue-600 dark:text-blue-400"
      />
      <QuizInsightCard
        label="Attempts"
        subLabel="Retakes allowed"
        value={567}
        icon={Users}
        background="bg-purple-50 dark:bg-purple-950/30"
        accent="text-purple-600 dark:text-purple-400"
      />
      <QuizInsightCard
        label="Avg. Score"
        subLabel="Out of 100"
        value="85.3%"
        icon={Trophy}
        background="bg-amber-50 dark:bg-amber-950/30"
        accent="text-amber-600 dark:text-amber-400"
      />
      <QuizInsightCard
        label="Completion"
        subLabel="Success rate"
        value="92%"
        icon={CheckCircle2}
        background="bg-emerald-50 dark:bg-emerald-950/30"
        accent="text-emerald-600 dark:text-emerald-400"
      />
    </div>
  ),
};

/**
 * Dark mode
 */
export const DarkMode: Story = {
  args: {
    ...AvgScore.args,
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};
