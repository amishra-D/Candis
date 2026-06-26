# Candis — Distributed Cache Visualizer

> A fully functional, **production-grade distributed in-memory cache** built from first principles, paired with a real-time React dashboard that lets you watch every distributed systems concept come alive — consistent hashing, replication, gossip protocol, anti-entropy, LRU eviction, TTL expiry, and more.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
  - [Docker (Recommended)](#docker-recommended)
- [API Reference](#api-reference)
- [Distributed Systems Concepts Implemented](#distributed-systems-concepts-implemented)
- [Frontend Dashboard](#frontend-dashboard)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Overview

Candis is a **distributed key-value cache** that runs a cluster of 5 independent cache nodes coordinated through a central server. It is designed to be both a **learning tool** and a **practical distributed system**, demonstrating:

- How a consistent hash ring distributes keys across nodes
- How gossip protocol detects node failures
- How replicas ensure fault tolerance
- How anti-entropy syncs diverged replicas
- How LRU eviction keeps memory bounded
- How write-ahead logs (WAL) and snapshots enable crash recovery

The **React frontend** polls the coordination server in real time and renders an interactive visual map of the entire cluster — node health, data distribution, hit/miss ratios, Merkle trees, and LRU queues — all on a dark, neon-themed canvas.

---

## Architecture

```
+------------------------------------------------------------------+
|                        React Frontend                            |
|                  (Vite + React 19, port 5174)                    |
+--------------------------------+---------------------------------+
                                 | HTTP (REST)
                                 v
+------------------------------------------------------------------+
|                   Coordination Server                            |
|               (Express.js, port 3000)                            |
|                                                                  |
|  +--------------+   +---------------+   +------------------+    |
|  |  HashRing    |   | GossipManager |   |   AntiEntropy    |    |
|  | (MurmurHash3)|   | (2s heartbeat)|   | (10s Merkle sync)|    |
|  +--------------+   +---------------+   +------------------+    |
|                                                                  |
|  +------------------------------------------------------------+  |
|  |              DistributedCache                              |  |
|  |     (Replication Factor = 3, Tunable Consistency)         |  |
|  +------------------------------------------------------------+  |
+--------------------+--------------------------------------------+
                     | HTTP (internal)
         +-----------+-----------+
         v           v           v
  +----------+  +----------+  +----------+
  |  node1   |  |  node2   |  | node3-5  |
  |  :5001   |  |  :5002   |  | :5003-5  |
  |          |  |          |  |          |
  | Storage  |  | Storage  |  | Storage  |
  | LRU      |  | LRU      |  | LRU      |
  | TTL      |  | TTL      |  | TTL      |
  | WAL+Snap |  | WAL+Snap |  | WAL+Snap |
  | Metrics  |  | Metrics  |  | Metrics  |
  | Merkle   |  | Merkle   |  | Merkle   |
  +----------+  +----------+  +----------+
```

---

## Features

### Backend

| Feature | Description |
|---|---|
| **Consistent Hash Ring** | MurmurHash3-based ring with **100 virtual nodes per physical node** for uniform distribution |
| **Replication** | Every key is replicated to **3 nodes** (configurable). Writes to all replicas in parallel |
| **Tunable Consistency** | Per-request `w` (write) and `r` (read) levels: `one`, `quorum`, `all` |
| **Gossip Protocol** | Every 2 seconds, pings a random node. After 3 missed heartbeats, a node is marked dead |
| **Automatic Failover** | Dead nodes are removed from the ring; remaining nodes absorb their traffic immediately |
| **Auto-Rebalance** | On membership change, the `Rebalancer` migrates keys to their correct replicas |
| **Anti-Entropy (AAE)** | Every 10 seconds, compares Merkle tree root hashes to detect and repair diverged replicas |
| **Read Repair** | On every GET, stale replicas are silently updated with the latest value in the background |
| **LRU Eviction** | Each node uses a **Doubly Linked List + HashMap** LRU to evict least-recently-used keys when `maxSize` is reached |
| **TTL / Expiry** | Keys support optional TTL (milliseconds). Expired keys are removed by a per-node timer every second |
| **WAL Persistence** | Every write/delete is appended to a **Write-Ahead Log** (`.wal` file) for crash recovery |
| **Snapshots** | Every 30 seconds, each node writes a JSON snapshot and truncates the WAL |
| **Metrics** | Per-node tracking of hits, misses, writes, deletes, evictions, and expirations |
| **Merkle Trees** | Per-node Merkle tree over all stored keys for fast divergence detection |
| **Node Toggle** | Any node can be taken offline/online at runtime via API for chaos testing |

### Frontend

| Feature | Description |
|---|---|
| **Live Cluster Map** | Animated canvas showing all nodes, their connections, and gossip pulse heartbeats |
| **Node Inspector** | Click any node to see its full cache contents, LRU queue, Merkle tree, and live metrics |
| **Cache Operations** | GET, SET (with optional TTL), and DELETE directly from the dashboard |
| **Read/Write Tuning** | Select consistency level (`one`/`quorum`/`all`) per operation |
| **Real-Time Metrics** | Per-node and cluster-wide hit ratio, miss count, write count, and size |
| **Metrics History** | Trending hit/miss chart tracked across the session |
| **Hash Ring Visualizer** | See the circular hash ring with virtual node positions |
| **LRU Visualizer** | Animated doubly-linked list showing eviction order inside each node |
| **Merkle Tree Visualizer** | Tree diagram of each node's Merkle structure for anti-entropy inspection |
| **Failover Replay** | Toggle a node offline and watch traffic reroute to replicas in real time |

---

## Tech Stack

### Backend
- **Runtime**: Node.js 18
- **Framework**: Express.js 5
- **Hashing**: MurmurHash3 (`murmurhash` npm package)
- **Data Structures**: Custom Doubly Linked List, Min-Heap, Merkle Tree (no external DS libraries)
- **Persistence**: File-system WAL + JSON snapshots

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite 8
- **Styling**: Vanilla CSS (dark neon theme, glassmorphism, CSS animations)
- **Icons**: Lucide React
- **Linting**: OxLint

---

## Project Structure

```
Candis/
+-- backend/
|   +-- index.js                    # Entry: starts 5 cache node servers
|   +-- start-backend.js            # Orchestrator helper
|   +-- CoordinationServer.js       # REST API gateway (port 3000)
|   +-- DistributedCache.js         # Core: set/get/delete with replication
|   +-- HashRing.js                 # Consistent hash ring (MurmurHash3 + virtual nodes)
|   +-- GossipManager.js            # Heartbeat-based failure detection + auto-rebalance
|   +-- AntiEntropy.js              # Merkle-tree-based replica sync (every 10s)
|   +-- Rebalancer.js               # Migrates keys on membership change
|   +-- Migratedata.js              # Utility: move key-value pairs between nodes
|   +-- Getpartition.js             # Utility: partition-to-node mapping helper
|   +-- createCacheNodeServer.js    # Factory: creates individual Express server per node
|   +-- Cache/
|   |   +-- CacheNode.js            # Per-node logic: get/set/delete + lifecycle
|   |   +-- StorageEngine.js        # Map-based key-value store
|   |   +-- CacheEntry.js           # Entry model: value, expiryTime, hits
|   |   +-- MetricsManager.js       # Tracks hits/misses/writes/evictions/expirations
|   |   +-- EvictionManager.js      # LRU eviction using DoublyLinkedList
|   |   +-- ExpiryManager.js        # Min-heap based TTL expiry scheduler
|   |   +-- ExpiryEntry.js          # Expiry heap entry model
|   |   +-- Persistence Manager.js  # WAL logging + snapshot read/write
|   +-- DS/
|   |   +-- DoublyLL.js             # Doubly Linked List (used by LRU)
|   |   +-- MerkelTree.js           # Merkle Tree implementation
|   |   +-- Minheap.js              # Min-Heap (used by TTL expiry)
|   +-- data/                       # Persistent WAL + snapshot storage (Docker volume)
|   +-- Dockerfile
|   +-- docker-compose.yml
|   +-- package.json
|
+-- frontend/
    +-- index.html
    +-- vite.config.js
    +-- package.json
    +-- .env                        # VITE_API_URL=http://localhost:3000
    +-- .env.example
    +-- src/
        +-- main.jsx
        +-- App.jsx                 # Root: state management, polling, API calls
        +-- App.css
        +-- index.css               # Global styles, animations, design tokens
        +-- utils/
        |   +-- constants.js        # API URL, node color palette
        +-- components/
            +-- Sidebar.jsx             # Left panel: metrics, controls, cluster stats
            +-- CanvasViewport.jsx      # Main canvas: node map, connections, animations
            +-- NodeInspectorModal.jsx  # Node detail modal: cache data, LRU, Merkle
            +-- LruListVisualizer.jsx   # Animated LRU doubly-linked list diagram
            +-- MerkleTreeVisualizer.jsx # Merkle tree diagram for each node
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- **Docker** + **Docker Compose** (for containerized deployment)

---

### Local Development

#### 1. Start the Backend

```bash
cd backend
npm install
npm start
```

This starts:
- **Coordination Server** on `http://localhost:3000`
- **Cache Node 1** on `http://localhost:5001`
- **Cache Node 2** on `http://localhost:5002`
- **Cache Node 3** on `http://localhost:5003`
- **Cache Node 4** on `http://localhost:5004`
- **Cache Node 5** on `http://localhost:5005`

#### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5174` in your browser.

---

### Docker (Recommended)

The backend is fully containerized. WAL and snapshot data is persisted on a named Docker volume.

```bash
cd backend
docker-compose up --build
```

This exposes:
- Port `3000` — Coordination Server API
- Ports `5001-5005` — Individual cache node APIs

The frontend is served separately. Run it locally:

```bash
cd frontend
npm run dev
```

To stop and clean up:

```bash
docker-compose down

# To also remove the persistent volume:
docker-compose down -v
```

---

## API Reference

All requests go to the **Coordination Server** at `http://localhost:3000`.

### Cache Operations

| Method | Endpoint | Body / Params | Description |
|---|---|---|---|
| `POST` | `/set` | `{ key, value, ttl?, w? }` | Set a key. `ttl` in ms, `w` = `one`/`quorum`/`all` |
| `GET` | `/get/:key` | `?r=one\|quorum\|all` | Get a key with optional read consistency |
| `DELETE` | `/delete/:key` | — | Delete a key from primary + all replicas |
| `GET` | `/node/:key` | — | Which node owns this key (hash ring lookup) |

### Cluster Management

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `GET` | `/cluster/status` | — | Active/dead nodes, per-node metrics and sizes |
| `GET` | `/cluster/ring` | — | Full hash ring: sorted hashes, virtual node mapping |
| `GET` | `/cluster/partitions` | — | Partition-to-node mapping (8 partitions) |
| `POST` | `/cluster/rebalance` | — | Manually trigger a cluster rebalance |
| `POST` | `/cluster/node/toggle` | `{ nodeId }` | Toggle a node offline/online (chaos testing) |
| `GET` | `/cluster/node-data/:nodeId` | — | All cache entries stored on a specific node |
| `GET` | `/cluster/node-merkle-tree/:nodeId` | — | Merkle tree of a specific node |

### Example: Set and Get a Key

```bash
curl -X POST http://localhost:3000/set \
  -H "Content-Type: application/json" \
  -d '{"key": "user:42", "value": {"name": "Alice"}, "ttl": 60000, "w": "quorum"}'

curl "http://localhost:3000/get/user:42?r=quorum"

curl -X DELETE http://localhost:3000/delete/user:42

# Toggle node2 offline
curl -X POST http://localhost:3000/cluster/node/toggle \
  -H "Content-Type: application/json" \
  -d '{"nodeId": "node2"}'
```

---

## Distributed Systems Concepts Implemented

### Consistent Hashing
- MurmurHash3 hashes both keys and node identifiers
- **100 virtual nodes** per physical node ensure even distribution
- Binary search on sorted hash array for O(log n) key lookup
- Nodes are added/removed without rehashing the entire keyspace

### Replication (RF=3)
- Every `SET` is sent to the **3 nodes clockwise** on the ring from the key hash position
- All 3 writes happen in parallel (`Promise.all`)
- Consistency levels: `one` (default, fastest), `quorum` (2/3), `all` (3/3, strongest)

### Gossip Protocol
- Every **2 seconds**, the coordinator pings a random active node for its membership list
- Each node tracks missed heartbeats; after **3 consecutive misses**, the node is declared dead
- Dead nodes are evicted from the hash ring and a rebalance is triggered automatically

### Anti-Entropy (Active — AAE)
- Every **10 seconds**, all node Merkle trees are fetched and compared
- If a replica leaf hash differs from the primary, the key is re-replicated (read-repair at sync time)

### Read Repair (Passive)
- On every `GET`, all replicas in the replication group are queried simultaneously
- The response with the **latest timestamp** wins
- Stale replicas are silently updated in the background (fire-and-forget)

### LRU Eviction
- Each node has a `maxSize` limit (default 1000 entries)
- A **Doubly Linked List + HashMap** maintains O(1) access and O(1) eviction
- The least-recently-used key is evicted when the node is full

### TTL Expiry
- A **Min-Heap** ordered by expiry time tracks all TTL keys per node
- A timer fires every **1 second** to pop and delete expired entries
- Expired keys also trigger lazy deletion on access

### Persistence — WAL + Snapshots
- Every `SET` and `DELETE` is appended to a per-node **Write-Ahead Log** (`.wal` file)
- Every **30 seconds**, a full JSON snapshot is written and the WAL is truncated
- On startup, each node **replays** the snapshot + remaining WAL entries to restore state

### Merkle Trees
- Each node maintains a Merkle tree over its entire keyspace
- Used by Anti-Entropy to detect replica divergence in O(log n) hash comparisons
- Visualized in the Node Inspector modal

---

## Frontend Dashboard

The React dashboard polls the coordination server every **2 seconds** and renders:

### Canvas Viewport
- **Node cards**: Each physical node displayed as a card with color-coded accent, health badge (alive/dead), live metrics (size, hit ratio), and gossip pulse ring animation
- **Connection lines**: Animated dashed SVG lines between nodes; replica connections glow with high contrast
- **Node click**: Opens the Node Inspector modal

### Sidebar
- **Cache Operations Panel**: Form to GET, SET (with TTL), or DELETE keys with configurable consistency level
- **Operation Result**: Shows which node served the request, key hash, replica info, and whether it was a replica read
- **Cluster Stats**: Aggregate hits, misses, cluster-wide hit ratio, and active node count
- **Metrics History**: Session-wide chart of cumulative hits and misses over time

### Node Inspector Modal
- **Cache Entries**: Full list of keys stored on the node with TTL remaining, hit count, and value preview
- **LRU Visualizer**: Animated doubly-linked list showing MRU head → LRU tail eviction order
- **Merkle Tree**: Interactive tree diagram of the node's Merkle structure
- **Node Metrics**: Per-node breakdown of hits, misses, writes, deletes, evictions, expirations

---

## Configuration

### Backend — `backend/.env`

```env
PERSISTENCE_DIR=./data/
```

| Variable | Default | Description |
|---|---|---|
| `PERSISTENCE_DIR` | `./data/` | Directory for WAL files and snapshots |
| `PORT` | `4000` | Legacy auxiliary port (unused in current setup) |

### Frontend — `frontend/.env`

```env
VITE_API_URL=http://localhost:3000
```

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | Coordination server URL |

---

## Deployment

### Docker Compose (Single Host)

```bash
cd backend
docker-compose up -d --build
```

The compose file mounts a named volume (`candis-volume`) at `/usr/src/app/data` inside the container, ensuring WAL files and snapshots survive container restarts.

### AWS EC2

1. **Launch an EC2 instance** (recommended: `t3.medium`, Ubuntu 22.04)

2. **Install Docker**:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose
   sudo usermod -aG docker ubuntu
   newgrp docker
   ```

3. **Clone or copy the project**:
   ```bash
   git clone <your-repo-url> Candis
   ```

4. **Configure persistence directory**:
   ```bash
   cd Candis/backend
   mkdir -p data
   ```

5. **Start the backend**:
   ```bash
   docker-compose up -d --build
   ```

6. **Open EC2 Security Group inbound rules** for ports: `3000`, `5001`, `5002`, `5003`, `5004`, `5005`

7. **Configure the frontend** to point to EC2:
   ```bash
   # In frontend/.env
   VITE_API_URL=http://<EC2-PUBLIC-IP>:3000
   ```

8. **Build and serve the frontend** (e.g., via nginx):
   ```bash
   cd frontend
   npm run build
   # Copy dist/ to your web server or S3 bucket
   ```

### Logs and Persistence

- **Container logs**: `docker-compose logs -f candis-backend`
- **WAL and snapshot files**: stored in the `candis-volume` Docker named volume
- **Inspect the volume**: `docker volume inspect backend_candis-volume`
- **Backup snapshots**: `docker cp <container_id>:/usr/src/app/data ./backup/`

### Production Considerations

- Place an **Application Load Balancer** (ALB) in front of port 3000
- Store WAL/snapshot volumes on **Amazon EBS** for durability
- Aggregate logs with **AWS CloudWatch Logs** (use Docker logging driver)
- Separate cache nodes into individual **ECS tasks** or **EC2 instances** for independent scaling
- Add **HTTPS** via ACM certificate on the ALB

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "feat: add my feature"`
4. Push to your branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

> **Candis** — built to understand distributed systems by building one.
