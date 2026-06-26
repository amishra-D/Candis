import React from 'react';

export default function LruListVisualizer({ lruOrder, entries }) {
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
