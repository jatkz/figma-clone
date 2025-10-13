import React, { useState, useEffect } from 'react';
import { 
  initializeCanvas, 
  subscribeToObjects, 
  createObject, 
  updateObject, 
  deleteObject,
  healthCheck
} from '../services/canvasService';
import type { CanvasObject } from '../types/canvas';
import { useAuth } from '../hooks/useAuth';
import { createRectangle } from '../utils/objectFactory';

const FirestoreTest: React.FC = () => {
  const { user } = useAuth();
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
    console.log(message);
  };

  // Test health check on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const healthy = await healthCheck();
        setIsConnected(healthy);
        addLog(`🔍 Health Check: ${healthy ? 'Connected' : 'Failed'}`);
      } catch (error) {
        setIsConnected(false);
        addLog(`❌ Health Check Error: ${error}`);
      }
    };
    checkHealth();
  }, []);

  // Subscribe to objects on mount
  useEffect(() => {
    if (!user?.id) return;

    addLog('📡 Setting up objects subscription...');
    const unsubscribe = subscribeToObjects((newObjects) => {
      setObjects(newObjects);
      addLog(`📦 Received ${newObjects.length} objects from Firestore`);
    });

    return () => {
      addLog('🔌 Unsubscribing from objects...');
      unsubscribe();
    };
  }, [user?.id]);

  const handleInitializeCanvas = async () => {
    try {
      addLog('🚀 Initializing canvas...');
      await initializeCanvas();
      addLog('✅ Canvas initialized successfully');
    } catch (error) {
      addLog(`❌ Initialize failed: ${error}`);
    }
  };

  const handleCreateTestObject = async () => {
    if (!user?.id) {
      addLog('❌ Cannot create object: user not authenticated');
      return;
    }

    try {
      addLog('✨ Creating test object...');
      
      // Create a random rectangle
      const x = Math.floor(Math.random() * 1000);
      const y = Math.floor(Math.random() * 1000);
      const objectData = createRectangle(x, y, user.id);
      
      const createdObject = await createObject(objectData);
      addLog(`✅ Object created with ID: ${createdObject.id}`);
    } catch (error) {
      addLog(`❌ Create failed: ${error}`);
    }
  };

  const handleUpdateFirstObject = async () => {
    if (objects.length === 0) {
      addLog('❌ No objects to update');
      return;
    }

    if (!user?.id) {
      addLog('❌ Cannot update object: user not authenticated');
      return;
    }

    try {
      const firstObject = objects[0];
      addLog(`🔄 Updating object ${firstObject.id}...`);
      
      const updates = {
        x: Math.floor(Math.random() * 1000),
        y: Math.floor(Math.random() * 1000),
        modifiedBy: user.id
      };
      
      await updateObject(firstObject.id, updates);
      addLog(`✅ Object updated successfully`);
    } catch (error) {
      addLog(`❌ Update failed: ${error}`);
    }
  };

  const handleDeleteFirstObject = async () => {
    if (objects.length === 0) {
      addLog('❌ No objects to delete');
      return;
    }

    try {
      const firstObject = objects[0];
      addLog(`🗑️ Deleting object ${firstObject.id}...`);
      
      await deleteObject(firstObject.id);
      addLog(`✅ Object deleted successfully`);
    } catch (error) {
      addLog(`❌ Delete failed: ${error}`);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🔥 Firestore Service Testing
        </h2>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            isConnected === true ? 'bg-green-500' : 
            isConnected === false ? 'bg-red-500' : 'bg-yellow-500'
          }`}></div>
          <span className="text-sm text-gray-600">
            Connection: {
              isConnected === true ? 'Connected' :
              isConnected === false ? 'Failed' : 'Checking...'
            }
          </span>
          <span className="mx-2">•</span>
          <span className="text-sm text-gray-600">
            User: {user?.displayName || 'Not authenticated'}
          </span>
          <span className="mx-2">•</span>
          <span className="text-sm text-gray-600">
            Objects: {objects.length}
          </span>
        </div>
      </div>

      {/* Test Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <button
          onClick={handleInitializeCanvas}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          🚀 Initialize Canvas
        </button>
        
        <button
          onClick={handleCreateTestObject}
          disabled={!user?.id}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
        >
          ✨ Create Object
        </button>
        
        <button
          onClick={handleUpdateFirstObject}
          disabled={objects.length === 0 || !user?.id}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
        >
          🔄 Update First
        </button>
        
        <button
          onClick={handleDeleteFirstObject}
          disabled={objects.length === 0}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
        >
          🗑️ Delete First
        </button>
        
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
        >
          🔄 Refresh Page
        </button>
        
        <button
          onClick={handleClearLogs}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
        >
          🧹 Clear Logs
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Objects Display */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            📦 Objects ({objects.length})
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto">
            {objects.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No objects yet</p>
            ) : (
              <div className="space-y-2">
                {objects.map((obj, index) => (
                  <div key={obj.id} className="bg-white p-3 rounded border text-xs">
                    <div className="font-medium text-gray-900">#{index + 1} {obj.id}</div>
                    <div className="text-gray-600">
                      Position: ({obj.x}, {obj.y}) • Size: {obj.width}×{obj.height}
                    </div>
                    <div className="text-gray-600">
                      Color: <span className="inline-block w-3 h-3 rounded" style={{backgroundColor: obj.color}}></span> {obj.color}
                    </div>
                    <div className="text-gray-600">Version: {obj.version}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Logs Display */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            📝 Activity Log
          </h3>
          <div className="bg-gray-900 text-green-400 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No activity yet</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">🧪 Testing Instructions:</h4>
        <ol className="text-sm text-blue-800 space-y-1">
          <li>1. Click "Initialize Canvas" to set up the Firestore document</li>
          <li>2. Click "Create Object" to add test rectangles</li>
          <li>3. Click "Update First" to modify the first object</li>
          <li>4. Click "Delete First" to remove the first object</li>
          <li>5. Open multiple tabs to see real-time sync in action!</li>
        </ol>
      </div>
    </div>
  );
};

export default FirestoreTest;
