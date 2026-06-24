const murmurhash=require('murmurhash')

const Partition_Size=1073741824;
function getpartition(key){
const hash=murmurhash.v3(key.toString())
return Math.floor(hash % Partition_Size)+1
}
module.exports=getpartition;