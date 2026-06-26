import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import CanvasViewport from './components/CanvasViewport';
import NodeInspectorModal from './components/NodeInspectorModal';
import { API_URL } from './utils/constants';

export default function App() {
  const [backendAlive, setBackendAlive] = useState(false);

  const [clusterStatus, setClusterStatus] = useState({ activeNodes: [], deadNodes: [], clusterStatus: [] });
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [ringData, setRingData] = useState({ sortedHashes: [], ring: [], virtualNodesPerNode: 100 });
  const [nodesKeys, setNodesKeys] = useState({});

  const [formKey, setFormKey] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formTtl, setFormTtl] = useState('10000');
  const [getKey, setGetKey] = useState('');
  const [deleteKey, setDeleteKey] = useState('');

  const [setResult, setSetResult] = useState(null);
  const [getResult, setGetResult] = useState(null);
  const [deleteResult, setDeleteResult] = useState(null);

  const [activeTab, setActiveTab] = useState('crud');
  const [logs, setLogs] = useState([]);
  
  const [pan, setPan] = useState({ x: 30, y: -20 });
  const [zoom, setZoom] = useState(0.85);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  const [anim, setAnim] = useState({
    active: false,
    type: '',
    key: '',
    keyHash: null,
    primaryNodeId: null,
    replicaNodeId: null,
    servedByNodeId: null,
    isReplicaRead: false,
    step: 0, 
  });

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

  const [architectureMode, setArchitectureMode] = useState('ring');
  const [quorumW, setQuorumW] = useState('quorum');
  const [quorumR, setQuorumR] = useState('quorum'); 
  const [partitionsData, setPartitionsData] = useState([]);

  const [inspectingNodeId, setInspectingNodeId] = useState(null);
  const [inspectedNodeData, setInspectedNodeData] = useState({ entries: [], lruOrder: [], loading: false, error: null });
  const [inspectedMerkleTree, setInspectedMerkleTree] = useState({ root: null, leaves: [], rootHash: null, loading: false, error: null });

  const openNodeInspector = async (nodeId) => {
    setInspectingNodeId(nodeId);
    setInspectedNodeData({ entries: [], lruOrder: [], loading: true, error: null });
    setInspectedMerkleTree({ root: null, leaves: [], rootHash: null, loading: true, error: null });
    
    try {
      const res = await fetch(`${API_URL}/cluster/node-data/${nodeId}`);
      if (res.ok) {
        const data = await res.json();
        setInspectedNodeData({ entries: data.entries || [], lruOrder: data.lruOrder || [], loading: false, error: null });
      } else {
        setInspectedNodeData({ entries: [], lruOrder: [], loading: false, error: 'Failed to load cache entries' });
      }
    } catch (err) {
      setInspectedNodeData({ entries: [], lruOrder: [], loading: false, error: err.message });
    }

    try {
      const res = await fetch(`${API_URL}/cluster/node-merkle-tree/${nodeId}`);
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
      fetch(`${API_URL}/cluster/node-data/${inspectingNodeId}`)
        .then(res => res.json())
        .then(data => {
          setInspectedNodeData(prev => ({ ...prev, entries: data.entries || [], lruOrder: data.lruOrder || [] }));
        }).catch(() => {});
      
      fetch(`${API_URL}/cluster/node-merkle-tree/${inspectingNodeId}`)
        .then(res => res.json())
        .then(data => {
          setInspectedMerkleTree(prev => ({ ...prev, root: data.root, leaves: data.leaves || [], rootHash: data.rootHash }));
        }).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [inspectingNodeId]);

  const addLog = (source, message, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [{ time, source, message, type }, ...prev].slice(0, 100));
  };

  const formatVal = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
      return JSON.stringify(val);
    }
    return String(val);
  };

  const fetchData = async () => {
    try {
      const statusRes = await fetch(`${API_URL}/cluster/status`);
      if (!statusRes.ok) throw new Error('Cannot fetch status');
      const statusData = await statusRes.json();
      setClusterStatus(statusData);
      setBackendAlive(true);

      // 2. Fetch Ring State
      const ringRes = await fetch(`${API_URL}/cluster/ring`);
      if (ringRes.ok) {
        const ringVal = await ringRes.json();
        setRingData(ringVal);
      }

      // 3. Fetch Keys for all known nodes
      const allNodeIds = ['node1', 'node2', 'node3', 'node4', 'node5'];
      const keysTemp = {};
      for (const nid of allNodeIds) {
        try {
          const nodeDataRes = await fetch(`${API_URL}/cluster/node-data/${nid}`);
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

      try {
        const partRes = await fetch(`${API_URL}/cluster/partitions`);
        if (partRes.ok) {
          const partVal = await partRes.json();
          setPartitionsData(partVal.partitions || []);
        }
      } catch {
        // Ignored
      }

    } catch {
      setBackendAlive(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 2000);

    addLog('SYSTEM', 'Miro Cluster Dashboard initialized. Connecting to coordination server...', 'system');
    return () => clearInterval(interval);
  }, []);

  const prevStatus = useRef(null);
  useEffect(() => {
    if (!clusterStatus || !clusterStatus.clusterStatus) return;

    if (prevStatus.current) {
      const activeNow = clusterStatus.activeNodes.sort().join(',');
      const activeBefore = prevStatus.current.activeNodes.sort().join(',');
      if (activeNow !== activeBefore) {
        addLog('GOSSIP', `Ring membership updated! Active Nodes: [${clusterStatus.activeNodes.join(', ')}]`, 'warning');
      }

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

  const zoomIn = () => setZoom(z => Math.min(2, z + 0.1));
  const zoomOut = () => setZoom(z => Math.max(0.4, z - 0.1));
  const resetPan = () => {
    setPan({ x: 30, y: -20 });
    setZoom(0.85);
  };

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

    setTimeout(() => {
      setAnim(prev => ({ ...prev, step: 1 }));
      setTimeout(() => {
        setAnim(prev => ({ ...prev, step: 2 }));
        setTimeout(() => {
          setAnim(prev => ({ ...prev, step: 3 }));
          setTimeout(() => {
            setAnim(prev => ({ ...prev, active: false }));
          }, 1200);
        }, 600);
      }, 500);
    }, 400);
  };

  const handleSet = async (e) => {
    e.preventDefault();
    if (!formKey) return;
    
    setSetResult(null);
    setGetResult(null);
    setDeleteResult(null);

    let finalValue = formValue;
    try {
      const trimmed = formValue.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        finalValue = JSON.parse(trimmed);
      }
    } catch {
    }

    addLog('CLIENT', `Request: SET key="${formKey}" value=${formatVal(finalValue)} TTL=${formTtl}ms`, 'info');
    
    try {
      const res = await fetch(`${API_URL}/set`, {
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

    setSetResult(null);
    setGetResult(null);
    setDeleteResult(null);

    addLog('CLIENT', `Request: GET key="${getKey}"`, 'info');

    try {
      const rParam = architectureMode === 'quorum' ? quorumR : 'one';
      const res = await fetch(`${API_URL}/get/${getKey}?r=${rParam}`);
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

    setSetResult(null);
    setGetResult(null);
    setDeleteResult(null);

    addLog('CLIENT', `Request: DELETE key="${deleteKey}"`, 'info');

    try {
      const res = await fetch(`${API_URL}/delete/${deleteKey}`, { method: 'DELETE' });
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
        setFormKey('');
        setDeleteKey('');
      } else {
        addLog('COORDINATOR', `Deletion Failed: ${data.error}`, 'error');
      }
    } catch (err) {
      addLog('COORDINATOR', `Deletion Failed: ${err.message}`, 'error');
    }
  };

  const toggleNodePower = async (nodeId) => {
    addLog('SIMULATION', `Toggling status of ${nodeId}...`, 'system');
    try {
      const res = await fetch(`${API_URL}/cluster/node/toggle`, {
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

  useEffect(() => {
    if (!backendAlive) return;
    const { hits, misses } = overallMetrics;
    setMetricsHistory(prev => {
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        if (last.hits === hits && last.misses === misses) {
          return prev;
        }
      }
      return [...prev, { hits, misses, timestamp: Date.now() }].slice(-10);
    });
  }, [overallMetrics.hits, overallMetrics.misses, backendAlive]);

  return (
    <div className="app-container whiteboard-bg">
      <Sidebar
        backendAlive={backendAlive}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        architectureMode={architectureMode}
        quorumW={quorumW}
        setQuorumW={setQuorumW}
        quorumR={quorumR}
        setQuorumR={setQuorumR}
        formKey={formKey}
        setFormKey={setFormKey}
        formValue={formValue}
        setFormValue={setFormValue}
        formTtl={formTtl}
        setFormTtl={setFormTtl}
        getKey={getKey}
        setGetKey={setGetKey}
        deleteKey={deleteKey}
        setDeleteKey={setDeleteKey}
        setResult={setResult}
        getResult={getResult}
        deleteResult={deleteResult}
        logs={logs}
        setLogs={setLogs}
        clusterStatus={clusterStatus}
        ringData={ringData}
        overallMetrics={overallMetrics}
        metricsHistory={metricsHistory}
        handleSet={handleSet}
        handleGet={handleGet}
        handleDelete={handleDelete}
      />

      <CanvasViewport
        canvasRef={canvasRef}
        pan={pan}
        zoom={zoom}
        handleMouseDown={handleMouseDown}
        handleMouseMove={handleMouseMove}
        handleMouseUp={handleMouseUp}
        handleWheel={handleWheel}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        resetPan={resetPan}
        positions={positions}
        draggingElementId={draggingElementId}
        handleDragStart={handleDragStart}
        anim={anim}
        architectureMode={architectureMode}
        setArchitectureMode={setArchitectureMode}
        partitionsData={partitionsData}
        clusterStatus={clusterStatus}
        ringData={ringData}
        nodesKeys={nodesKeys}
        backendAlive={backendAlive}
        toggleNodePower={toggleNodePower}
        openNodeInspector={openNodeInspector}
      />

      <NodeInspectorModal
        inspectingNodeId={inspectingNodeId}
        setInspectingNodeId={setInspectingNodeId}
        inspectedNodeData={inspectedNodeData}
        inspectedMerkleTree={inspectedMerkleTree}
      />
    </div>
  );
}
