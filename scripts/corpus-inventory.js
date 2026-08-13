#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const EXTRACTION_STATUSES = new Set(["not_run", "success", "ocr-required", "failed"]);
const PROVENANCE_STATUSES = new Set(["arxiv-id-linked", "manifest-url-linked", "catalog-only", "unknown"]);
const LANGUAGES = new Set(["en", "zh", "mixed", "unknown", "not_applicable"]);
const CONTENT_TYPES = new Set(["pdf_document", "markdown_document", "plain_text", "source_code", "structured_data", "binary", "unknown"]);
const PARSE_STATUSES = new Set(["success", "ocr-required", "failed", "not_applicable"]);
const REQUIRED_FIELDS = [
  "path", "sha256", "size", "encoding", "language", "modified_at", "source_or_author",
  "license_status", "content_type", "parse_status", "duplicate_group", "notes",
];

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function kind(relativePath) {
  const extension = path.extname(relativePath).toLowerCase();
  const known = new Map([
    [".pdf", "pdf"],
    [".md", "markdown"],
    [".json", "json"],
    [".txt", "text"],
    [".csv", "csv"],
    [".js", "javascript"],
    [".py", "python"],
  ]);
  return known.get(extension) || (extension ? extension.slice(1) : "unknown");
}

function encoding(file, fileKind) {
  if (fileKind === "pdf") return "binary";
  const bytes = fs.readFileSync(file);
  if (bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) return "utf-8-bom";
  if (bytes.subarray(0, 2).equals(Buffer.from([0xff, 0xfe]))) return "utf-16le";
  if (bytes.subarray(0, 2).equals(Buffer.from([0xfe, 0xff]))) return "utf-16be";
  if (bytes.includes(0)) return "binary";
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return "utf-8";
  } catch (_) {
    return "unknown";
  }
}

function decodeText(file, detectedEncoding) {
  const bytes = fs.readFileSync(file);
  if (detectedEncoding === "utf-8" || detectedEncoding === "utf-8-bom") {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  }
  if (detectedEncoding === "utf-16le" || detectedEncoding === "utf-16be") {
    return new TextDecoder(detectedEncoding, { fatal: true }).decode(bytes);
  }
  return null;
}

function languageFromCounts(latin, han) {
  const meaningful = latin + han;
  if (meaningful < 20) return "unknown";
  if (latin >= 20 && han >= 20 && Math.min(latin, han) / meaningful >= 0.1) return "mixed";
  if (han >= 20 && han / meaningful >= 0.6) return "zh";
  if (latin >= 20 && latin / meaningful >= 0.6) return "en";
  return "unknown";
}

function detectLanguage(text) {
  if (typeof text !== "string") return "unknown";
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  const han = (text.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g) || []).length;
  return languageFromCounts(latin, han);
}

function contentType(fileKind, detectedEncoding) {
  if (fileKind === "pdf") return "pdf_document";
  if (fileKind === "markdown") return "markdown_document";
  if (fileKind === "text") return "plain_text";
  if (["javascript", "python"].includes(fileKind)) return "source_code";
  if (["json", "csv"].includes(fileKind)) return "structured_data";
  if (detectedEncoding === "binary") return "binary";
  return "unknown";
}

