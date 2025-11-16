import type { Meta, StoryObj } from '@storybook/react-vite';
import { QuestionPreviewItem } from './QuestionPreviewItem';

const meta = {
  title: 'Quiz/QuestionPreviewItem',
  component: QuestionPreviewItem,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof QuestionPreviewItem>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default multiple choice question
 */
export const Default: Story = {
  args: {
    questionNumber: 1,
    title: 'What is the output of console.log(typeof null)?',
    type: 'multiple',
    difficulty: 'easy',
    points: 10,
    answers: [
      { id: '1', text: '"object"', isCorrect: true },
      { id: '2', text: '"null"', isCorrect: false },
      { id: '3', text: '"undefined"', isCorrect: false },
      { id: '4', text: '"number"', isCorrect: false },
    ],
    explanation: 'In JavaScript, null is considered a primitive value, but typeof null returns "object" due to a historical bug.',
  },
};

/**
 * Expanded by default
 */
export const Expanded: Story = {
  args: {
    ...Default.args,
    defaultExpanded: true,
  },
};

/**
 * True/False question
 */
export const TrueFalse: Story = {
  args: {
    questionNumber: 2,
    title: 'React Hooks can only be used in functional components.',
    type: 'boolean',
    difficulty: 'easy',
    points: 5,
    answers: [
      { id: '1', text: 'True', isCorrect: true },
      { id: '2', text: 'False', isCorrect: false },
    ],
  },
};

/**
 * Hard difficulty question
 */
export const HardQuestion: Story = {
  args: {
    questionNumber: 5,
    title: 'Explain the concept of closure in JavaScript and provide an example.',
    type: 'short_answer',
    difficulty: 'hard',
    points: 20,
    explanation: 'A closure is created when a function is defined inside another function, allowing the inner function to access variables from the outer function even after the outer function has finished executing.',
  },
};

/**
 * Question with no answers
 */
export const NoAnswers: Story = {
  args: {
    questionNumber: 3,
    title: 'Write a function to reverse a string in JavaScript.',
    type: 'short_answer',
    difficulty: 'medium',
    points: 15,
    answers: [],
  },
};

/**
 * Long question title
 */
export const LongTitle: Story = {
  args: {
    questionNumber: 10,
    title: 'Given an array of integers, write a function that returns the indices of two numbers that add up to a specific target. Assume that each input would have exactly one solution, and you may not use the same element twice.',
    type: 'multiple',
    difficulty: 'hard',
    points: 25,
    answers: [
      { id: '1', text: 'Use a hash map to store complements', isCorrect: true },
      { id: '2', text: 'Use nested loops', isCorrect: false },
      { id: '3', text: 'Sort the array first', isCorrect: false },
    ],
    explanation: 'Using a hash map provides O(n) time complexity, which is more efficient than nested loops O(n²).',
  },
};

/**
 * Question with long answers
 */
export const LongAnswers: Story = {
  args: {
    questionNumber: 7,
    title: 'Which of the following best describes the Virtual DOM?',
    type: 'multiple',
    difficulty: 'medium',
    points: 15,
    answers: [
      { 
        id: '1', 
        text: 'A lightweight copy of the actual DOM kept in memory, which React uses to calculate the minimal number of changes needed to update the real DOM efficiently.', 
        isCorrect: true 
      },
      { 
        id: '2', 
        text: 'A debugging tool that allows developers to inspect and modify DOM elements in the browser.', 
        isCorrect: false 
      },
      { 
        id: '3', 
        text: 'A server-side rendering technique that generates HTML before sending it to the client.', 
        isCorrect: false 
      },
    ],
    defaultExpanded: true,
  },
};

/**
 * Mobile view
 */
export const Mobile: Story = {
  args: {
    ...Default.args,
    defaultExpanded: true,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },
};

/**
 * Multiple questions in a list
 */
export const QuestionList: Story = {
  args: {
    questionNumber: 1,
    title: 'Sample Question',
    type: 'Multiple Choice',
    difficulty: 'medium' as const,
    points: 10
  },
  render: () => (
    <div className="space-y-4">
      <QuestionPreviewItem
        questionNumber={1}
        title="What is JSX?"
        type="multiple"
        difficulty="easy"
        points={10}
        answers={[
          { id: '1', text: 'JavaScript XML', isCorrect: true },
          { id: '2', text: 'Java Syntax Extension', isCorrect: false },
        ]}
      />
      <QuestionPreviewItem
        questionNumber={2}
        title="Explain useState hook"
        type="short_answer"
        difficulty="medium"
        points={15}
      />
      <QuestionPreviewItem
        questionNumber={3}
        title="What is the time complexity of binary search?"
        type="multiple"
        difficulty="hard"
        points={20}
        answers={[
          { id: '1', text: 'O(log n)', isCorrect: true },
          { id: '2', text: 'O(n)', isCorrect: false },
          { id: '3', text: 'O(n²)', isCorrect: false },
        ]}
      />
    </div>
  ),
};
