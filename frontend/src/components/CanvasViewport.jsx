import React from 'react';
import { 
  Database, 
  Layers, 
  WifiOff, 
  ZoomIn, 
  ZoomOut, 
  RefreshCw, 
  Move, 
  Info 
} from 'lucide-react';
import { getNodeStyle } from '../utils/constants';

export default function CanvasViewport({
  canvasRef,
  pan,
  zoom,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleWheel,
  zoomIn,
  zoomOut,
  resetPan,
  positions,
  draggingElementId,
  handleDragStart,
  anim,
  architectureMode,
  setArchitectureMode,
  partitionsData,
  clusterStatus,
  ringData,
  nodesKeys,
  backendAlive,
  toggleNodePower,
  openNodeInspector
}) {
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

  const getHashCoords = (hashValue) => {
    const angle = (hashValue / 4294967295) * 2 * Math.PI - Math.PI / 2;
    return {
      x: ringCenter.x + ringRadius * Math.cos(angle),
      y: ringCenter.y + ringRadius * Math.sin(angle),
      angle
    };
  };

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
  const animatedKeyPos = anim.active && anim.keyHash ? getHashCoords(anim.keyHash) : null;
  const replicaNodeIds = anim.replicaNodeId ? String(anim.replicaNodeId).split(',').map(s => s.trim()) : [];

  const formatVal = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
      return JSON.stringify(val);
    }
    return String(val);
  };

  return (
    <main 
      className="canvas-viewport"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      ref={canvasRef}
    >
      
      <div 
        style={{ 
          position: 'absolute',
          inset: 0,
          transformOrigin: 'center center',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transition: 'transform 0.075s ease-out'
        }}
      >
        
        <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: '3000px', height: '3000px', overflow: 'visible' }}>
          
          <path 
            d={`M ${clientPos.x + 150} ${clientPos.y + 40} L ${coordPos.x} ${coordPos.y + 40}`}
            stroke="rgba(255, 255, 255, 0.05)" 
            strokeWidth="2.5" 
            fill="none" 
          />

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

          {anim.active && anim.step >= 2 && (
            architectureMode === 'partitions' && partitionCoords ? (
              <>
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
                {anim.primaryNodeId && (
                  <path 
                    d={`M ${coordPos.x + 170} ${coordPos.y + 50} Q ${coordPos.x + 220} ${nodePositions[anim.primaryNodeId].y - 20} ${nodePositions[anim.primaryNodeId].x} ${nodePositions[anim.primaryNodeId].y + 30}`}
                    stroke={anim.isReplicaRead ? "rgba(153, 27, 27, 0.4)" : "var(--accent-purple)"}
                    strokeWidth="3"
                    className={anim.isReplicaRead ? "" : "animated-line"}
                    fill="none"
                  />
                )}

                {replicaNodeIds.map(repId => {
                  const pos = nodePositions[repId];
                  if (!pos) return null;
                  return (
                    <path 
                      key={repId}
                      d={`M ${coordPos.x + 170} ${coordPos.y + 50} Q ${coordPos.x + 220} ${pos.y - 20} ${pos.x} ${pos.y + 30}`}
                      stroke={anim.isReplicaRead ? "var(--accent-emerald)" : "var(--accent-cyan)"}
                      strokeWidth="3.5"
                      className={`animated-line ${anim.isReplicaRead ? 'replica-active' : ''}`}
                      fill="none"
                    />
                  );
                })}
              </>
            )
          )}

          {anim.active && anim.step >= 2 && (
            architectureMode === 'partitions' ? (
              null
            ) : (
              animatedKeyPos && (
                <>
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

        <div 
          className="glass-panel canvas-card-client"
          style={{ left: clientPos.x, top: clientPos.y, cursor: draggingElementId === 'client' ? 'grabbing' : 'grab' }}
          onMouseDown={(e) => handleDragStart(e, 'client')}
        >
          <div className="canvas-card-header">
            <span className="canvas-card-subtitle">Client Portal</span>
            <Database className="h-4 w-4" style={{ color: 'var(--accent-purple)' }} />
          </div>
          <div>
            <h4 className="canvas-card-title">External Client</h4>
            <p className="canvas-card-desc">Initiates CRUD requests</p>
          </div>
        </div>

        <div 
          className={`glass-panel canvas-card-router ${anim.active && anim.step === 1 ? 'pulse-node-purple' : ''}`}
          style={{ left: coordPos.x, top: coordPos.y, cursor: draggingElementId === 'coordinator' ? 'grabbing' : 'grab' }}
          onMouseDown={(e) => handleDragStart(e, 'coordinator')}
        >
          <div className="canvas-card-header">
            <span className="router-subtitle">Coordinator</span>
            <Layers className="h-4 w-4" style={{ color: 'var(--accent-purple)' }} />
          </div>
          <div>
            <h4 className="canvas-card-title">Coordination Server</h4>
            <p className="canvas-card-desc">Consistent Hashing & Health Monitors</p>
            <div className="router-port">PORT 3000</div>
          </div>
        </div>

      
        {architectureMode !== 'partitions' ? (
          <div 
            className="glass-panel ring-card"
            style={{ left: positions.ring.x, top: positions.ring.y, cursor: draggingElementId === 'ring' ? 'grabbing' : 'grab' }}
            onMouseDown={(e) => handleDragStart(e, 'ring')}
          >
            <div className="ring-card-title">Consistent Hashing Ring Space</div>

            <svg width="220" height="220" style={{ overflow: 'visible', marginTop: '10px' }}>
              
              <circle 
                cx="110" 
                cy="110" 
                r={ringRadius} 
                fill="none" 
                stroke="rgba(255,255,255,0.06)" 
                strokeWidth="6" 
              />

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

       
        {Object.entries(nodePositions).map(([nodeId, pos], index) => {
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
              className={`glass-panel node-card ${isAlive ? 'gossip-active' : ''}`}
              style={{ 
                left: pos.x, 
                top: pos.y,
                borderColor: cardBorderColor,
                boxShadow: (isPrimaryTarget || isReplicaTarget) ? `0 0 20px ${style.hex}50` : '',
                cursor: draggingElementId === nodeId ? 'grabbing' : 'grab',
                animationDelay: `${index * 0.6}s`,
                '--node-accent-color': style.hex
              }}
              onMouseDown={(e) => handleDragStart(e, nodeId)}
            >
              <div className="node-card-header">
                <div className="node-card-title-area">
                  <span className="node-card-color-dot" style={{ backgroundColor: isAlive ? style.hex : 'var(--accent-red)' }} />
                  <span className="node-card-name">{nodeId}</span>
                  <span className="node-card-port">500{nodeId.charAt(4)}</span>
                </div>
                
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

              <div className="node-card-body">
                
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

      <div className="glass-panel architecture-tabs-container">
        <button 
          className={`arch-tab-btn ${architectureMode === 'ring' ? 'active' : ''}`}
          onClick={() => setArchitectureMode('ring')}
        >
          Consistent Ring
        </button>
        <button 
          className={`arch-tab-btn ${architectureMode === 'quorum' ? 'active' : ''}`}
          onClick={() => setArchitectureMode('quorum')}
        >
          Tunable Quorums
        </button>
      </div>

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
  );
}
