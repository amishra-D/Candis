class CacheEntry {
   constructor(value, expiryTime){
      this.value = value;
      this.expiryTime = expiryTime;
      this.hits = 0;
      this.createdAt = Date.now();
   }
}
module.exports = CacheEntry;