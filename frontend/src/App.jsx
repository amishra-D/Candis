import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  Server, 
  Activity, 
  Wifi, 
  WifiOff, 
  Trash2, 
  Plus, 
  Search, 
  RefreshCw, 
  Sliders, 
  ZoomIn, 
  ZoomOut, 
  Move, 
  Terminal, 
  Info, 
  Layers
} from 'lucide-react';

// Color Mapping for Nodes
const NODE_COLORS = {
  node1: { hex: '#a78bfa', name: 'Purple' },
  node2: { hex: '#22d3ee', name: 'Cyan' },
  node3: { hex: '#34d399', name: 'Emerald' },
  node4: { hex: '#f43f5e', name: 'Rose' },
  node5: { hex: '#fbbf24', name: 'Amber' },
};

const DEFAULT_COLOR = { hex: '#94a3b8' };

const getNodeStyle = (nodeId) => NODE_COLORS[nodeId] || DEFAULT_COLOR;

function LruListVisualizer({ lruOrder, entries }) {
  if (!lruOrder || lruOrder.length === 0) {
    return (
      <div style={{ color: '#64748b', fontStyle: 'italic', padding: '20px', textAlign: 'center', width: '100%' }}>
        No items in LRU eviction queue (Cache is empty).
      </div>
    );
  }

  const formatVal = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="lru-list-container">
      {lruOrder.map((key, idx) => {
        const entry = entries.find(e => e.key === key) || {};
        const isHead = idx === 0;
        const isTail = idx === lruOrder.length - 1;

        return (
          <React.Fragment key={key}>
            <div className="lru-node-card">
              <span className="lru-node-key">{key}</span>
              <span className="lru-node-val" title={formatVal(entry.value)}>
                val: {formatVal(entry.value) || 'expired/unknown'}
              </span>
              <span className="lru-node-val" style={{ fontSize: '8px', color: '#64748b' }}>
                hits: {entry.hits || 0}
              </span>
              
              {isHead && <span className="lru-tag mru">Head (MRU)</span>}
              {isTail && <span className="lru-tag lru">Tail (LRU)</span>}
            </div>

            {idx < lruOrder.length - 1 && (
              <div className="lru-arrow">⇄</div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function MerkleTreeVisualizer({ root }) {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  if (!root) {
    return (
      <div style={{ color: '#64748b', fontStyle: 'italic', padding: '20px' }}>
        No Merkle Tree structure available (Cache may be empty).
      </div>
    );
  }

  // Calculate coordinates recursively
  const nodes = [];
  const links = [];

  const getDepth = (node) => {
    if (!node) return 0;
    return 1 + Math.max(getDepth(node.left), getDepth(node.right));
  };

  const maxDepth = getDepth(root);
  const verticalSpacing = 70;
  
  const height = maxDepth * verticalSpacing + 60;
  const width = Math.max(600, Math.pow(2, maxDepth - 1) * 80);

  const traverse = (node, depth, left, right, parentX = null, parentY = null) => {
    if (!node) return;

    const x = (left + right) / 2;
    const y = depth * verticalSpacing + 40;

    nodes.push({
      hash: node.hash,
      key: node.key,
      x,
      y,
      isLeaf: !node.left && !node.right
    });

    if (parentX !== null && parentY !== null) {
      links.push({ x1: parentX, y1: parentY, x2: x, y2: y });
    }

    traverse(node.left, depth + 1, left, x, x, y);
    traverse(node.right, depth + 1, x, right, x, y);
  };

  traverse(root, 0, 0, width);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={width} height={height} style={{ overflow: 'visible', margin: '0 auto', display: 'block' }}>
        {links.map((link, idx) => (
          <line
            key={idx}
            x1={link.x1}
            y1={link.y1}
            x2={link.x2}
            y2={link.y2}
            stroke="rgba(139, 92, 246, 0.3)"
            strokeWidth="1.5"
          />
        ))}

        {nodes.map((node, idx) => {
          const isLeaf = node.isLeaf;
          const nodeColor = isLeaf ? '#10b981' : '#8b5cf6';
          const fill = isLeaf ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.15)';
          
          return (
            <g 
              key={idx} 
              className="merkle-node-g"
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const containerRect = e.currentTarget.ownerSVGElement.parentNode.getBoundingClientRect();
                setHoveredNode(node);
                setMousePos({
                  x: rect.left - containerRect.left + 20,
                  y: rect.top - containerRect.top - 60
                });
              }}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r="16"
                fill={fill}
                stroke={nodeColor}
                strokeWidth="1.5"
                className="merkle-node-circle"
              />
              <text
                x={node.x}
                y={node.y + 4}
                textAnchor="middle"
                fill="#ffffff"
                fontSize="9px"
                fontFamily="monospace"
                fontWeight="bold"
                style={{ pointerEvents: 'none' }}
              >
                {node.hash.substring(0, 4)}
              </text>
              {isLeaf && (
                <text
                  x={node.x}
                  y={node.y + 24}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="8px"
                  fontWeight="bold"
                  style={{ pointerEvents: 'none' }}
                >
                  {node.key}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {hoveredNode && (
        <div 
          className="merkle-tooltip" 
          style={{ 
            left: `${mousePos.x}px`, 
            top: `${mousePos.y}px`,
          }}
        >
          <div className="merkle-tooltip-title">
            {hoveredNode.isLeaf ? 'Leaf Node' : 'Hash Node'}
          </div>
          <div>Hash: <strong style={{ wordBreak: 'break-all' }}>{hoveredNode.hash}</strong></div>
          {hoveredNode.key && <div>Key: <strong style={{ color: '#10b981' }}>{hoveredNode.key}</strong></div>}
        </div>
      )}
    </div>
  );
}

export default function App() {
  // Backend connection state
  const [backendAlive, setBackendAlive] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cluster State
  const [clusterStatus, setClusterStatus] = useState({ activeNodes: [], deadNodes: [], clusterStatus: [] });
  const [ringData, setRingData] = useState({ sortedHashes: [], ring: [], virtualNodesPerNode: 100 });
  const [nodesKeys, setNodesKeys] = useState({}); // nodeId -> Array of entries

  // CRUD Forms State
  const [formKey, setFormKey] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formTtl, setFormTtl] = useState('10000'); // default 10 seconds
  const [getKey, setGetKey] = useState('');
  const [deleteKey, setDeleteKey] = useState('');

  // CRUD Results State
  const [setResult, setSetResult] = useState(null);
  const [getResult, setGetResult] = useState(null);
  const [deleteResult, setDeleteResult] = useState(null);

  // UI States
  const [activeTab, setActiveTab] = useState('crud'); // 'crud' | 'logs' | 'stats'
  const [logs, setLogs] = useState([]);
  
  // Pan and Zoom
  const [pan, setPan] = useState({ x: 30, y: -20 });
  const [zoom, setZoom] = useState(0.85);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  // Animation State
  const [anim, setAnim] = useState({
    active: false,
    type: '', // 'set' | 'get' | 'delete'
    key: '',
    keyHash: null,
    primaryNodeId: null,
    replicaNodeId: null,
    servedByNodeId: null,
    isReplicaRead: false,
    step: 0, 
  });

  // Stateful Positions of components on canvas
  const [positions, setPositions] = useState({
    client: { x: 80, y: 320 },
    coordinator: { x: 350, y: 320 },
    ring: { x: 580, y: 30 },
    node1: { x: 640, y: 410 },
    node2: { x: 910, y: 410 },
    node3: { x: 640, y: 640 },
    node4: { x: 910, y: 640 },
    node5: { x: 775, y: 290 }
  });

  const clientPos = positions.client;
  const coordPos = positions.coordinator;
  const ringCenter = { x: positions.ring.x + 160, y: positions.ring.y + 160 };
  const ringRadius = 100;

  const nodePositions = {
    node1: positions.node1,
    node2: positions.node2,
    node3: positions.node3,
    node4: positions.node4,
    node5: positions.node5
  };

  // Element Dragging State
  const [draggingElementId, setDraggingElementId] = useState(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleDragStart = (e, elementId) => {
    e.stopPropagation();
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('label') || e.target.closest('.switch') || e.target.closest('.slider')) {
      return;
    }
    setDraggingElementId(elementId);
    const canvasX = (e.clientX - pan.x) / zoom;
    const canvasY = (e.clientY - pan.y) / zoom;
    dragOffset.current = {
      x: canvasX - positions[elementId].x,
      y: canvasY - positions[elementId].y
    };
  };

  // Architecture modes, quorum parameters, and partition data states
  const [architectureMode, setArchitectureMode] = useState('ring'); // 'ring' | 'partitions' | 'quorum'
  const [quorumW, setQuorumW] = useState('quorum'); // 'one' | 'quorum' | 'all'
  const [quorumR, setQuorumR] = useState('quorum'); // 'one' | 'quorum' | 'all'
  const [partitionsData, setPartitionsData] = useState([]); // partitions mapping from backend

  // Node Internals Inspector State
  const [inspectingNodeId, setInspectingNodeId] = useState(null);
  const [inspectedNodeData, setInspectedNodeData] = useState({ entries: [], lruOrder: [], loading: false, error: null });
  const [inspectedMerkleTree, setInspectedMerkleTree] = useState({ root: null, leaves: [], rootHash: null, loading: false, error: null });

  const openNodeInspector = async (nodeId) => {
    setInspectingNodeId(nodeId);
    setInspectedNodeData({ entries: [], lruOrder: [], loading: true, error: null });
    setInspectedMerkleTree({ root: null, leaves: [], rootHash: null, loading: true, error: null });
    
    // Fetch node cache data
    try {
      const res = await fetch(`http://localhost:3000/cluster/node-data/${nodeId}`);
      if (res.ok) {
        const data = await res.json();
        setInspectedNodeData({ entries: data.entries || [], lruOrder: data.lruOrder || [], loading: false, error: null });
      } else {
        setInspectedNodeData({ entries: [], lruOrder: [], loading: false, error: 'Failed to load cache entries' });
      }
    } catch (err) {
      setInspectedNodeData({ entries: [], lruOrder: [], loading: false, error: err.message });
    }

    // Fetch node merkle tree
    try {
      const res = await fetch(`http://localhost:3000/cluster/node-merkle-tree/${nodeId}`);
      if (res.ok) {
        const data = await res.json();
        setInspectedMerkleTree({ root: data.root, leaves: data.leaves || [], rootHash: data.rootHash, loading: false, error: null });
      } else {
        setInspectedMerkleTree({ root: null, leaves: [], rootHash: null, loading: false, error: 'Failed to load Merkle tree' });
      }
    } catch (err) {
      setInspectedMerkleTree({ root: null, leaves: [], rootHash: null, loading: false, error: err.message });
    }
  };

  useEffect(() => {
    if (!inspectingNodeId) return;
    const interval = setInterval(() => {
      // Silent refresh of inspected node data
      fetch(`http://localhost:3000/cluster/node-data/${inspectingNodeId}`)
        .then(res => res.json())
        .then(data => {
          setInspectedNodeData(prev => ({ ...prev, entries: data.entries || [], lruOrder: data.lruOrder || [] }));
        }).catch(err => {});
      
      fetch(`http://localhost:3000/cluster/node-merkle-tree/${inspectingNodeId}`)
        .then(res => res.json())
        .then(data => {
          setInspectedMerkleTree(prev => ({ ...prev, root: data.root, leaves: data.leaves || [], rootHash: data.rootHash }));
        }).catch(err => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [inspectingNodeId]);

  // Helper to add logs
  const addLog = (source, message, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [{ time, source, message, type }, ...prev].slice(0, 100));
  };

  // Helper to format values for display
  const formatVal = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
      return JSON.stringify(val);
    }
    return String(val);
  };

  // Fetch all cluster status data
  const fetchData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      // 1. Fetch Cluster Status
      const statusRes = await fetch('http://localhost:3000/cluster/status');
      if (!statusRes.ok) throw new Error('Cannot fetch status');
      const statusData = await statusRes.json();
      setClusterStatus(statusData);
      setBackendAlive(true);

      // 2. Fetch Ring State
      const ringRes = await fetch('http://localhost:3000/cluster/ring');
      if (ringRes.ok) {
        const ringVal = await ringRes.json();
        setRingData(ringVal);
      }

      // 3. Fetch Keys for all known nodes
      const allNodeIds = ['node1', 'node2', 'node3', 'node4', 'node5'];
      const keysTemp = {};
      for (const nid of allNodeIds) {
        try {
          const nodeDataRes = await fetch(`http://localhost:3000/cluster/node-data/${nid}`);
          if (nodeDataRes.ok) {
            const nodeData = await nodeDataRes.json();
            keysTemp[nid] = nodeData.entries || [];
          } else {
            keysTemp[nid] = [];
          }
        } catch {
          keysTemp[nid] = [];
        }
      }
      setNodesKeys(keysTemp);

      // 4. Fetch Modulo Partitions layout mapping
      try {
        const partRes = await fetch('http://localhost:3000/cluster/partitions');
        if (partRes.ok) {
          const partVal = await partRes.json();
          setPartitionsData(partVal.partitions || []);
        }
      } catch (err) {}

    } catch (err) {
      setBackendAlive(false);
    } finally {
      setLoading(false);
    }
  };

  // Initial Fetch & Set Interval
  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => {
      fetchData(false);
    }, 2000);

    // Initial Logs
    addLog('SYSTEM', 'Miro Cluster Dashboard initialized. Connecting to coordination server...', 'system');
    return () => clearInterval(interval);
  }, []);

  // Listen to gossip updates and log them
  const prevStatus = useRef(null);
  useEffect(() => {
    if (!clusterStatus || !clusterStatus.clusterStatus) return;

    if (prevStatus.current) {
      const activeNow = clusterStatus.activeNodes.sort().join(',');
      const activeBefore = prevStatus.current.activeNodes.sort().join(',');
      if (activeNow !== activeBefore) {
        addLog('GOSSIP', `Ring membership updated! Active Nodes: [${clusterStatus.activeNodes.join(', ')}]`, 'warning');
      }

      // Check heartbeats changes
      clusterStatus.clusterStatus.forEach(node => {
        const prevNode = prevStatus.current.clusterStatus.find(n => n.nodeId === node.nodeId);
        if (prevNode) {
          if (node.alive !== prevNode.alive) {
            if (!node.alive) {
              addLog('GOSSIP', `💀 Node ${node.nodeId} is DEAD (3 heartbeats missed) — removed from Consistent Hash Ring`, 'error');
            } else {
              addLog('GOSSIP', `🔄 Node ${node.nodeId} is ONLINE — added back to Consistent Hash Ring`, 'emerald');
            }
          } else if (node.missedBeats > 0 && node.missedBeats !== prevNode.missedBeats) {
            addLog('GOSSIP', `⚠️ Node ${node.nodeId} missed beat ${node.missedBeats}/3`, 'warning');
          }
        }
      });
    }
    prevStatus.current = clusterStatus;
  }, [clusterStatus]);

  // Handle Dragging Canvas (Miro Panning)
  const handleMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.glass-panel')) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (draggingElementId) {
      const canvasX = (e.clientX - pan.x) / zoom;
      const canvasY = (e.clientY - pan.y) / zoom;
      setPositions(prev => ({
        ...prev,
        [draggingElementId]: {
          x: canvasX - dragOffset.current.x,
          y: canvasY - dragOffset.current.y
        }
      }));
      return;
    }
    if (!isDragging.current) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    setDraggingElementId(null);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 1.05;
    let newZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    newZoom = Math.max(0.4, Math.min(2, newZoom));
    setZoom(newZoom);
  };

  // Zoom buttons
  const zoomIn = () => setZoom(z => Math.min(2, z + 0.1));
  const zoomOut = () => setZoom(z => Math.max(0.4, z - 0.1));
  const resetPan = () => {
    setPan({ x: 30, y: -20 });
    setZoom(0.85);
  };

  // Run Request Animation Step Loop
  const runAnimation = (type, key, keyHash, primaryNodeId, replicaNodeId, servedByNodeId, isReplicaRead) => {
    setAnim({
      active: true,
      type,
      key,
      keyHash,
      primaryNodeId,
      replicaNodeId,
      servedByNodeId,
      isReplicaRead,
      step: 0
    });

    // Step 0: Client to Coordinator (400ms)
    setTimeout(() => {
      setAnim(prev => ({ ...prev, step: 1 }));
      // Step 1: Coordinator to Ring (400ms)
      setTimeout(() => {
        setAnim(prev => ({ ...prev, step: 2 }));
        // Step 2: Coordinator to Target Nodes (600ms)
        setTimeout(() => {
          setAnim(prev => ({ ...prev, step: 3 }));
          // Step 3: Highlight state complete (800ms)
          setTimeout(() => {
            setAnim(prev => ({ ...prev, active: false }));
          }, 1200);
        }, 600);
      }, 500);
    }, 400);
  };

  // CRUD API Calls
  const handleSet = async (e) => {
    e.preventDefault();
    if (!formKey) return;
    
    // Clear previous results
    setSetResult(null);
    setGetResult(null);
    setDeleteResult(null);

    // Try parsing value as JSON if it's bracketed, otherwise use string
    let finalValue = formValue;
    try {
      const trimmed = formValue.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        finalValue = JSON.parse(trimmed);
      }
    } catch (e) {
      // Not valid JSON, keep as raw string
    }

    addLog('CLIENT', `Request: SET key="${formKey}" value=${formatVal(finalValue)} TTL=${formTtl}ms`, 'info');
    
    try {
      const res = await fetch('http://localhost:3000/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          key: formKey, 
          value: finalValue, 
          ttl: formTtl ? Number(formTtl) : null,
          w: architectureMode === 'quorum' ? quorumW : 'one'
        })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        addLog('COORDINATOR', `Consistent Hashing: key="${formKey}" hashes to ${data.keyHash}. Primary target: ${data.nodeId}`, 'purple');
        if (data.replicated) {
          addLog('COORDINATOR', `Successor Replication: Replicated key to successor node ${data.replicaNodeId}`, 'emerald');
        } else {
          addLog('COORDINATOR', `Successor Replication: Replica write skipped or failed (Replica: ${data.replicaNodeId})`, 'warning');
        }
        
        setSetResult({
          nodeId: data.nodeId,
          replicaNodeId: data.replicaNodeId,
          replicated: data.replicated,
          keyHash: data.keyHash
        });

        runAnimation('set', formKey, data.keyHash, data.nodeId, data.replicaNodeId, data.nodeId, false);
        fetchData();
        setFormKey('');
        setFormValue('');
      } else {
        addLog('COORDINATOR', `Write Failed: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      addLog('COORDINATOR', `Write Failed: ${err.message}`, 'error');
    }
  };

  const handleGet = async (e) => {
    e.preventDefault();
    if (!getKey) return;

    // Clear previous results
    setSetResult(null);
    setGetResult(null);
    setDeleteResult(null);

    addLog('CLIENT', `Request: GET key="${getKey}"`, 'info');

    try {
      const rParam = architectureMode === 'quorum' ? quorumR : 'one';
      const res = await fetch(`http://localhost:3000/get/${getKey}?r=${rParam}`);
      const data = await res.json();

      if (res.ok) {
        addLog('COORDINATOR', `Consistent Hashing: key="${getKey}" hashes to ${data.keyHash}. Target: ${data.primaryNodeId}`, 'purple');
        if (data.isReplicaRead) {
          addLog('COORDINATOR', `FAILOVER READ: Node ${data.primaryNodeId} is offline! Successfully retrieved key from replica Node ${data.nodeId}`, 'warning');
        } else {
          addLog('COORDINATOR', `Primary Read: Retrieved key value=${formatVal(data.value)} from Node ${data.nodeId}`, 'emerald');
        }
        
        setGetResult({
          value: data.value,
          nodeId: data.nodeId,
          isReplicaRead: data.isReplicaRead,
          success: true
        });

        runAnimation('get', getKey, data.keyHash, data.primaryNodeId, data.isReplicaRead ? data.nodeId : null, data.nodeId, data.isReplicaRead);
        fetchData();
      } else {
        addLog('COORDINATOR', `Key Not Found: ${data.error} (Hashed position: ${data.keyHash})`, 'error');
        setGetResult({
          success: false,
          error: data.error,
          keyHash: data.keyHash
        });
        runAnimation('get', getKey, data.keyHash, data.nodeId, null, null, false);
      }
    } catch (err) {
      addLog('COORDINATOR', `Read Failed: ${err.message}`, 'error');
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!deleteKey) return;

    // Clear previous results
    setSetResult(null);
    setGetResult(null);
    setDeleteResult(null);

    addLog('CLIENT', `Request: DELETE key="${deleteKey}"`, 'info');

    try {
      const res = await fetch(`http://localhost:3000/delete/${deleteKey}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok && data.success) {
        addLog('COORDINATOR', `Consistent Hashing: key="${deleteKey}" hashes to ${data.keyHash}. Deleting from Primary Node ${data.nodeId}`, 'purple');
        addLog('COORDINATOR', `Deletion synced to primary and replica nodes`, 'emerald');
        
        setDeleteResult({
          success: true,
          nodeId: data.nodeId,
          keyHash: data.keyHash
        });

        runAnimation('delete', deleteKey, data.keyHash, data.nodeId, null, data.nodeId, false);
        fetchData();
        setDeleteKey('');
      } else {
        addLog('COORDINATOR', `Deletion Failed: ${data.error}`, 'error');
      }
    } catch (err) {
      addLog('COORDINATOR', `Deletion Failed: ${err.message}`, 'error');
    }
  };

  // Toggle node power (simulation of offline)
  const toggleNodePower = async (nodeId) => {
    addLog('SIMULATION', `Toggling status of ${nodeId}...`, 'system');
    try {
      const res = await fetch('http://localhost:3000/cluster/node/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addLog('SIMULATION', `Node ${nodeId} status changed: isOffline = ${data.isOffline}`, 'system');
        fetchData();
      } else {
        addLog('SIMULATION', `Failed to toggle node: ${data.error}`, 'error');
      }
    } catch (err) {
      addLog('SIMULATION', `Failed to toggle node: ${err.message}`, 'error');
    }
  };

  // Helper to map 32-bit hash value to (x,y) circle coordinates
  const getHashCoords = (hashValue) => {
    const angle = (hashValue / 4294967295) * 2 * Math.PI - Math.PI / 2;
    return {
      x: ringCenter.x + ringRadius * Math.cos(angle),
      y: ringCenter.y + ringRadius * Math.sin(angle),
      angle
    };
  };

  // Compute overall aggregated cluster metrics
  const computeOverallMetrics = () => {
    let hits = 0;
    let misses = 0;
    let writes = 0;
    let evictions = 0;
    let deletes = 0;
    let expiredKeys = 0;
    let totalKeysStored = 0;

    if (clusterStatus && clusterStatus.clusterStatus) {
      clusterStatus.clusterStatus.forEach(node => {
        if (node.alive && node.metrics) {
          hits += node.metrics.hits || 0;
          misses += node.metrics.misses || 0;
          writes += node.metrics.writes || 0;
          evictions += node.metrics.evictions || 0;
          deletes += node.metrics.deletes || 0;
          expiredKeys += node.metrics.expiredKeys || 0;
        }
        totalKeysStored += node.size || 0;
      });
    }

    const totalRequests = hits + misses;
    const hitRate = totalRequests > 0 ? ((hits / totalRequests) * 100).toFixed(1) : '0.0';

    return {
      hits,
      misses,
      writes,
      evictions,
      deletes,
      expiredKeys,
      totalKeysStored,
      hitRate
    };
  };

  const overallMetrics = computeOverallMetrics();
  const animatedKeyPos = anim.active && anim.keyHash ? getHashCoords(anim.keyHash) : null;
  const replicaNodeIds = anim.replicaNodeId ? String(anim.replicaNodeId).split(',').map(s => s.trim()) : [];

  const getPartitionCoords = (partitionId) => {
    const p = Number(partitionId);
    const row = Math.floor(p / 4);
    const col = p % 4;
    return {
      x: positions.ring.x + 20 + col * 70 + 35,
      y: positions.ring.y + 60 + row * 80 + 30
    };
  };

  const resolvedPartitionId = anim.active && anim.keyHash ? (anim.keyHash % 8) : null;
  const partitionCoords = resolvedPartitionId !== null ? getPartitionCoords(resolvedPartitionId) : null;

  return (
    <div className="app-container whiteboard-bg">
      
      {/* LEFT: Dashboard Control Sidebar */}
      <aside className="sidebar">
        <header className="sidebar-header">
          <div className="sidebar-title-area">
            <div className="sidebar-logo">C</div>
            <div>
              <h2>Candis Cluster</h2>
              <p>Distributed Cache Visualizer</p>
            </div>
          </div>
          <div className="conn-status">
            <span className={`status-dot ${backendAlive ? 'active' : 'inactive'}`} />
            {backendAlive ? 'ONLINE' : 'OFFLINE'}
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="tabs">
          <button 
            onClick={() => setActiveTab('crud')}
            className={`tab-btn ${activeTab === 'crud' ? 'active' : ''}`}
          >
            <Sliders className="h-3.5 w-3.5" /> Operations
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          >
            <Terminal className="h-3.5 w-3.5" /> Event Logs
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          >
            <Activity className="h-3.5 w-3.5" /> Cluster Stats
          </button>
        </nav>

        {/* Tab Contents */}
        <div className="sidebar-content">
          
          {/* TAB 1: OPERATIONS */}
          {activeTab === 'crud' && (
            <>
              {/* Quorum Configuration panel */}
              {architectureMode === 'quorum' && (
                <section className="panel-section" style={{ borderColor: 'rgba(139, 92, 246, 0.3)' }}>
                  <div className="section-title purple">
                    <Sliders className="h-4 w-4" /> Quorum Consistency Config
                  </div>
                  <div className="quorum-panel">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Write Quorum (W)</label>
                        <select 
                          value={quorumW} 
                          onChange={e => setQuorumW(e.target.value)}
                          className="input-field purple-field"
                          style={{ background: 'var(--bg-input)' }}
                        >
                          <option value="one">ONE (Fast, weak)</option>
                          <option value="quorum">QUORUM (Majority: 2)</option>
                          <option value="all">ALL (Slow, strong)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Read Quorum (R)</label>
                        <select 
                          value={quorumR} 
                          onChange={e => setQuorumR(e.target.value)}
                          className="input-field cyan-field"
                          style={{ background: 'var(--bg-input)' }}
                        >
                          <option value="one">ONE (Fast, weak)</option>
                          <option value="quorum">QUORUM (Majority: 2)</option>
                          <option value="all">ALL (Slow, strong)</option>
                        </select>
                      </div>
                    </div>

                    {(() => {
                      const wVal = quorumW === 'one' ? 1 : quorumW === 'quorum' ? 2 : 3;
                      const rVal = quorumR === 'one' ? 1 : quorumR === 'quorum' ? 2 : 3;
                      const isStrong = (wVal + rVal) > 3;

                      return (
                        <div style={{ marginTop: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '9px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>W({wVal}) + R({rVal}) &gt; N(3)</span>
                            <span className={`quorum-badge ${isStrong ? 'strong' : 'weak'}`}>
                              {isStrong ? 'STRONG CONSISTENCY' : 'EVENTUAL' }
                            </span>
                          </div>
                          <p style={{ fontSize: '9px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                            {isStrong 
                              ? "✓ Quorums overlap! Readers are guaranteed to query at least one node containing the latest write." 
                              : "⚠ Stale reads possible. Readers may query nodes before writes propagate fully."
                            }
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </section>
              )}

              {/* SET Key Form */}
              <section className="panel-section">
                <div className="section-title purple">
                  <Plus className="h-4 w-4" /> Set Key (Write Path)
                </div>
                <form onSubmit={handleSet} className="section-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>KEY</label>
                      <input 
                        type="text" 
                        value={formKey}
                        onChange={e => setFormKey(e.target.value)}
                        placeholder="e.g. user_1" 
                        className="input-field purple-field"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>VALUE (String or JSON)</label>
                      <input 
                        type="text" 
                        value={formValue}
                        onChange={e => setFormValue(e.target.value)}
                        placeholder='e.g. {"name": "Bob"}' 
                        className="input-field purple-field"
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>TTL (MILLISECONDS)</label>
                    <input 
                      type="number" 
                      value={formTtl}
                      onChange={e => setFormTtl(e.target.value)}
                      placeholder="e.g. 10000" 
                      className="input-field purple-field"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={!backendAlive}
                    className="submit-btn purple"
                  >
                    SET KEY
                  </button>
                </form>
                
                {/* SET Result Badge */}
                {setResult && (
                  <div style={{ padding: '8px 10px', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.15)', borderRadius: '6px', fontSize: '10px' }}>
                    <span style={{ fontWeight: 'bold', color: '#a78bfa', display: 'block', marginBottom: '4px', fontSize: '9px', textTransform: 'uppercase' }}>Write Status</span>
                    <div>Primary Node: <strong>{setResult.nodeId}</strong></div>
                    {setResult.replicated ? (
                      <div style={{ color: '#10b981', marginTop: '2px' }}>✓ Replicated to: <strong>{setResult.replicaNodeId}</strong></div>
                    ) : (
                      <div style={{ color: '#f59e0b', marginTop: '2px' }}>⚠ Replication skipped (No replica node active)</div>
                    )}
                  </div>
                )}
              </section>

              {/* GET Key Form */}
              <section className="panel-section">
                <div className="section-title cyan">
                  <Search className="h-4 w-4" /> Get Key (Read Path)
                </div>
                <form onSubmit={handleGet} className="section-form">
                  <div className="form-group">
                    <label>KEY</label>
                    <input 
                      type="text" 
                      value={getKey}
                      onChange={e => setGetKey(e.target.value)}
                      placeholder="e.g. user_1" 
                      className="input-field cyan-field"
                      required
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={!backendAlive}
                    className="submit-btn cyan"
                  >
                    GET KEY
                  </button>
                </form>

                {/* GET Result Badge */}
                {getResult && (
                  <div style={{ 
                    padding: '8px 10px', 
                    background: getResult.success ? 'rgba(6, 182, 212, 0.08)' : 'rgba(239, 68, 68, 0.08)', 
                    border: getResult.success ? '1px solid rgba(6, 182, 212, 0.15)' : '1px solid rgba(239, 68, 68, 0.15)', 
                    borderRadius: '6px', 
                    fontSize: '10px' 
                  }}>
                    {getResult.success ? (
                      <>
                        <span style={{ fontWeight: 'bold', color: '#22d3ee', display: 'block', marginBottom: '4px', fontSize: '9px', textTransform: 'uppercase' }}>
                          Fetched Value {getResult.isReplicaRead && '(REPLICA READ)'}
                        </span>
                        <pre style={{ 
                          background: 'rgba(0,0,0,0.3)', 
                          padding: '6px', 
                          borderRadius: '4px', 
                          border: '1px solid rgba(255,255,255,0.03)',
                          overflowX: 'auto',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          color: '#cbd5e1',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {typeof getResult.value === 'object' ? JSON.stringify(getResult.value, null, 2) : getResult.value}
                        </pre>
                        <div style={{ color: '#94a3b8', fontSize: '9px', marginTop: '4px' }}>
                          Read Served by: <strong>{getResult.nodeId}</strong>
                        </div>
                      </>
                    ) : (
                      <>
                        <span style={{ fontWeight: 'bold', color: '#f87171', display: 'block', marginBottom: '2px', fontSize: '9px', textTransform: 'uppercase' }}>Not Found</span>
                        <div style={{ color: '#fca5a5' }}>Key does not exist in cluster.</div>
                      </>
                    )}
                  </div>
                )}
              </section>

              {/* DELETE Key Form */}
              <section className="panel-section">
                <div className="section-title rose">
                  <Trash2 className="h-4 w-4" /> Delete Key
                </div>
                <form onSubmit={handleDelete} className="section-form">
                  <div className="form-group">
                    <label>KEY</label>
                    <input 
                      type="text" 
                      value={deleteKey}
                      onChange={e => setDeleteKey(e.target.value)}
                      placeholder="e.g. user_1" 
                      className="input-field rose-field"
                      required
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={!backendAlive}
                    className="submit-btn rose"
                  >
                    DELETE KEY
                  </button>
                </form>

                {/* DELETE Result Badge */}
                {deleteResult && (
                  <div style={{ padding: '8px 10px', background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.15)', borderRadius: '6px', fontSize: '10px' }}>
                    <span style={{ fontWeight: 'bold', color: '#f43f5e', display: 'block', marginBottom: '2px', fontSize: '9px', textTransform: 'uppercase' }}>Deletion Success</span>
                    <div style={{ color: '#fda4af' }}>Removed key from primary node and replica node.</div>
                  </div>
                )}
              </section>
            </>
          )}

          {/* TAB 2: LIVE EVENT LOGS */}
          {activeTab === 'logs' && (
            <div className="logs-panel">
              <div className="logs-header">
                <span>Timestamp & Module</span>
                <span>Event Details</span>
              </div>
              <div className="logs-viewport">
                {logs.length === 0 ? (
                  <p style={{ color: '#475569', fontStyle: 'italic' }}>No events captured yet.</p>
                ) : (
                  logs.map((log, idx) => {
                    let typeClass = 'log-msg';
                    if (log.type === 'error') typeClass = 'log-msg error';
                    if (log.type === 'warning') typeClass = 'log-msg warning';
                    if (log.type === 'emerald') typeClass = 'log-msg emerald';
                    if (log.type === 'purple') typeClass = 'log-msg purple';

                    return (
                      <div key={idx} className="log-item">
                        <span className="log-time">[{log.time}]</span>{' '}
                        <span className="log-source">[{log.source}]</span>{' '}
                        <span className={typeClass}>{log.message}</span>
                      </div>
                    );
                  })
                )}
              </div>
              <button onClick={() => setLogs([])} className="clear-logs-btn">
                Clear Log History
              </button>
            </div>
          )}

          {/* TAB 3: CLUSTER STATS */}
          {activeTab === 'stats' && (
            <>
              {/* Overall Aggregated Cluster Metrics */}
              <h3 className="section-title purple" style={{ fontSize: '11px', marginBottom: '8px' }}>Overall Cluster Metrics</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                
                <div className="stats-card" style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)', borderColor: 'rgba(139, 92, 246, 0.2)' }}>
                  <div>
                    <span className="stats-label" style={{ color: '#c084fc' }}>Cluster Hit Ratio</span>
                    <span className="stats-val" style={{ fontSize: '24px', color: '#c084fc' }}>{overallMetrics.hitRate}%</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="stats-label">Total Cached Items</span>
                    <span className="stats-val" style={{ color: '#cbd5e1' }}>{overallMetrics.totalKeysStored} keys</span>
                  </div>
                </div>

                <div className="stats-card">
                  <span className="stats-label">Writes (SET)</span>
                  <span className="stats-val" style={{ color: '#a78bfa' }}>{overallMetrics.writes}</span>
                </div>
                <div className="stats-card">
                  <span className="stats-label">Deletes (DEL)</span>
                  <span className="stats-val" style={{ color: '#f43f5e' }}>{overallMetrics.deletes}</span>
                </div>
                <div className="stats-card">
                  <span className="stats-label">Cache Hits</span>
                  <span className="stats-val" style={{ color: '#34d399' }}>{overallMetrics.hits}</span>
                </div>
                <div className="stats-card">
                  <span className="stats-label">Cache Misses</span>
                  <span className="stats-val" style={{ color: '#f87171' }}>{overallMetrics.misses}</span>
                </div>
                <div className="stats-card">
                  <span className="stats-label">Evictions (LRU)</span>
                  <span className="stats-val" style={{ color: '#fbbf24' }}>{overallMetrics.evictions}</span>
                </div>
                <div className="stats-card">
                  <span className="stats-label">Expirations (TTL)</span>
                  <span className="stats-val" style={{ color: '#94a3b8' }}>{overallMetrics.expiredKeys}</span>
                </div>
              </div>

              <h3 className="section-title purple" style={{ fontSize: '11px', marginBottom: '8px' }}>Gossip Membership Topology</h3>
              
              <div className="topology-list" style={{ marginBottom: '14px' }}>
                {clusterStatus.clusterStatus.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic' }}>No node information available.</p>
                ) : (
                  clusterStatus.clusterStatus.map((n) => {
                    const col = getNodeStyle(n.nodeId);
                    return (
                      <div key={n.nodeId} className="topology-item">
                        <div className="topology-left">
                          <span className="topology-color-indicator" style={{ backgroundColor: col.hex }} />
                          <span className="topology-name">{n.nodeId}</span>
                          <span className="topology-url">({n.url.replace('http://', '')})</span>
                        </div>
                        <div className="topology-right">
                          {n.missedBeats > 0 && (
                            <span className="missed-beats-badge">
                              {n.missedBeats}/3 failed
                            </span>
                          )}
                          <span className={`node-status-label ${n.alive ? 'active' : 'down'}`}>
                            {n.alive ? 'ACTIVE' : 'DOWN'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <h3 className="section-title purple" style={{ fontSize: '11px', marginBottom: '8px' }}>Ring Specifications</h3>
              <div className="stats-grid" style={{ marginBottom: '14px' }}>
                <div className="stats-card">
                  <span className="stats-label">TOTAL VIRTUAL NODES</span>
                  <span className="stats-val">
                    {ringData.ring.length}
                  </span>
                </div>
                <div className="stats-card">
                  <span className="stats-label">VNODES PER CACHE</span>
                  <span className="stats-val">
                    {ringData.virtualNodesPerNode}
                  </span>
                </div>
              </div>

              <div className="desc-card">
                <div className="desc-card-title">
                  <Info className="h-4 w-4" style={{ color: '#8b5cf6' }} />
                  What is Successor Replication?
                </div>
                <p>
                  When a key is written, the coordinator maps it to a **primary node** using Consistent Hashing.
                  To ensure high availability, it also replicates the write to the **successor node** on the ring.
                  If the primary node is killed (simulated via toggling offline), the coordinator automatically fails over to read from the **replica node**.
                </p>
              </div>
            </>
          )}
        </div>

        <footer style={{ padding: '12px', borderTop: '1px solid #181f30', backgroundColor: '#05070c', textAlign: 'center', fontSize: '9px', color: '#475569', fontWeight: 600 }}>
          Candis Cache v1.0
        </footer>
      </aside>

      {/* RIGHT: Miro whiteboard interactive canvas */}
      <main 
        className="canvas-viewport"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        ref={canvasRef}
      >
        
        {/* Canvas Workspace wrapper (handles Translate & Zoom) */}
        <div 
          style={{ 
            position: 'absolute',
            inset: 0,
            transformOrigin: 'center center',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: 'transform 0.075s ease-out'
          }}
        >
          
          {/* Animated Flow Lines (SVG Canvas layer behind elements) */}
          <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: '3000px', height: '3000px', overflow: 'visible' }}>
            
            {/* Draw permanent routing channels */}
            {/* Client -> Coordinator */}
            <path 
              d={`M ${clientPos.x + 150} ${clientPos.y + 40} L ${coordPos.x} ${coordPos.y + 40}`}
              stroke="rgba(255, 255, 255, 0.05)" 
              strokeWidth="2.5" 
              fill="none" 
            />

            {/* Coordinator -> Hash Ring Circle / Partitions Space */}
            {architectureMode === 'partitions' ? (
              <path 
                d={`M ${coordPos.x + 170} ${coordPos.y + 50} Q ${coordPos.x + 220} ${positions.ring.y + 80} ${positions.ring.x} ${positions.ring.y + 160}`}
                stroke="rgba(255, 255, 255, 0.05)" 
                strokeWidth="2.5" 
                fill="none" 
              />
            ) : (
              <path 
                d={`M ${coordPos.x + 80} ${coordPos.y} Q ${coordPos.x + 120} ${coordPos.y - 120} ${ringCenter.x - 100} ${ringCenter.y}`}
                stroke="rgba(255, 255, 255, 0.05)" 
                strokeWidth="2.5" 
                fill="none" 
              />
            )}

            {/* Routing from Coordinator or Partitions to Cache Nodes */}
            {architectureMode === 'partitions' ? (
              partitionsData.map((part, idx) => {
                const pos = nodePositions[part.nodeId];
                if (!pos) return null;
                const cell = getPartitionCoords(part.partitionId);
                const nodeIsActive = clusterStatus.activeNodes.includes(part.nodeId);
                return (
                  <path 
                    key={idx}
                    d={`M ${cell.x} ${cell.y} Q ${(cell.x + pos.x) / 2} ${(cell.y + pos.y) / 2 - 30} ${pos.x} ${pos.y + 30}`}
                    stroke={nodeIsActive ? "rgba(255, 255, 255, 0.03)" : "rgba(239, 68, 68, 0.02)"} 
                    strokeWidth="1.5" 
                    fill="none" 
                  />
                );
              })
            ) : (
              Object.entries(nodePositions).map(([nodeId, pos]) => {
                const nodeIsActive = clusterStatus.activeNodes.includes(nodeId);
                return (
                  <path 
                    key={nodeId}
                    d={`M ${coordPos.x + 170} ${coordPos.y + 50} Q ${coordPos.x + 220} ${pos.y - 20} ${pos.x} ${pos.y + 30}`}
                    stroke={nodeIsActive ? "rgba(255, 255, 255, 0.05)" : "rgba(239, 68, 68, 0.05)"} 
                    strokeWidth="2" 
                    fill="none" 
                  />
                );
              })
            )}

            {/* ANIMATED FLIGHT PATHS */}
            {/* Step 0: Client -> Coordinator */}
            {anim.active && anim.step === 0 && (
              <line
                x1={clientPos.x + 150}
                y1={clientPos.y + 40}
                x2={coordPos.x}
                y2={coordPos.y + 40}
                stroke="var(--accent-purple)"
                strokeWidth="3"
                className="animated-line"
              />
            )}

            {/* Step 1: Coordinator -> Hashing Ring / Partitions Board */}
            {anim.active && anim.step === 1 && (
              architectureMode === 'partitions' && partitionCoords ? (
                <line
                  x1={coordPos.x + 170}
                  y1={coordPos.y + 50}
                  x2={partitionCoords.x}
                  y2={partitionCoords.y}
                  stroke="var(--accent-purple)"
                  strokeWidth="3"
                  className="animated-line"
                />
              ) : (
                <path 
                  d={`M ${coordPos.x + 80} ${coordPos.y} Q ${coordPos.x + 120} ${coordPos.y - 120} ${ringCenter.x - 100} ${ringCenter.y}`}
                  stroke="var(--accent-purple)"
                  strokeWidth="3"
                  className="animated-line"
                  fill="none"
                />
              )
            )}

            {/* Step 2: Querying Cache Nodes */}
            {anim.active && anim.step >= 2 && (
              architectureMode === 'partitions' && partitionCoords ? (
                <>
                  {/* From partition cell to primary node */}
                  {anim.primaryNodeId && (
                    <line
                      x1={partitionCoords.x}
                      y1={partitionCoords.y}
                      x2={nodePositions[anim.primaryNodeId].x}
                      y2={nodePositions[anim.primaryNodeId].y + 30}
                      stroke={anim.isReplicaRead ? "var(--accent-red)" : "var(--accent-purple)"}
                      strokeWidth="3"
                      className="animated-line"
                    />
                  )}
                  {/* From partition cell to replica nodes */}
                  {replicaNodeIds.map(repId => {
                    const pos = nodePositions[repId];
                    if (!pos) return null;
                    return (
                      <line
                        key={repId}
                        x1={partitionCoords.x}
                        y1={partitionCoords.y}
                        x2={pos.x}
                        y2={pos.y + 30}
                        stroke={anim.isReplicaRead ? "var(--accent-emerald)" : "var(--accent-cyan)"}
                        strokeWidth="3.5"
                        className="animated-line"
                      />
                    );
                  })}
                </>
              ) : (
                <>
                  {/* To Primary Node */}
                  {anim.primaryNodeId && (
                    <path 
                      d={`M ${coordPos.x + 170} ${coordPos.y + 50} Q ${coordPos.x + 220} ${nodePositions[anim.primaryNodeId].y - 20} ${nodePositions[anim.primaryNodeId].x} ${nodePositions[anim.primaryNodeId].y + 30}`}
                      stroke={anim.isReplicaRead ? "var(--accent-red)" : "var(--accent-purple)"}
                      strokeWidth="3"
                      className="animated-line"
                      fill="none"
                    />
                  )}

                  {/* To Replica Nodes */}
                  {replicaNodeIds.map(repId => {
                    const pos = nodePositions[repId];
                    if (!pos) return null;
                    return (
                      <path 
                        key={repId}
                        d={`M ${coordPos.x + 170} ${coordPos.y + 50} Q ${coordPos.x + 220} ${pos.y - 20} ${pos.x} ${pos.y + 30}`}
                        stroke={anim.isReplicaRead ? "var(--accent-emerald)" : "var(--accent-cyan)"}
                        strokeWidth="3.5"
                        className="animated-line"
                        fill="none"
                      />
                    );
                  })}
                </>
              )
            )}

            {/* Step 3: Draw link from Hash Ring pointer to the physical node */}
            {anim.active && anim.step >= 2 && (
              architectureMode === 'partitions' ? (
                null
              ) : (
                animatedKeyPos && (
                  <>
                    {/* Primary Ring Anchor -> Primary Node */}
                    {anim.primaryNodeId && (
                      <line 
                        x1={animatedKeyPos.x}
                        y1={animatedKeyPos.y}
                        x2={nodePositions[anim.primaryNodeId].x}
                        y2={nodePositions[anim.primaryNodeId].y + 30}
                        stroke="var(--accent-purple)"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                      />
                    )}

                    {/* Replica Node links */}
                    {replicaNodeIds.map(repId => {
                      const pos = nodePositions[repId];
                      if (!pos) return null;
                      return (
                        <line 
                          key={repId}
                          x1={animatedKeyPos.x}
                          y1={animatedKeyPos.y}
                          x2={pos.x}
                          y2={pos.y + 30}
                          stroke="var(--accent-cyan)"
                          strokeWidth="1.5"
                          strokeDasharray="4 4"
                        />
                      );
                    })}
                  </>
                )
              )
            )}
          </svg>

          {/* ========================================== */}
          {/* CLIENT CARD */}
          {/* ========================================== */}
          <div 
            className="glass-panel canvas-card-client"
            style={{ left: clientPos.x, top: clientPos.y, cursor: draggingElementId === 'client' ? 'grabbing' : 'grab' }}
            onMouseDown={(e) => handleDragStart(e, 'client')}
          >
            <div className="canvas-card-header">
              <span className="canvas-card-subtitle">Client Portal</span>
              <Database className="h-4 w-4" style={{ color: '#8b5cf6' }} />
            </div>
            <div>
              <h4 className="canvas-card-title">External Client</h4>
              <p className="canvas-card-desc">Initiates CRUD requests</p>
            </div>
          </div>

          {/* ========================================== */}
          {/* COORDINATION SERVER CARD */}
          {/* ========================================== */}
          <div 
            className={`glass-panel canvas-card-router ${anim.active && anim.step === 1 ? 'pulse-node-purple' : ''}`}
            style={{ left: coordPos.x, top: coordPos.y, cursor: draggingElementId === 'coordinator' ? 'grabbing' : 'grab' }}
            onMouseDown={(e) => handleDragStart(e, 'coordinator')}
          >
            <div className="canvas-card-header">
              <span className="router-subtitle">Coordinator</span>
              <Layers className="h-4 w-4" style={{ color: '#a78bfa' }} />
            </div>
            <div>
              <h4 className="canvas-card-title">Coordination Server</h4>
              <p className="canvas-card-desc">Consistent Hashing & Health Monitors</p>
              <div className="router-port">PORT 3000</div>
            </div>
          </div>

          {/* ========================================== */}
          {/* INTERACTIVE HASH RING / PARTITION BOARD */}
          {/* ========================================== */}
          {architectureMode !== 'partitions' ? (
            <div 
              className="glass-panel ring-card"
              style={{ left: positions.ring.x, top: positions.ring.y, cursor: draggingElementId === 'ring' ? 'grabbing' : 'grab' }}
              onMouseDown={(e) => handleDragStart(e, 'ring')}
            >
              <div className="ring-card-title">Consistent Hashing Ring Space</div>

              {/* SVG Circle and Virtual Node Ring ticks */}
              <svg width="220" height="220" style={{ overflow: 'visible', marginTop: '10px' }}>
                
                {/* Core Hashing Circle Line */}
                <circle 
                  cx="110" 
                  cy="110" 
                  r={ringRadius} 
                  fill="none" 
                  stroke="rgba(255,255,255,0.06)" 
                  strokeWidth="6" 
                />

                {/* Render Virtual Node dots */}
                {ringData.ring && ringData.ring.map((vnode, idx) => {
                  const nodeIsActive = clusterStatus.activeNodes.includes(vnode.nodeId);
                  const col = nodeIsActive ? getNodeStyle(vnode.nodeId).hex : '#334155';
                  
                  const angle = (vnode.hash / 4294967295) * 2 * Math.PI - Math.PI / 2;
                  const cx = 110 + ringRadius * Math.cos(angle);
                  const cy = 110 + ringRadius * Math.sin(angle);

                  return (
                    <circle 
                      key={idx}
                      cx={cx}
                      cy={cy}
                      r={nodeIsActive ? "2" : "1.2"}
                      fill={col}
                      opacity={nodeIsActive ? "0.85" : "0.25"}
                    />
                  );
                })}

                {/* Key Insertion / Search Pointer Animation */}
                {anim.active && anim.keyHash && (
                  (() => {
                    const angle = (anim.keyHash / 4294967295) * 2 * Math.PI - Math.PI / 2;
                    const kx = 110 + ringRadius * Math.cos(angle);
                    const ky = 110 + ringRadius * Math.sin(angle);
                    
                    return (
                      <g>
                        <circle 
                          cx={kx} 
                          cy={ky} 
                          r="10" 
                          fill="none" 
                          stroke="var(--accent-purple)" 
                          strokeWidth="1.5"
                          style={{ animation: 'ripple 1.2s infinite ease-out' }}
                        />

                        <line
                          x1={110 + (ringRadius - 10) * Math.cos(angle)}
                          y1={110 + (ringRadius - 10) * Math.sin(angle)}
                          x2={110 + (ringRadius + 10) * Math.cos(angle)}
                          y2={110 + (ringRadius + 10) * Math.sin(angle)}
                          stroke="#ffffff"
                          strokeWidth="2"
                        />

                        <circle 
                          cx={kx} 
                          cy={ky} 
                          r="5" 
                          fill="#ffffff" 
                          stroke="var(--accent-purple)" 
                          strokeWidth="2"
                        />

                        {/* Floating Key Metadata */}
                        <foreignObject 
                          x={kx + 8} 
                          y={ky - 24} 
                          width="140" 
                          height="40" 
                          style={{ overflow: 'visible', pointerEvents: 'none' }}
                        >
                          <div className="key-node-popup">
                            <span className="key-popup-title">key: {anim.key}</span>
                            <span className="key-popup-hash">hash: {anim.keyHash.toString().substring(0, 8)}...</span>
                          </div>
                        </foreignObject>
                      </g>
                    );
                  })()
                )}
              </svg>

              {/* Virtual Node Legend Indicators */}
              <div className="ring-legend">
                {['node1', 'node2', 'node3', 'node4', 'node5'].map(nid => {
                  const style = getNodeStyle(nid);
                  const active = clusterStatus.activeNodes.includes(nid);
                  return (
                    <div key={nid} className="ring-legend-item">
                      <span className="ring-legend-dot" style={{ backgroundColor: active ? style.hex : '#475569' }} />
                      <span className="ring-legend-name">{nid}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div 
              className="glass-panel partitions-grid-card"
              style={{ left: positions.ring.x, top: positions.ring.y, cursor: draggingElementId === 'ring' ? 'grabbing' : 'grab' }}
              onMouseDown={(e) => handleDragStart(e, 'ring')}
            >
              <div className="ring-card-title">Modulo Partitions mapping (8 Partitions)</div>
              
              <div className="partitions-grid">
                {partitionsData.map((part, idx) => {
                  const nodeIsActive = clusterStatus.activeNodes.includes(part.nodeId);
                  const style = nodeIsActive ? getNodeStyle(part.nodeId) : { hex: '#475569', name: 'Offline' };
                  const isTarget = anim.active && anim.keyHash && (anim.keyHash % 8 === idx);
                  
                  return (
                    <div 
                      key={idx}
                      className="partition-card"
                      style={{ 
                        borderColor: isTarget ? 'var(--accent-purple)' : style.hex,
                        boxShadow: isTarget ? `0 0 10px ${style.hex}80` : '',
                        background: isTarget ? `${style.hex}20` : 'rgba(3, 4, 6, 0.6)'
                      }}
                    >
                      <span className="partition-id">P{part.partitionId}</span>
                      <span className="partition-node-owner" style={{ color: style.hex }}>
                        {part.nodeId || 'Offline'}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              <div className="ring-legend" style={{ position: 'relative', marginTop: '16px', bottom: '0' }}>
                {['node1', 'node2', 'node3', 'node4', 'node5'].map(nid => {
                  const style = getNodeStyle(nid);
                  const active = clusterStatus.activeNodes.includes(nid);
                  return (
                    <div key={nid} className="ring-legend-item">
                      <span className="ring-legend-dot" style={{ backgroundColor: active ? style.hex : '#475569' }} />
                      <span className="ring-legend-name">{nid}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* PHYSICAL CACHE NODES CARDS (node1 - node5) */}
          {/* ========================================== */}
          {Object.entries(nodePositions).map(([nodeId, pos]) => {
            const nodeInfo = clusterStatus.clusterStatus.find(n => n.nodeId === nodeId) || {};
            const isAlive = !!nodeInfo.alive;
            const style = getNodeStyle(nodeId);
            const keys = nodesKeys[nodeId] || [];
            const metrics = nodeInfo.metrics || { hits: 0, misses: 0, writes: 0, evictions: 0 };
            
            const isPrimaryTarget = anim.active && anim.step >= 2 && anim.primaryNodeId === nodeId;
            const isReplicaTarget = anim.active && anim.step >= 2 && anim.replicaNodeId === nodeId;

            let cardBorderColor = 'rgba(255, 255, 255, 0.08)';
            if (isAlive) {
              if (isPrimaryTarget) cardBorderColor = 'var(--accent-purple)';
              else if (isReplicaTarget) cardBorderColor = 'var(--accent-cyan)';
            } else {
              cardBorderColor = 'rgba(239, 68, 68, 0.2)';
            }

            return (
              <div 
                key={nodeId}
                className="glass-panel node-card"
                style={{ 
                  left: pos.x, 
                  top: pos.y,
                  borderColor: cardBorderColor,
                  boxShadow: (isPrimaryTarget || isReplicaTarget) ? `0 0 20px ${style.hex}50` : '',
                  cursor: draggingElementId === nodeId ? 'grabbing' : 'grab'
                }}
                onMouseDown={(e) => handleDragStart(e, nodeId)}
              >
                {/* Card Header: Node ID & Status & Power Switch */}
                <div className="node-card-header">
                  <div className="node-card-title-area">
                    <span className="node-card-color-dot" style={{ backgroundColor: isAlive ? style.hex : 'var(--accent-red)' }} />
                    <span className="node-card-name">{nodeId}</span>
                    <span className="node-card-port">500{nodeId.charAt(4)}</span>
                  </div>
                  
                  {/* Kill/Revive Toggle Switch */}
                  <div className="node-card-power-area">
                    <span className="node-card-power-label">POWER</span>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={isAlive} 
                        onChange={() => toggleNodePower(nodeId)} 
                        disabled={!backendAlive}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>

                {/* Card Body: Info Layout */}
                <div className="node-card-body">
                  
                  {/* Left: Cache Metrics info */}
                  <div className="node-card-metrics">
                    <div className="node-card-metric-title">Metrics</div>
                    <div className="node-card-metric-row">
                      <span className="node-card-metric-lbl">Writes</span>
                      <span className="node-card-metric-val">{metrics.writes}</span>
                    </div>
                    <div className="node-card-metric-row">
                      <span className="node-card-metric-lbl">Hits</span>
                      <span className="node-card-metric-val" style={{ color: '#10b981' }}>{metrics.hits}</span>
                    </div>
                    <div className="node-card-metric-row">
                      <span className="node-card-metric-lbl">Misses</span>
                      <span className="node-card-metric-val" style={{ color: '#ef4444' }}>{metrics.misses}</span>
                    </div>
                    <div className="node-card-metric-row">
                      <span className="node-card-metric-lbl">Evicts</span>
                      <span className="node-card-metric-val" style={{ color: '#f59e0b' }}>{metrics.evictions}</span>
                    </div>
                  </div>

                  {/* Right: Storage Contents (first 4 keys) */}
                  <div className="node-card-storage">
                    <div className="node-card-storage-title">Storage ({keys.length})</div>
                    {keys.length === 0 ? (
                      <span className="node-card-empty-storage">Empty</span>
                    ) : (
                      <div className="node-card-storage-list">
                        {keys.slice(0, 4).map((entry, idx) => (
                          <div key={idx} className="storage-badge">
                            <span className="storage-key" title={entry.key}>{entry.key}</span>
                            <span className="storage-val" title={formatVal(entry.value)}>{formatVal(entry.value)}</span>
                          </div>
                        ))}
                        {keys.length > 4 && (
                          <span style={{ fontSize: '8px', color: '#64748b', textAlign: 'right', display: 'block', marginTop: '2px', fontWeight: 600 }}>
                            +{keys.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer inspect internals button or Offline overlay */}
                {isAlive ? (
                  <div className="node-card-inspect-wrapper">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        openNodeInspector(nodeId);
                      }}
                      className="inspect-btn"
                    >
                      Inspect Internals
                    </button>
                  </div>
                ) : (
                  <div className="node-card-offline-overlay">
                    <div className="offline-alert-badge">
                      <WifiOff className="h-3.5 w-3.5" />
                      <span>OFFLINE</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

        </div>

        {/* Floating Architecture Tabs Selector Overlay */}
        <div className="glass-panel architecture-tabs-container">
          <button 
            className={`arch-tab-btn ${architectureMode === 'ring' ? 'active' : ''}`}
            onClick={() => setArchitectureMode('ring')}
          >
            Consistent Ring
          </button>
          <button 
            className={`arch-tab-btn ${architectureMode === 'partitions' ? 'active' : ''}`}
            onClick={() => {
              setArchitectureMode('partitions');
              fetchData();
            }}
          >
            Modulo Partitions
          </button>
          <button 
            className={`arch-tab-btn ${architectureMode === 'quorum' ? 'active' : ''}`}
            onClick={() => setArchitectureMode('quorum')}
          >
            Tunable Quorums
          </button>
        </div>

        {/* Miro Pan & Zoom Controls Overlay */}
        <div className="glass-panel canvas-controls">
          <button onClick={zoomIn} className="canvas-ctrl-btn" title="Zoom In">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button onClick={zoomOut} className="canvas-ctrl-btn" title="Zoom Out">
            <ZoomOut className="h-4 w-4" />
          </button>
          <button onClick={resetPan} className="canvas-ctrl-btn" title="Reset Pan/Zoom">
            <RefreshCw className="h-4 w-4" />
          </button>
          <span className="canvas-ctrl-divider" />
          <div className="canvas-zoom-label">
            <Move className="h-3.5 w-3.5" />
            <span>ZOOM {Math.round(zoom * 100)}%</span>
          </div>
        </div>

        {/* User guidelines overlay */}
        <div className="glass-panel canvas-guide">
          <div className="canvas-guide-title">
            <Info className="h-4 w-4" /> Sandbox Guidelines
          </div>
          <ul className="canvas-guide-list">
            <li className="canvas-guide-item">Drag elements (cards, ring) to **rearrange** them.</li>
            <li className="canvas-guide-item">Drag blank background to **pan** canvas.</li>
            <li className="canvas-guide-item">Use the mousewheel to **zoom** in/out.</li>
            <li className="canvas-guide-item">Click **Inspect Internals** on a node to view its LRU & Merkle structures.</li>
          </ul>
        </div>

      </main>

      {/* Node Internals Inspector Modal Overlay */}
      {inspectingNodeId && (
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
              {/* Section 1: LRU Eviction Queue (Doubly Linked List) */}
              <div className="modal-section">
                <div className="modal-section-title">
                  <Database className="h-4 w-4" style={{ color: '#8b5cf6' }} />
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
              
              {/* Section 2: Active Anti-Entropy (Merkle Tree) */}
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
      )}

    </div>
  );
}
