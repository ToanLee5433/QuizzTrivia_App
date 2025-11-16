import type { Meta, StoryObj } from '@storybook/react-vite';
import { QuizTag } from './QuizTag';

/**
 * QuizTag is used to display categories, tags, difficulty badges, and featured labels.
 * It supports multiple variants with different styling.
 */
const meta = {
  title: 'Quiz/QuizTag',
  component: QuizTag,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Text content of the tag'
    },
    variant: {
      control: 'select',
      options: ['category', 'tag', 'badge', 'difficulty'],
      description: 'Visual style variant'
    },
    colorClass: {
      control: 'text',
      description: 'Custom Tailwind color classes'
    }
  },
} satisfies Meta<typeof QuizTag>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default tag style
 */
export const Default: Story = {
  args: {
    label: 'javascript',
    variant: 'tag',
  },
};

/**
 * Category tag (used on quiz covers)
 */
export const Category: Story = {
  args: {
    label: 'Programming',
    variant: 'category',
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};

/**
 * Featured badge (highlighted)
 */
export const FeaturedBadge: Story = {
  args: {
    label: 'Featured',
    variant: 'badge',
  },
};

/**
 * Difficulty tag
 */
export const DifficultyEasy: Story = {
  args: {
    label: 'Easy',
    variant: 'difficulty',
    colorClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
  },
};

/**
 * Difficulty Medium
 */
export const DifficultyMedium: Story = {
  args: {
    label: 'Medium',
    variant: 'difficulty',
    colorClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
  },
};

/**
 * Difficulty Hard
 */
export const DifficultyHard: Story = {
  args: {
    label: 'Hard',
    variant: 'difficulty',
    colorClass: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800',
  },
};

/**
 * Long text edge case
 */
export const LongText: Story = {
  args: {
    label: 'Advanced JavaScript Programming',
    variant: 'tag',
  },
};

/**
 * Multiple tags in group
 */
export const TagGroup: Story = {
  args: {
    label: 'programming',
    variant: 'tag'
  },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <QuizTag label="programming" variant="tag" />
      <QuizTag label="javascript" variant="tag" />
      <QuizTag label="react" variant="tag" />
      <QuizTag label="typescript" variant="tag" />
    </div>
  ),
};

/**
 * Mobile view
 */
export const Mobile: Story = {
  args: {
    label: 'Programming',
    variant: 'category',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
    backgrounds: { default: 'dark' },
  },
};
