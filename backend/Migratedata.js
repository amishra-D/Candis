
async function migrate(
    cache,
    entry,
    fromNodeId,
    toNodeId
){
    const fromUrl = cache.nodeUrls.get(fromNodeId);
    const toUrl = cache.nodeUrls.get(toNodeId);
    
    const ttl = entry.expiryTime === Infinity ? null : entry.ttlRemaining;

    const copyResponse = await fetch(`${toUrl}/internal/migrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            key: entry.key,
            value: entry.value,
            ttl
        })
    });
    
    if (!copyResponse.ok) {
        throw new Error(`Migration of key '${entry.key}' failed from ${fromNodeId} to ${toNodeId}`);
    }

    await fetch(`${fromUrl}/cache/${entry.key}`, {
        method: 'DELETE'
    });
}

module.exports = migrate;