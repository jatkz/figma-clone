/**
 * AI Service Test Utility
 * Used for testing OpenAI integration during development
 */

import { testAIConnectivity, processAICommand, getRateLimitStatus } from '../services/aiService';
import { initializeAICanvasState, cleanupAICanvasState } from '../services/aiCanvasService';
import { AI_COMMAND_EXAMPLES, getRandomExample, testExampleCategories } from '../examples/aiCommandExamples';

/**
 * Test suite for AI service functionality
 */
export const runAITests = async (userId = 'test-user') => {
  console.log('🤖 Starting AI Service Tests...\n');
  
  // Initialize AI canvas state for testing
  initializeAICanvasState();

  // Test 1: Connectivity
  console.log('1. Testing AI Connectivity...');
  try {
    const connectivityResult = await testAIConnectivity();
    if (connectivityResult.success) {
      console.log('✅ AI Connectivity: PASSED');
      console.log(`   Model: ${connectivityResult.details?.model}`);
      console.log(`   Response Time: ${connectivityResult.details?.responseTime}ms`);
    } else {
      console.log('❌ AI Connectivity: FAILED');
      console.log(`   Error: ${connectivityResult.message}`);
    }
  } catch (error) {
    console.log('❌ AI Connectivity: ERROR');
    console.error('   ', error);
  }

  console.log('\n2. Testing Basic Commands...');

  // Test 2: Basic Command Processing
  const testCommands = [
    'Hello, can you help me with the canvas?',
    'Create a blue rectangle in the center',
    'What can you do?',
    'Get the current canvas state',
  ];

  for (const command of testCommands) {
    try {
      console.log(`\n   Testing: "${command}"`);
      const result = await processAICommand(command, userId);
      
      if (result.success) {
        console.log('   ✅ Response received');
        console.log(`   📝 Message: ${result.message?.substring(0, 150)}...`);
        console.log(`   ⏱️  Response Time: ${result.metadata?.responseTime}ms`);
        console.log(`   🎯 Tokens Used: ${result.metadata?.tokensUsed || 'N/A'}`);
        
        if (result.functionCalls && result.functionCalls.length > 0) {
          console.log(`   🔧 Function Calls: ${result.functionCalls.length}`);
          result.functionCalls.forEach((call, i) => {
            console.log(`      ${i + 1}. ${call.name}(${JSON.stringify(call.arguments)})`);
          });
        }
        
        if (result.executionResults && result.executionResults.length > 0) {
          console.log(`   📋 Execution Results:`);
          result.executionResults.forEach((exec, i) => {
            const status = exec.success ? '✅' : '❌';
            console.log(`      ${i + 1}. ${status} ${exec.message}`);
          });
        }
      } else {
        console.log('   ❌ Command failed');
        console.log(`   Error: ${result.error}`);
      }
    } catch (error) {
      console.log('   ❌ Command error');
      console.error('   ', error);
    }
  }

  // Test 3: Rate Limiting
  console.log('\n3. Testing Rate Limiting...');
  const rateLimitStatus = getRateLimitStatus();
  console.log(`   Requests Used: ${rateLimitStatus.requestsUsed}`);
  console.log(`   Requests Remaining: ${rateLimitStatus.requestsRemaining}`);
  console.log(`   Reset Time: ${new Date(rateLimitStatus.resetTime).toLocaleTimeString()}`);

  console.log('\n🤖 AI Service Tests Complete!\n');
  
  // Cleanup
  cleanupAICanvasState();
};

/**
 * Quick connectivity test for development
 */
export const quickAITest = async (): Promise<boolean> => {
  try {
    const result = await testAIConnectivity();
    if (result.success) {
      console.log('🤖 AI Service: Connected and ready!');
      return true;
    } else {
      console.warn('⚠️ AI Service: Connection failed -', result.message);
      return false;
    }
  } catch (error) {
    console.error('❌ AI Service: Error during quick test -', error);
    return false;
  }
};

// Export for console testing
if (import.meta.env.DEV) {
  (window as any).aiTest = {
    runTests: runAITests,
    quick: quickAITest,
    connectivity: testAIConnectivity,
    command: (msg: string, userId = 'test-user') => processAICommand(msg, userId),
    rateLimit: getRateLimitStatus,
    initCanvas: initializeAICanvasState,
    cleanupCanvas: cleanupAICanvasState,
    examples: AI_COMMAND_EXAMPLES,
    randomExample: getRandomExample,
    showExamples: testExampleCategories,
  };
  
  console.log('🛠️ AI Test utilities available at window.aiTest');
  console.log('🎨 Try: window.aiTest.command("Create a blue rectangle in the center")');
  console.log('📚 Examples: window.aiTest.showExamples()');
  console.log('🎲 Random: window.aiTest.command(window.aiTest.randomExample("create"))');
}
