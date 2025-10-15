import OpenAI from 'openai';
import { AI_TOOLS } from '../types/aiTools';
import { executeAITool, type AIToolCall } from './aiCanvasService';

/**
 * AI Service for Canvas Agent
 * Handles OpenAI GPT-4 integration with function calling for canvas operations
 */

// Configuration
const AI_CONFIG = {
  model: import.meta.env.VITE_AI_MODEL || 'gpt-4',
  maxTokens: parseInt(import.meta.env.VITE_AI_MAX_TOKENS || '1000'),
  temperature: parseFloat(import.meta.env.VITE_AI_TEMPERATURE || '0.1'),
  maxRetries: 3,
  timeout: 30000, // 30 seconds
};

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequestsPerMinute: 20,
  requestWindow: 60 * 1000, // 1 minute in milliseconds
};

// Rate limiting state
interface RateLimitState {
  requests: number[];
  lastReset: number;
}

const rateLimitState: RateLimitState = {
  requests: [],
  lastReset: Date.now(),
};

// Types
export interface AIResponse {
  success: boolean;
  message?: string;
  functionCalls?: AIFunctionCall[];
  executionResults?: AIExecutionResult[];
  error?: string;
  metadata?: {
    model: string;
    tokensUsed?: number;
    responseTime: number;
  };
}

export interface AIFunctionCall {
  name: string;
  arguments: Record<string, any>;
}

export interface AIExecutionResult {
  toolCall: AIFunctionCall;
  result: any;
  success: boolean;
  message: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ProgressUpdate {
  stage: 'thinking' | 'executing';
  current?: number;
  total?: number;
  operation?: string;
}

export type ProgressCallback = (update: ProgressUpdate) => void;

// Initialize OpenAI client
let openaiClient: OpenAI | null = null;

const initializeOpenAI = (): OpenAI => {
  if (!openaiClient) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please set VITE_OPENAI_API_KEY environment variable.');
    }

    openaiClient = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // Note: In production, use a backend proxy
      maxRetries: AI_CONFIG.maxRetries,
      timeout: AI_CONFIG.timeout,
    });
  }
  
  return openaiClient;
};

/**
 * Check and enforce rate limiting
 */
const checkRateLimit = (): boolean => {
  const now = Date.now();
  
  // Reset window if needed
  if (now - rateLimitState.lastReset >= RATE_LIMIT.requestWindow) {
    rateLimitState.requests = [];
    rateLimitState.lastReset = now;
  }
  
  // Remove old requests outside the window
  rateLimitState.requests = rateLimitState.requests.filter(
    timestamp => now - timestamp < RATE_LIMIT.requestWindow
  );
  
  // Check if we're under the limit
  if (rateLimitState.requests.length >= RATE_LIMIT.maxRequestsPerMinute) {
    return false;
  }
  
  // Add current request
  rateLimitState.requests.push(now);
  return true;
};

/**
 * Process AI command with function calling capabilities
 * Handles natural language input and executes canvas operations
 */
