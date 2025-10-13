import * as canvasService from '../services/canvasService';
import { createRectangle } from './objectFactory';

/**
 * Development tools for testing Firestore service via browser console
 * Only available in development mode
 */

if (import.meta.env.DEV) {
  // Expose canvas service to global window object for console testing
  (window as any).firestoreTest = {
    // Canvas service functions
    ...canvasService,
    
    // Helper utilities
    createTestRectangle: (x: number = 100, y: number = 100, userId: string = 'test-user') => {
      return createRectangle(x, y, userId);
    },
    
    // Quick test functions
    runBasicTest: async () => {
      console.log('🔥 Starting Firestore basic test...');
      
      try {
        // Health check
        console.log('1. Health check...');
        const healthy = await canvasService.healthCheck();
        console.log(`✅ Health: ${healthy}`);
        
        // Initialize canvas
        console.log('2. Initializing canvas...');
        await canvasService.initializeCanvas();
        console.log('✅ Canvas initialized');
        
        // Create a test object
        console.log('3. Creating test object...');
        const testObject = createRectangle(200, 200, 'console-test');
        const created = await canvasService.createObject(testObject);
        console.log('✅ Object created:', created);
        
        // Update the object
        console.log('4. Updating object...');
        const updated = await canvasService.updateObject(created.id, {
          x: 300,
          y: 300,
          modifiedBy: 'console-test'
        });
        console.log('✅ Object updated:', updated);
        
        // Clean up - delete the object
        console.log('5. Cleaning up...');
        await canvasService.deleteObject(created.id);
        console.log('✅ Object deleted');
        
        console.log('🎉 Basic test completed successfully!');
        return { success: true, message: 'All tests passed!' };
        
      } catch (error) {
        console.error('❌ Test failed:', error);
        return { success: false, error };
      }
    },
    
    // Listen to objects for 10 seconds
    testSubscription: (duration: number = 10000) => {
      console.log(`📡 Listening to objects for ${duration}ms...`);
      
      const unsubscribe = canvasService.subscribeToObjects((objects) => {
        console.log(`📦 Received ${objects.length} objects:`, objects);
      });
      
      setTimeout(() => {
        unsubscribe();
        console.log('🔌 Subscription ended');
      }, duration);
      
      return unsubscribe;
    }
  };
  
  console.log(`
🔥 Firestore Testing Tools Available!

Open the browser console and try:

📋 Basic Commands:
  firestoreTest.healthCheck()                    - Test connection
  firestoreTest.initializeCanvas()               - Setup canvas document
  firestoreTest.runBasicTest()                   - Run full test suite

📦 Object Operations:
  firestoreTest.createObject(objectData)         - Create new object
  firestoreTest.updateObject(id, updates)        - Update existing object
  firestoreTest.deleteObject(id)                 - Delete object

📡 Real-time:
  firestoreTest.subscribeToObjects(callback)     - Listen to changes
  firestoreTest.testSubscription(10000)          - Listen for 10 seconds

🛠️ Helpers:
  firestoreTest.createTestRectangle(x, y, userId) - Generate test rectangle

Example usage:
  await firestoreTest.runBasicTest()
  firestoreTest.testSubscription(5000)
  `);
}

export {}; // Make this a module
