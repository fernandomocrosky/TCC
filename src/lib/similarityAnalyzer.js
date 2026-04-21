function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9+ ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function termFrequency(tokens) {
  const tf = new Map();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  return tf;
}

function cosineSimilarity(a, b) {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (!tokensA.length || !tokensB.length) return 0;

  const tfA = termFrequency(tokensA);
  const tfB = termFrequency(tokensB);

  const vocab = new Set([...tfA.keys(), ...tfB.keys()]);

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const term of vocab) {
    const va = tfA.get(term) || 0;
    const vb = tfB.get(term) || 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }

  if (!normA || !normB) return 0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export { cosineSimilarity };