function readOptional(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function manifestUrls(manifest) {
  const urls = new Map();
  for (const line of manifest.split(/\r?\n/)) {
    const match = line.trim().match(/^(https?:\/\/[^|\s]+)\|([^|]+)$/i);
    if (match) urls.set(path.posix.basename(match[2].trim()).toLowerCase(), match[1]);
  }
  return urls;
}

function deriveProvenance(relativePath, manifestUrlMap, catalog) {
  const basename = path.posix.basename(relativePath);
  if (/^\d{4}\.\d{4,5}(?:v\d+)?\.pdf$/i.test(basename)) {
    return { status: "arxiv-id-linked", evidence_ref: "catalog/13-local-pdf-index.md", source_or_author: `arXiv:${basename.replace(/\.pdf$/i, "")}` };
  }
  const manifestUrl = manifestUrlMap.get(basename.toLowerCase());
  if (manifestUrl) {
    return { status: "manifest-url-linked", evidence_ref: "_meta/download-manifest.txt", source_or_author: manifestUrl };
  }
  if (catalog.includes(basename)) {
    return { status: "catalog-only", evidence_ref: "catalog/13-local-pdf-index.md", source_or_author: "catalog/13-local-pdf-index.md" };
  }
  return { status: "unknown", evidence_ref: null, source_or_author: "unknown" };
}

function probePdfText(root, pythonCommand) {
  const program = String.raw`
import json, sys
from pathlib import Path
try:
    from pypdf import PdfReader
except Exception as exc:
    print(json.dumps({"fatal": "pypdf unavailable: " + str(exc)}))
    raise SystemExit(3)
root = Path(sys.argv[1])
for pdf in sorted(root.rglob("*.pdf"), key=lambda item: item.relative_to(root).as_posix()):
    rel = pdf.relative_to(root).as_posix()
    result = {"path": rel, "status": "failed", "page_count": 0, "pages_with_text": 0, "text_chars": 0, "page_errors": 0, "latin_chars": 0, "han_chars": 0}
    try:
        reader = PdfReader(str(pdf))
        result["page_count"] = len(reader.pages)
        for page in reader.pages:
            try:
                text = page.extract_text() or ""
                normalized = " ".join(text.split())
                if normalized:
                    result["pages_with_text"] += 1
                    result["text_chars"] += len(normalized)
                    result["latin_chars"] += sum(("A" <= char <= "Z") or ("a" <= char <= "z") for char in normalized)
                    result["han_chars"] += sum((0x3400 <= ord(char) <= 0x4dbf) or (0x4e00 <= ord(char) <= 0x9fff) or (0xf900 <= ord(char) <= 0xfaff) for char in normalized)
            except Exception:
                result["page_errors"] += 1
        if result["pages_with_text"] > 0:
            result["status"] = "success"
            if result["page_errors"]:
                result["reason"] = "partial page extraction errors"
        elif result["page_errors"] < result["page_count"]:
            result["status"] = "ocr-required"
            result["reason"] = "no extractable text detected"
        else:
            result["reason"] = "all pages failed text extraction"
    except Exception as exc:
        result["reason"] = type(exc).__name__ + ": " + str(exc)[:240]
    meaningful = result["latin_chars"] + result["han_chars"]
    if meaningful < 20:
        result["language"] = "unknown"
    elif result["latin_chars"] >= 20 and result["han_chars"] >= 20 and min(result["latin_chars"], result["han_chars"]) / meaningful >= 0.1:
        result["language"] = "mixed"
    elif result["han_chars"] >= 20 and result["han_chars"] / meaningful >= 0.6:
        result["language"] = "zh"
    elif result["latin_chars"] >= 20 and result["latin_chars"] / meaningful >= 0.6:
        result["language"] = "en"
    else:
        result["language"] = "unknown"
    print(json.dumps(result, ensure_ascii=False))
`;
  const result = spawnSync(pythonCommand, ["-c", program, root], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw new Error(`PDF probe could not start: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`PDF probe failed (${result.status}): ${(result.stderr || result.stdout).trim()}`);
  }
  const probes = new Map();
  for (const line of result.stdout.split(/\r?\n/).filter(Boolean)) {
    const record = JSON.parse(line);
    if (record.fatal) throw new Error(record.fatal);
    probes.set(record.path, record);
  }
  return probes;
}

function inventory(root, options = {}) {
  const base = path.resolve(root);
  if (!fs.existsSync(base) || !fs.statSync(base).isDirectory()) {
    throw new Error(`corpus root is not a directory: ${base}`);
  }
  const manifest = readOptional(path.join(base, "_meta", "download-manifest.txt"));
  const manifestUrlMap = manifestUrls(manifest);
  const catalog = readOptional(path.join(base, "catalog", "13-local-pdf-index.md"));
  const probes = options.python ? probePdfText(base, options.python) : new Map();
  const rows = [];

  function walk(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
      } else if (entry.isFile()) {
        const relativePath = path.relative(base, absolutePath).split(path.sep).join("/");
        const fileKind = kind(relativePath);
        const provenance = deriveProvenance(relativePath, manifestUrlMap, catalog);
        const stats = fs.statSync(absolutePath);
        const detectedEncoding = encoding(absolutePath, fileKind);
        let decoded = null;
        let decodeError = null;
        if (fileKind !== "pdf" && detectedEncoding !== "binary" && detectedEncoding !== "unknown") {
          try {
            decoded = decodeText(absolutePath, detectedEncoding);
          } catch (error) {
            decodeError = error;
          }
        }
        const type = contentType(fileKind, detectedEncoding);
        const row = {
          path: relativePath,
          size: stats.size,
          bytes: stats.size,
          sha256: sha256(absolutePath),
          kind: fileKind,
          encoding: detectedEncoding,
          language: fileKind === "pdf" ? "unknown" : (type === "binary" ? "not_applicable" : detectLanguage(decoded)),
          modified_at: stats.mtime.toISOString(),
          source_or_author: provenance.source_or_author,
          provenance_status: provenance.status,
          provenance_evidence_ref: provenance.evidence_ref,
          license_status: "unknown",
          content_type: type,
          parse_status: decoded !== null ? "success" : (type === "binary" ? "not_applicable" : "failed"),
          duplicate_group: null,
          notes: [],
        };
        if (provenance.status === "unknown") row.notes.push("Source or author is not established by local manifest/catalog evidence.");
        else if (provenance.status === "manifest-url-linked") row.notes.push("Source URL is linked by _meta/download-manifest.txt; author is not inferred.");
        else if (provenance.status === "arxiv-id-linked") row.notes.push("Source is identified from the numeric arXiv-style filename; author is not inferred.");
        else row.notes.push("Only the local PDF catalog establishes provenance; source and author are not inferred.");
        row.notes.push("License is unknown because no explicit local license evidence was established.");
        if (fileKind === "pdf") {
          const header = fs.readFileSync(absolutePath).subarray(0, 16).toString("ascii");
          const match = header.match(/^%PDF-(\d\.\d)/);
          const extraction = probes.get(relativePath) || { status: "not_run" };
          row.language = extraction.language || "unknown";
          row.parse_status = extraction.status === "not_run" ? "not_applicable" : extraction.status;
          row.notes.push(extraction.status === "not_run"
            ? "PDF text extraction was not run."
            : `PDF text extraction disposition: ${extraction.status}; extracted text is not stored.`);
          if (extraction.reason) row.notes.push(`PDF parser caveat: ${extraction.reason}`);
          row.pdf = {
            header_valid: Boolean(match),
            version: match ? match[1] : null,
            text_extraction: extraction,
          };
        } else if (decoded !== null) {
          row.notes.push(`Text decoded successfully as ${detectedEncoding} for conservative language detection.`);
        } else if (decodeError) {
          row.notes.push(`Text decoding failed: ${decodeError.name}.`);
        } else {
          row.notes.push("Content was not parsed because it is binary or has an unsupported encoding.");
        }
        rows.push(row);
      }
    }
  }

  walk(base);
  const hashGroups = new Map();
  for (const row of rows) {
    if (!hashGroups.has(row.sha256)) hashGroups.set(row.sha256, []);
    hashGroups.get(row.sha256).push(row.path);
  }
  for (const row of rows) {
    const group = hashGroups.get(row.sha256);
    row.duplicates = group.length > 1 ? group : [];
    row.duplicate_group = group.length > 1 ? row.sha256 : null;
  }

  const pdfRows = rows.filter((row) => row.kind === "pdf");
  const countBy = (values) => Object.fromEntries(
    [...new Set(values)].sort().map((value) => [value, values.filter((item) => item === value).length]),
  );
  const duplicateGroups = [...hashGroups.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([hash, paths]) => ({ sha256: hash, paths }));
  return {
    schema: "aql-corpus-inventory/v1",
    root: base,
    generated_at: null,
    file_count: rows.length,
    total_bytes: rows.reduce((sum, row) => sum + row.bytes, 0),
    coverage: {
      inventory: "complete",
      extraction: options.python ? "probed" : "not_run",
      claim_semantics: "not_inferred_from_inventory",
    },
    summary: {
      kinds: countBy(rows.map((row) => row.kind)),
      encodings: countBy(rows.map((row) => row.encoding)),
      provenance: countBy(pdfRows.map((row) => row.provenance_status)),
      pdf_extraction: countBy(pdfRows.map((row) => row.pdf.text_extraction.status)),
      duplicate_group_count: duplicateGroups.length,
    },
    duplicate_groups: duplicateGroups,
    files: rows,
  };
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const [key, inlineValue] = token.slice(2).split("=", 2);
    parsed[key] = inlineValue === undefined ? (argv[index + 1]?.startsWith("--") ? true : argv[++index] ?? true) : inlineValue;
  }
  return parsed;
}

function validateInventory(output) {
  const errors = [];
  const seen = new Set();
  if (output.file_count !== output.files.length) errors.push("file_count does not match files length");
  for (const file of output.files) {
    for (const field of REQUIRED_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(file, field)) errors.push(`missing ${field}: ${file.path || "<unknown>"}`);
    }
    if (!file.path || seen.has(file.path)) errors.push(`invalid or duplicate path: ${file.path}`);
    seen.add(file.path);
    if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size !== file.bytes) errors.push(`invalid size: ${file.path}`);
    if (!Number.isSafeInteger(file.bytes) || file.bytes < 0) errors.push(`invalid byte count: ${file.path}`);
    if (!/^[0-9a-f]{64}$/.test(file.sha256)) errors.push(`invalid sha256: ${file.path}`);
    if (!LANGUAGES.has(file.language)) errors.push(`invalid language: ${file.path}`);
    if (!CONTENT_TYPES.has(file.content_type)) errors.push(`invalid content type: ${file.path}`);
    if (!PARSE_STATUSES.has(file.parse_status)) errors.push(`invalid parse status: ${file.path}`);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(file.modified_at)) errors.push(`invalid modified_at: ${file.path}`);
    if (typeof file.source_or_author !== "string" || !file.source_or_author) errors.push(`invalid source_or_author: ${file.path}`);
    if (file.duplicate_group !== null && file.duplicate_group !== file.sha256) errors.push(`invalid duplicate_group: ${file.path}`);
    if (!(typeof file.notes === "string" || (Array.isArray(file.notes) && file.notes.every((note) => typeof note === "string")))) errors.push(`invalid notes: ${file.path}`);
    if (!PROVENANCE_STATUSES.has(file.provenance_status)) errors.push(`invalid provenance status: ${file.path}`);
    if (file.license_status !== "unknown") errors.push(`unsupported license assertion: ${file.path}`);
    const expectedSource = file.provenance_status === "arxiv-id-linked" ? `arXiv:${path.posix.basename(file.path, ".pdf")}`
      : file.provenance_status === "catalog-only" ? "catalog/13-local-pdf-index.md" : null;
    if (expectedSource && file.source_or_author !== expectedSource) errors.push(`provenance/source mismatch: ${file.path}`);
    if (file.provenance_status === "manifest-url-linked" && !/^https?:\/\//.test(file.source_or_author)) errors.push(`manifest URL missing: ${file.path}`);
    if (file.provenance_status === "unknown" && file.source_or_author !== "unknown") errors.push(`unknown provenance mismatch: ${file.path}`);
    if (file.kind === "pdf") {
      if (!file.pdf || !EXTRACTION_STATUSES.has(file.pdf.text_extraction?.status)) {
        errors.push(`invalid PDF extraction disposition: ${file.path}`);
      }
      if (!file.pdf?.header_valid) errors.push(`invalid PDF header: ${file.path}`);
      if (file.pdf?.text_extraction?.status !== "not_run" && file.parse_status !== file.pdf.text_extraction.status) errors.push(`PDF parse status mismatch: ${file.path}`);
    }
  }
  const groups = new Map((output.duplicate_groups || []).map((group) => [group.sha256, group.paths]));
  for (const file of output.files) {
    const expected = groups.has(file.sha256) ? file.sha256 : null;
    if (file.duplicate_group !== expected) errors.push(`duplicate group mismatch: ${file.path}`);
  }
  return errors;
}

function compareSnapshot(current, frozen) {
  const errors = [];
  const toMap = (document) => new Map((document.files || []).map((file) => [
    file.path,
    { bytes: file.bytes, sha256: file.sha256 },
  ]));
  const currentFiles = toMap(current);
  const frozenFiles = toMap(frozen);
  for (const [relativePath, expected] of frozenFiles) {
    const actual = currentFiles.get(relativePath);
    if (!actual) {
      errors.push(`source file missing since snapshot: ${relativePath}`);
    } else if (actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256) {
      errors.push(`source file drift since snapshot: ${relativePath}`);
    }
  }
  for (const relativePath of currentFiles.keys()) {
    if (!frozenFiles.has(relativePath)) errors.push(`new source file since snapshot: ${relativePath}`);
  }
  return errors;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log("usage: node corpus-inventory.js [--root DIR] [--output FILE] [--check] [--compare SNAPSHOT] [--probe-pdfs --python CMD] [--self-test]");
    return 0;
  }
  if (args["self-test"]) {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "aql-corpus-inventory-"));
    fs.mkdirSync(path.join(fixture, "_meta"));
    fs.mkdirSync(path.join(fixture, "catalog"));
    fs.writeFileSync(path.join(fixture, "_meta", "download-manifest.txt"), "https://example.test/named.pdf|named.pdf\n");
    fs.writeFileSync(path.join(fixture, "catalog", "13-local-pdf-index.md"), "named.pdf\n2401.00001.pdf\n");
    fs.writeFileSync(path.join(fixture, "utf16.txt"), Buffer.from([0xff, 0xfe, 0x68, 0x00]));
    fs.writeFileSync(path.join(fixture, "english.txt"), "This deterministic English fixture contains enough alphabetic characters for classification.\n");
    fs.writeFileSync(path.join(fixture, "english-copy.txt"), "This deterministic English fixture contains enough alphabetic characters for classification.\n");
    fs.writeFileSync(path.join(fixture, "named.pdf"), "%PDF-1.7\n");
    fs.writeFileSync(path.join(fixture, "2401.00001.pdf"), "%PDF-1.7\n");
    const output = inventory(fixture);
    const errors = validateInventory(output);
    const named = output.files.find((file) => file.path === "named.pdf");
    const arxiv = output.files.find((file) => file.path === "2401.00001.pdf");
    const sameSnapshotErrors = compareSnapshot(output, JSON.parse(JSON.stringify(output)));
    const drifted = JSON.parse(JSON.stringify(output));
    drifted.files.find((file) => file.path === "utf16.txt").bytes += 1;
    const driftErrors = compareSnapshot(output, drifted);
    const invalid = JSON.parse(JSON.stringify(output));
    delete invalid.files[0].language;
    invalid.files[1].parse_status = "maybe";
    const invalidErrors = validateInventory(invalid);
    const english = output.files.find((file) => file.path === "english.txt");
    const englishCopy = output.files.find((file) => file.path === "english-copy.txt");
    if (
      errors.length
      || output.files.find((file) => file.path === "utf16.txt").encoding !== "utf-16le"
      || named.provenance_status !== "manifest-url-linked"
      || named.source_or_author !== "https://example.test/named.pdf"
      || arxiv.provenance_status !== "arxiv-id-linked"
      || arxiv.source_or_author !== "arXiv:2401.00001"
      || english.language !== "en"
      || english.duplicate_group !== english.sha256
      || englishCopy.duplicate_group !== english.sha256
      || !REQUIRED_FIELDS.every((field) => Object.prototype.hasOwnProperty.call(english, field))
      || sameSnapshotErrors.length
      || !driftErrors.length
      || invalidErrors.length < 2
    ) {
      throw new Error(`self-test failed: ${[...errors, ...invalidErrors].join("; ")}`);
    }
    console.log("corpus-inventory self-test: PASS");
    return 0;
  }
  if (args["probe-pdfs"] && !args.python) throw new Error("--probe-pdfs requires --python PATH_OR_COMMAND");
  const output = inventory(args.root || path.resolve(__dirname, "../../llm-learning-corpus"), {
    python: args["probe-pdfs"] ? String(args.python) : null,
  });
  if (args.compare) {
    const frozen = JSON.parse(fs.readFileSync(path.resolve(String(args.compare)), "utf8"));
    const errors = [...validateInventory(output), ...compareSnapshot(output, frozen)];
    if (errors.length) {
      errors.forEach((error) => console.error(`ERROR ${error}`));
      return 1;
    }
    console.log(`corpus-inventory snapshot comparison: PASS (${output.file_count} files)`);
    return 0;
  }
  if (args.check) {
    const errors = validateInventory(output);
    if (errors.length) {
      errors.forEach((error) => console.error(`ERROR ${error}`));
      return 1;
    }
  }
  const serialized = `${JSON.stringify(output, null, 2)}\n`;
  if (args.output) fs.writeFileSync(path.resolve(args.output), serialized);
  else process.stdout.write(serialized);
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(`corpus-inventory: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { compareSnapshot, inventory, main, validateInventory };
