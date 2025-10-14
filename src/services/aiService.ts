import OpenAI from 'openai';

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

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

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
 * Basic chat completion function
 * Processes natural language input and returns AI response
 */
export const processAICommand = async (
  message: string,
  conversationHistory: ChatMessage[] = []
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
      
You can help users create, modify, and arrange shapes on a canvas that is shared with other users in real-time.

Currently supported operations:
- Creating shapes (rectangles)
- Moving and resizing objects
- Changing colors and properties
- Arranging and aligning objects

Respond in a helpful and conversational manner. If a user asks for something you cannot do yet, explain what you can help with instead.

For now, just provide conversational responses. Function calling capabilities will be added in the next phase.`,
    };

    // Prepare messages
    const messages: ChatMessage[] = [
      systemMessage,
      ...conversationHistory,
      { role: 'user', content: message },
    ];

    // Make API call
    const response = await client.chat.completions.create({
      model: AI_CONFIG.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      max_tokens: AI_CONFIG.maxTokens,
      temperature: AI_CONFIG.temperature,
      // Note: Function calling will be added in Phase 7.2
    });

    const responseTime = Date.now() - startTime;
    const aiMessage = response.choices[0]?.message?.content;

    if (!aiMessage) {
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
      message: aiMessage,
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
export const testAIConnectivity = async (): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  try {
    const response = await processAICommand(
      'Hello! Can you confirm that you are working correctly?'
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
