import React from 'react';
import { Database, Layers } from 'lucide-react';
import LruListVisualizer from './LruListVisualizer';
import MerkleTreeVisualizer from './MerkleTreeVisualizer';
import { getNodeStyle } from '../utils/constants';

export default function NodeInspectorModal({
  inspectingNodeId,
  setInspectingNodeId,
  inspectedNodeData,
  inspectedMerkleTree
}) {
  if (!inspectingNodeId) return null;

  return (
    <div className="modal-overlay" onClick={() => setInspectingNodeId(null)}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div className="modal-title-area">
            <span 
              className="modal-node-dot" 
              style={{ backgroundColor: getNodeStyle(inspectingNodeId).hex }} 
            />
            <div>
              <h3 className="modal-title">Cache Node Internals: {inspectingNodeId}</h3>
              <span className="modal-subtitle">
                PORT 500{inspectingNodeId.charAt(4)} • Active Cache size: {inspectedNodeData.entries.length} items
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={() => setInspectingNodeId(null)}>
            ✕ Close
          </button>
        </header>
        
        <div className="modal-body">
          <div className="modal-section">
            <div className="modal-section-title">
              <Database className="h-4 w-4" style={{ color: '#ef4444' }} />
              LRU Eviction Queue (Doubly Linked List)
            </div>
            {inspectedNodeData.loading ? (
              <div style={{ color: '#64748b', fontStyle: 'italic', padding: '10px' }}>Loading eviction queue...</div>
            ) : inspectedNodeData.error ? (
              <div style={{ color: '#f87171', padding: '10px' }}>Error: {inspectedNodeData.error}</div>
            ) : (
              <LruListVisualizer 
                lruOrder={inspectedNodeData.lruOrder} 
                entries={inspectedNodeData.entries} 
              />
            )}
          </div>
          
          <div className="modal-section" style={{ minHeight: '300px' }}>
            <div className="modal-section-title">
              <Layers className="h-4 w-4" style={{ color: '#10b981' }} />
              Active Anti-Entropy Merkle Tree (Binary Graph)
            </div>
            {inspectedMerkleTree.loading ? (
              <div style={{ color: '#64748b', fontStyle: 'italic', padding: '10px' }}>Loading Merkle tree...</div>
            ) : inspectedMerkleTree.error ? (
              <div style={{ color: '#f87171', padding: '10px' }}>Error: {inspectedMerkleTree.error}</div>
            ) : (
              <div className="merkle-canvas-container">
                <MerkleTreeVisualizer root={inspectedMerkleTree.root} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
