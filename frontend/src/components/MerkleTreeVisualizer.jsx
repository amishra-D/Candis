import React, { useState } from 'react';

export default function MerkleTreeVisualizer({ root }) {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  if (!root) {
    return (
      <div style={{ color: '#64748b', fontStyle: 'italic', padding: '20px' }}>
        No Merkle Tree structure available (Cache may be empty).
      </div>
    );
  }

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
            stroke="rgba(239, 68, 68, 0.3)"
            strokeWidth="1.5"
          />
        ))}

        {nodes.map((node, idx) => {
          const isLeaf = node.isLeaf;
          const nodeColor = isLeaf ? '#10b981' : '#ef4444';
          const fill = isLeaf ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
          
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
