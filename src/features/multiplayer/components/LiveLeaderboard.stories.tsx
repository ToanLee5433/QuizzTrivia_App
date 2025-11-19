import type { Meta, StoryObj } from '@storybook/react';
import LiveLeaderboard from './LiveLeaderboard';
// Storybook testing utilities (optional - can be added later)
// import { within, userEvent } from '@storybook/testing-library';
// import { expect } from '@storybook/jest';

const meta: Meta<typeof LiveLeaderboard> = {
  title: 'Multiplayer/LiveLeaderboard',
  component: LiveLeaderboard,
  parameters: {
    layout: 'centered',
    chromatic: {
      viewports: [320, 768, 1200],
      delay: 300,
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Mock leaderboard data (commented out - not needed for stories)
/* 
const mockLeaderboard = [
  {
    userId: 'user1',
    username: 'Alice',
    score: 3500,
    correctAnswers: 5,
    rank: 1,
    streak: 3,
    avatar: 'https://ui-avatars.com/api/?name=Alice&background=random',
  },
  {
    userId: 'user2',
    username: 'Bob',
    score: 3200,
    correctAnswers: 4,
    rank: 2,
    streak: 2,
  },
  {
    userId: 'user3',
    username: 'Charlie',
    score: 2800,
    correctAnswers: 4,
    rank: 3,
    streak: 1,
  },
  {
    userId: 'user4',
    username: 'Diana',
    score: 2500,
    correctAnswers: 3,
    rank: 4,
    streak: 0,
  },
  {
    userId: 'user5',
    username: 'Eve',
    score: 2200,
    correctAnswers: 3,
    rank: 5,
    streak: 1,
  },
];
*/

export const Default: Story = {
  args: {
    roomId: 'test-room',
    currentUserId: 'user3',
    showTop: 5,
    compact: false,
  },
  // Play function commented out - requires @storybook/testing-library
  // Uncomment after: npm install --save-dev @storybook/testing-library @storybook/test
  /*
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Check if top 3 have medals
    expect(canvas.getByText('👑')).toBeInTheDocument();
    expect(canvas.getByText('🥈')).toBeInTheDocument();
    expect(canvas.getByText('🥉')).toBeInTheDocument();

    // Check if current user is highlighted
    const currentUser = canvas.getByText('Charlie');
    expect(currentUser).toHaveClass('highlight');
  },
  */
};

export const CompactMode: Story = {
  args: {
    ...Default.args,
    compact: true,
  },
};

export const MobileView: Story = {
  args: Default.args,
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    chromatic: {
      viewports: [375],
    },
  },
};

export const TabletView: Story = {
  args: Default.args,
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    chromatic: {
      viewports: [768],
    },
  },
};

export const DesktopView: Story = {
  args: Default.args,
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
    chromatic: {
      viewports: [1200],
    },
  },
};

export const WithLongUsernames: Story = {
  args: {
    ...Default.args,
    roomId: 'long-names-room',
  },
};

export const EmptyLeaderboard: Story = {
  args: {
    roomId: 'empty-room',
    currentUserId: 'user1',
    showTop: 5,
    compact: false,
  },
};

export const SinglePlayer: Story = {
  args: {
    roomId: 'single-room',
    currentUserId: 'user1',
    showTop: 5,
    compact: false,
  },
};

export const HighContrastMode: Story = {
  args: Default.args,
  parameters: {
    backgrounds: { default: 'dark' },
    chromatic: {
      modes: {
        'high contrast': {
          contrast: 'more',
        },
      },
    },
  },
};

export const WithAnimations: Story = {
  args: Default.args,
  // Play function commented out - requires @storybook/testing-library
  /*
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Simulate rank change animation
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check if animations completed
    expect(canvas.getByRole('list')).toBeInTheDocument();
  },
  */
};
