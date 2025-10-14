/**
 * AI Canvas Agent - Command Examples
 * 
 * This file contains examples of natural language commands that the AI agent can execute.
 * Use these examples to test the function calling capabilities.
 */

export const AI_COMMAND_EXAMPLES = {
  // ============================================================================
  // CREATE COMMANDS
  // ============================================================================
  create: [
    'Create a blue rectangle in the center',
    'Make a red square at position 100, 200',
    'Add a green rectangle that is 200x150 pixels',
    'Create a small yellow rectangle in the top left corner',
    'Make a large purple rectangle at the bottom right',
    'Create a orange circle in the center', // Will create a square for now
    'Add text that says "Hello World" at position 500, 300', // Will create a rectangle for now
  ],

  // ============================================================================
  // MOVE COMMANDS
  // ============================================================================
  move: [
    'Move the blue rectangle to the top left',
    'Put the red shape in the center',
    'Move the rectangle to position 1000, 1500',
    'Drag the blue one to the bottom',
    'Relocate the circle to coordinates 800, 600',
  ],

  // ============================================================================
  // RESIZE COMMANDS
  // ============================================================================
  resize: [
    'Make the blue rectangle twice as big',
    'Resize the red shape to 300x200',
    'Make the rectangle smaller - 50x50',
    'Expand the circle to be 400 pixels wide',
    'Change the size of the blue one to 150x100',
  ],

  // ============================================================================
  // ROTATE COMMANDS
  // ============================================================================
  rotate: [
    'Rotate the blue rectangle 45 degrees',
    'Turn the red shape 90 degrees',
    'Rotate the rectangle by 180 degrees',
    'Spin the circle 30 degrees clockwise',
  ],

  // ============================================================================
  // DELETE COMMANDS
  // ============================================================================
  delete: [
    'Delete the blue rectangle',
    'Remove the red shape',
    'Delete the circle',
    'Remove all rectangles', // Will only remove the first match
  ],

  // ============================================================================
  // ARRANGE COMMANDS
  // ============================================================================
  arrange: [
    'Arrange all shapes in a horizontal row',
    'Put the rectangles in a vertical line',
    'Create a 3x3 grid with all the shapes',
    'Center all the objects',
    'Align the shapes to the left',
    'Distribute the rectangles evenly horizontally',
    'Make a circle pattern with the shapes',
  ],

  // ============================================================================
  // COMPLEX COMMANDS
  // ============================================================================
  complex: [
    'Create a login form with username and password fields',
    'Make a navigation bar with 4 menu items',
    'Build a card layout with title and description',
    'Create a dashboard with 6 widget boxes arranged in a 2x3 grid',
    'Make a simple calculator layout',
  ],

  // ============================================================================
  // ANALYSIS COMMANDS
  // ============================================================================
  analysis: [
    'What\'s on the canvas?',
    'Show me the current canvas state',
    'How many objects are there?',
    'List all the shapes',
    'What colors are being used?',
  ],

  // ============================================================================
  // CONVERSATIONAL COMMANDS
  // ============================================================================
  conversational: [
    'Can you help me design a simple website layout?',
    'I want to create a mobile app mockup',
    'Show me what you can do',
    'What shapes can you create?',
    'How do I arrange things in a grid?',
  ],
};

/**
 * Get a random command example from a specific category
 */
export const getRandomExample = (category: keyof typeof AI_COMMAND_EXAMPLES): string => {
  const examples = AI_COMMAND_EXAMPLES[category];
  return examples[Math.floor(Math.random() * examples.length)];
};

/**
 * Get all command examples as a flat array
 */
export const getAllExamples = (): string[] => {
  return Object.values(AI_COMMAND_EXAMPLES).flat();
};

/**
 * Test function to try all example categories
 */
export const testExampleCategories = () => {
  console.log('🎨 AI Canvas Agent - Command Examples:\n');
  
  Object.entries(AI_COMMAND_EXAMPLES).forEach(([category, examples]) => {
    console.log(`📂 ${category.toUpperCase()}:`);
    examples.forEach((example, index) => {
      console.log(`   ${index + 1}. "${example}"`);
    });
    console.log('');
  });
  
  console.log(`Total examples: ${getAllExamples().length}`);
};
