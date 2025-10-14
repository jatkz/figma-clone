/**
 * AI Service Test Utility
 * Used for testing OpenAI integration during development
 */

import { testAIConnectivity, processAICommand, getRateLimitStatus } from '../services/aiService';

/**
 * Test suite for AI service functionality
 */
export const runAITests = async () => {
  console.log('🤖 Starting AI Service Tests...\n');

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
    'Create a blue rectangle',
    'What can you do?',
  ];

  for (const command of testCommands) {
    try {
      console.log(`\n   Testing: "${command}"`);
      const result = await processAICommand(command);
      
      if (result.success) {
        console.log('   ✅ Response received');
        console.log(`   📝 Message: ${result.message?.substring(0, 100)}...`);
        console.log(`   ⏱️  Response Time: ${result.metadata?.responseTime}ms`);
        console.log(`   🎯 Tokens Used: ${result.metadata?.tokensUsed || 'N/A'}`);
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
    command: processAICommand,
    rateLimit: getRateLimitStatus,
  };
  
  console.log('🛠️ AI Test utilities available at window.aiTest');
}