export const processAICommand = async (
  message: string,
  userId: string,
  conversationHistory: ChatMessage[] = [],
  onProgress?: ProgressCallback
): Promise<AIResponse> => {
  const startTime = Date.now();
  
  try {
    // Rate limiting check
    if (!checkRateLimit()) {
      return {
        success: false,
        error: 'Rate limit exceeded. Please wait a moment before sending another command.',
        metadata: {
          model: AI_CONFIG.model,
          responseTime: Date.now() - startTime,
        },
      };
    }

    // Validate input
    if (!message || message.trim().length === 0) {
      return {
        success: false,
        error: 'Please provide a command for the AI agent.',
        metadata: {
          model: AI_CONFIG.model,
          responseTime: Date.now() - startTime,
        },
      };
    }

    if (message.length > 1000) {
      return {
        success: false,
        error: 'Command is too long. Please keep it under 1000 characters.',
        metadata: {
          model: AI_CONFIG.model,
          responseTime: Date.now() - startTime,
        },
      };
    }

    // Initialize OpenAI client
    const client = initializeOpenAI();

    // Prepare system message
    const systemMessage: ChatMessage = {
      role: 'system',
      content: `You are an AI assistant that helps users manipulate a collaborative canvas through natural language commands.

You have access to powerful canvas manipulation tools that allow you to:

🎨 CREATE SHAPES:
- Create rectangles, circles, and text objects
- Specify positions, sizes, and colors
- Use "center" for canvas center, or specific coordinates (0-5000)
- Create multiple objects in sequence for complex layouts

🎯 MANIPULATE OBJECTS:
- Move shapes to new positions
- Resize shapes to new dimensions  
- Rotate shapes by degrees
- Delete unwanted shapes

📐 ARRANGE & ORGANIZE:
- Arrange shapes in horizontal, vertical, or grid layouts
- Align shapes (left, right, top, bottom, center)
- Distribute shapes evenly with custom spacing
- Create complex multi-object layouts (forms, navigation bars, cards)

🏗️ COMPLEX UI PATTERNS:
You can create sophisticated UI elements by combining tools:
- **Forms**: Create text fields (text + background rectangle), buttons (rectangle + text label), and arrange them
- **Navigation Bars**: Create background + multiple button elements, arrange horizontally
- **Cards**: Create containers with title text, description, and action buttons
- **Layouts**: Stack elements vertically with proper spacing (30-50px for forms)

🔍 CANVAS ANALYSIS:
- Get current canvas state and object information
- Find shapes by description (e.g., "the blue rectangle", "red circle")

⚡ IMPORTANT GUIDELINES:
1. **Act directly on commands** - When users ask to move, resize, delete, arrange, or manipulate objects, use the appropriate tool immediately. Do NOT check canvas state first.
2. **Object finding is automatic** - You can reference objects by description (e.g., "black rectangle", "red circle", "the rectangles", "all circles"). The system automatically finds matching objects. Trust this and proceed with the action.
3. **Only use getCanvasState when explicitly asked** - Reserve this tool for queries like "what's on the canvas?", "list all shapes", or "show me what we have". Do NOT use it before manipulation commands.
4. **Be action-oriented** - Commands like "move the blue circle" or "arrange the rectangles" should directly call the appropriate tool, not check the canvas first.
5. **Arrangement commands are actions** - "Arrange", "align", "distribute" commands should directly call arrangeShapes. Do NOT check canvas state first.

EXAMPLES - Basic Operations:
✅ User: "Move the black rectangle to the center" → Call moveShape directly
✅ User: "Delete the red circle" → Call deleteShape directly  
✅ User: "Resize the blue square to 200x200" → Call resizeShape directly
✅ User: "Arrange the rectangles in a horizontal row" → Call arrangeShapes directly
✅ User: "Align the circles to the left" → Call arrangeShapes directly
✅ User: "Distribute the shapes evenly" → Call arrangeShapes directly
❌ User: "Move the black rectangle" → Do NOT call getCanvasState first
❌ User: "Arrange the rectangles" → Do NOT call getCanvasState first

EXAMPLES - Complex Multi-Step Operations:
✅ User: "Create a login form" → 
   1. createShape (text "Username")
   2. createShape (rectangle for username input background)
   3. createShape (text "Password")
   4. createShape (rectangle for password input background)
   5. createShape (rectangle for button)
   6. createShape (text "Login" on button)
   7. arrangeShapes (arrange all vertically with 30px spacing)

✅ User: "Create a navigation bar with Home, About, and Contact" →
   1. createShape (large rectangle for navbar background)
   2. createShape (text "Home")
   3. createShape (text "About")
   4. createShape (text "Contact")
   5. arrangeShapes (arrange menu items horizontally)

✅ User: "Create a card layout with title, image, and description" →
   1. createShape (rectangle for card background/border)
   2. createShape (text "Card Title" at top)
   3. createShape (rectangle for image placeholder in middle)
   4. createShape (text "Description text goes here" below image)
   5. createShape (rectangle for action button at bottom)
   6. createShape (text "Learn More" on button)
   7. arrangeShapes (arrange all vertically within card bounds)

Use the available tools to execute operations immediately. Break down complex requests into multiple createShape and arrangeShapes calls.

Be helpful, creative, and proactive. For UI elements, use:
- 40-50px spacing between form sections
- 20-30px spacing between related items
- Light gray (#E0E0E0) for input backgrounds
- Blue (#3498DB) for primary buttons
- Standard button size: 200x50px
- Standard input field: 300x40px`,
    };

    // Prepare messages
    const messages: ChatMessage[] = [
      systemMessage,
      ...conversationHistory,
      { role: 'user', content: message },
    ];

    // Report thinking stage
    onProgress?.({ stage: 'thinking' });

    // Make API call with function calling
    const response = await client.chat.completions.create({
      model: AI_CONFIG.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      max_tokens: AI_CONFIG.maxTokens,
      temperature: AI_CONFIG.temperature,
      tools: AI_TOOLS.map(tool => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      })),
      tool_choice: 'auto', // Let AI decide when to use tools
    });

    const responseTime = Date.now() - startTime;
    const choice = response.choices[0];
    const aiMessage = choice?.message?.content;
    const toolCalls = choice?.message?.tool_calls;

    // Handle function calls if present
    const functionCalls: AIFunctionCall[] = [];
    const executionResults: AIExecutionResult[] = [];

    if (toolCalls && toolCalls.length > 0) {
      console.log(`🤖 AI requested ${toolCalls.length} function calls`);
      
      for (let i = 0; i < toolCalls.length; i++) {
        const toolCall = toolCalls[i];
        
        if (toolCall.type === 'function') {
          // Report execution progress
          onProgress?.({
            stage: 'executing',
            current: i + 1,
            total: toolCalls.length,
            operation: toolCall.function.name,
          });
          
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const aiToolCall: AIToolCall = {
              name: toolCall.function.name,
              arguments: args,
            };
            
            functionCalls.push(aiToolCall);
            
            // Execute the tool
            const result = await executeAITool(aiToolCall, userId);
            
            executionResults.push({
              toolCall: aiToolCall,
              result,
              success: 'success' in result ? result.success : true,
              message: 'message' in result ? result.message : 'Operation completed',
            });
            
          } catch (error: any) {
            console.error(`❌ Function call execution failed:`, error);
            executionResults.push({
              toolCall: {
                name: toolCall.function.name,
                arguments: {},
              },
              result: null,
              success: false,
              message: `Failed to execute ${toolCall.function.name}: ${error.message}`,
            });
          }
        }
      }
    }

    // Generate response message with detailed feedback
    let finalMessage = aiMessage || '';
    
    if (executionResults.length > 0) {
      const successCount = executionResults.filter(r => r.success).length;
      const failureCount = executionResults.length - successCount;
      
      if (successCount > 0 && failureCount === 0) {
        // All operations succeeded
        const operations = executionResults.map(r => r.message).join('\n• ');
        const summary = executionResults.length === 1 
          ? '✅ Operation completed successfully'
          : `✅ All ${executionResults.length} operations completed successfully`;
        
        finalMessage = finalMessage 
          ? `${finalMessage}\n\n${summary}:\n• ${operations}`
          : `${summary}:\n• ${operations}`;
      } else if (failureCount > 0 && successCount > 0) {
        // Partial success - some operations succeeded, some failed
        const successes = executionResults
          .filter(r => r.success)
          .map(r => r.message)
          .join('\n• ');
        const failures = executionResults
          .filter(r => !r.success)
          .map(r => r.message)
          .join('\n• ');
        
        finalMessage = finalMessage
          ? `${finalMessage}\n\n⚠️ Partial success (${successCount}/${executionResults.length} operations completed):\n\n✅ Succeeded:\n• ${successes}\n\n❌ Failed:\n• ${failures}`
          : `⚠️ Partial success (${successCount}/${executionResults.length} operations completed):\n\n✅ Succeeded:\n• ${successes}\n\n❌ Failed:\n• ${failures}`;
      } else {
        // All operations failed
        const failures = executionResults
          .filter(r => !r.success)
          .map(r => r.message)
          .join('\n• ');
        const summary = executionResults.length === 1
          ? '❌ Operation failed'
          : `❌ All ${executionResults.length} operations failed`;
        
        finalMessage = finalMessage
          ? `${finalMessage}\n\n${summary}:\n• ${failures}`
          : `${summary}:\n• ${failures}`;
      }
    }

    if (!finalMessage && !functionCalls.length) {
      return {
        success: false,
        error: 'No response received from AI model.',
        metadata: {
          model: AI_CONFIG.model,
          responseTime,
        },
      };
    }

    return {
      success: true,
      message: finalMessage,
      functionCalls,
      executionResults,
      metadata: {
        model: AI_CONFIG.model,
        tokensUsed: response.usage?.total_tokens,
        responseTime,
      },
    };

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    console.error('AI Service Error:', error);
    
    // Handle specific OpenAI errors
    if (error?.status === 401) {
      return {
        success: false,
        error: 'Invalid API key. Please check your OpenAI configuration.',
        metadata: {
          model: AI_CONFIG.model,
          responseTime,
        },
      };
    }
    
    if (error?.status === 429) {
      return {
        success: false,
        error: 'OpenAI API rate limit exceeded. Please try again later.',
        metadata: {
          model: AI_CONFIG.model,
          responseTime,
        },
      };
    }
    
    if (error?.status === 500) {
      return {
        success: false,
        error: 'OpenAI service is temporarily unavailable. Please try again.',
        metadata: {
          model: AI_CONFIG.model,
          responseTime,
        },
      };
    }

    return {
      success: false,
      error: error?.message || 'An unexpected error occurred while processing your command.',
      metadata: {
        model: AI_CONFIG.model,
        responseTime,
      },
    };
  }
};

/**
 * Test AI connectivity
 * Simple health check function to verify OpenAI integration
 */
export const testAIConnectivity = async (userId = 'test-user'): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  try {
    const response = await processAICommand(
      'Hello! Can you confirm that you are working correctly?',
      userId
    );
    
    if (response.success) {
      return {
        success: true,
        message: 'AI service is connected and working properly.',
        details: {
          model: response.metadata?.model,
          responseTime: response.metadata?.responseTime,
        },
      };
    } else {
      return {
        success: false,
        message: response.error || 'AI connectivity test failed.',
        details: response.metadata,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to connect to AI service.',
      details: {
        error: error.message,
      },
    };
  }
};

/**
 * Get current rate limit status
 */
export const getRateLimitStatus = () => {
  const now = Date.now();
  const recentRequests = rateLimitState.requests.filter(
    timestamp => now - timestamp < RATE_LIMIT.requestWindow
  );
  
  return {
    requestsUsed: recentRequests.length,
    requestsRemaining: RATE_LIMIT.maxRequestsPerMinute - recentRequests.length,
    resetTime: rateLimitState.lastReset + RATE_LIMIT.requestWindow,
  };
};

// Export configuration for debugging
export const getAIConfig = () => AI_CONFIG;
