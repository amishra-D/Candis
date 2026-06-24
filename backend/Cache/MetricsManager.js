class MetricsManager {
   constructor() {
      this.hits = 0;
      this.misses = 0;
      this.writes = 0;
      this.deletes = 0;
      this.evictions = 0;
      this.expiredKeys = 0;
   }

   recordHit() { this.hits++; }
   recordMiss() { this.misses++; }
   recordWrite() { this.writes++; }
   recordDelete() { this.deletes++; }
   recordEviction() { this.evictions++; }
   recordExpiration() { this.expiredKeys++; }
}
module.exports = MetricsManager;