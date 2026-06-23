class StorageEngine{
 constructor(){
  this.cache=new Map();
 }
 get(key){
    return this.cache.get(key);
 }
 set(key,value){
    this.cache.set(key,value);
 }
 delete(key){
    this.cache.delete(key);
 }
 size(){
    return this.cache.size;
 }
}
module.exports=StorageEngine;