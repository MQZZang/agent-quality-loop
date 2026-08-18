#!/usr/bin/env node
"use strict";

const fs = require("fs");

function extract(text) {
  const questions = (String(text).match(/\?/g) || []).length;
  const toolCalls = (String(text).match(/"name":"/g) || []).length;
  const bytes = Buffer.byteLength(text);
  return { questions, toolCalls, transcript_bytes: bytes };
}

if (require.main === module) {
  const p = process.argv[2];
  if (!p) {
    console.error("Usage: node extract-attention.js <transcript.jsonl>");
    process.exit(2);
  }
  console.log(JSON.stringify({ file: p, ...extract(fs.readFileSync(p, "utf8")) }, null, 2));
}

module.exports = { extract };
