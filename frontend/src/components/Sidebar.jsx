import React from 'react';
import { 
  Sliders, 
  Terminal, 
  Activity, 
  Plus, 
  Search, 
  Trash2, 
  Info 
} from 'lucide-react';
import { getNodeStyle } from '../utils/constants';

function MiniHistoryChart({ history }) {
  if (!history || history.length === 0) {
    return (
      <div style={{ fontSize: '8px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
        Awaiting activity...
      </div>
    );
  }
  
  const maxVal = Math.max(...history.map(d => d.hits + d.misses), 1);
  const chartWidth = 90;
  const chartHeight = 28;
  const barWidth = 6;
  const gap = 3;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
      <svg width={chartWidth} height={chartHeight} style={{ overflow: 'visible' }}>
        {history.map((d, i) => {
          const total = d.hits + d.misses;
          const hitHeight = total > 0 ? (d.hits / maxVal) * chartHeight : 0;
          const missHeight = total > 0 ? (d.misses / maxVal) * chartHeight : 0;
          const x = i * (barWidth + gap);
          
          return (
            <g key={i}>
              <rect 
                x={x}
                y={chartHeight - missHeight}
                width={barWidth}
                height={missHeight}
                fill="#ef4444"
                opacity="0.5"
                rx="1"
              />
              <rect 
                x={x}
                y={chartHeight - hitHeight - missHeight}
                width={barWidth}
                height={hitHeight}
                fill="#10b981"
                opacity="0.95"
                rx="1"
              />
            </g>
          );
        })}
      </svg>
      <span style={{ fontSize: '7px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        Hits/Misses History
      </span>
    </div>
  );
}

export default function Sidebar({
  backendAlive,
  activeTab,
  setActiveTab,
  architectureMode,
  quorumW,
  setQuorumW,
  quorumR,
  setQuorumR,
  formKey,
  setFormKey,
  formValue,
  setFormValue,
  formTtl,
  setFormTtl,
  getKey,
  setGetKey,
  deleteKey,
  setDeleteKey,
  setResult,
  getResult,
  deleteResult,
  logs,
  setLogs,
  clusterStatus,
  ringData,
  overallMetrics,
  metricsHistory,
  handleSet,
  handleGet,
  handleDelete
}) {
  return (
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

      <div className="sidebar-content">
        
        {activeTab === 'crud' && (
          <>
            {architectureMode === 'quorum' && (
              <section className="panel-section" style={{ borderColor: 'rgba(239, 68, 68, 0.15)' }}>
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
              
              {setResult && (
                <div style={{ padding: '8px 10px', background: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.12)', borderRadius: '6px', fontSize: '10px' }}>
                  <span style={{ fontWeight: 'bold', color: '#f87171', display: 'block', marginBottom: '4px', fontSize: '9px', textTransform: 'uppercase' }}>Write Status</span>
                  <div>Primary Node: <strong>{setResult.nodeId}</strong></div>
                  {setResult.replicated ? (
                    <div style={{ color: '#10b981', marginTop: '2px' }}>✓ Replicated to: <strong>{setResult.replicaNodeId}</strong></div>
                  ) : (
                    <div style={{ color: '#f59e0b', marginTop: '2px' }}>⚠ Replication skipped (No replica node active)</div>
                  )}
                </div>
              )}
            </section>

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

        {activeTab === 'stats' && (
          <>
            <h3 className="section-title purple" style={{ fontSize: '11px', marginBottom: '8px' }}>Overall Cluster Metrics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              
              <div className="stats-card" style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.02) 0%, rgba(16, 185, 129, 0.06) 100%)', borderColor: 'rgba(16, 185, 129, 0.15)' }}>
                <div>
                  <span className="stats-label" style={{ color: 'var(--accent-emerald)' }}>Cluster Hit Ratio</span>
                  <span className="stats-val" style={{ fontSize: '24px', color: 'var(--accent-emerald)' }}>{overallMetrics.hitRate}%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <MiniHistoryChart history={metricsHistory} />
                  <div style={{ textAlign: 'right' }}>
                    <span className="stats-label">Total Cached Items</span>
                    <span className="stats-val" style={{ color: '#cbd5e1' }}>{overallMetrics.totalKeysStored} keys</span>
                  </div>
                </div>
              </div>

              <div className="stats-card">
                <span className="stats-label">Writes (SET)</span>
                <span className="stats-val" style={{ color: 'var(--accent-purple)' }}>{overallMetrics.writes}</span>
              </div>
              <div className="stats-card">
                <span className="stats-label">Deletes (DEL)</span>
                <span className="stats-val" style={{ color: '#f43f5e' }}>{overallMetrics.deletes}</span>
              </div>
              <div className="stats-card">
                <span className="stats-label">Cache Hits</span>
                <span className="stats-val" style={{ color: 'var(--accent-emerald)' }}>{overallMetrics.hits}</span>
              </div>
              <div className="stats-card">
                <span className="stats-label">Cache Misses</span>
                <span className="stats-val" style={{ color: 'var(--accent-red)' }}>{overallMetrics.misses}</span>
              </div>
              <div className="stats-card">
                <span className="stats-label">Evictions (LRU)</span>
                <span className="stats-val" style={{ color: 'var(--accent-amber)' }}>{overallMetrics.evictions}</span>
              </div>
              <div className="stats-card">
                <span className="stats-label">Expirations (TTL)</span>
                <span className="stats-val" style={{ color: 'var(--text-muted)' }}>{overallMetrics.expiredKeys}</span>
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
                <Info className="h-4 w-4" style={{ color: 'var(--accent-purple)' }} />
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
  );
}
