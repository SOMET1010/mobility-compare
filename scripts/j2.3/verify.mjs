#!/usr/bin/env node
/**
 * VERIFICATEUR J2.3 — collecte l'I/O, delegue la logique a lib/report.mjs.
 *
 * Usage :
 *   node verify.mjs --endpoint http://localhost:5000 --facts facts.json --out rapport
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { buildReport, renderReport, routeUrl } from './lib/report.mjs';

function arg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const endpoint = arg('endpoint', 'http://localhost:5000');
const factsPath = arg('facts');
const outPrefix = arg('out', 'rapport-j2.3');
const timeoutMs = Number(arg('timeout', '20000'));
const generatedAt = new Date();

const facts =
  factsPath && existsSync(factsPath) ? JSON.parse(readFileSync(factsPath, 'utf8')) : {};

let payload = null;
let httpStatus = null;
let reached = false;
let networkError = null;

const startedAt = Date.now();
try {
  const response = await fetch(routeUrl(endpoint), { signal: AbortSignal.timeout(timeoutMs) });
  httpStatus = response.status;
  reached = true;
  try {
    payload = await response.json();
  } catch (error) {
    networkError = `Corps illisible : ${String(error)}`;
  }
} catch (error) {
  networkError = String(error);
}
const latencyMs = Date.now() - startedAt;

const report = buildReport({
  payload,
  facts,
  endpoint,
  reached,
  httpStatus,
  latencyMs,
  networkError,
  generatedAt,
});

writeFileSync(`${outPrefix}.json`, `${JSON.stringify(report, null, 2)}\n`);
const rendered = renderReport(report);
writeFileSync(`${outPrefix}.md`, `${rendered}\n`);
console.log(rendered);
console.log(`Rapports ecrits : ${outPrefix}.json et ${outPrefix}.md`);

// Seul un PASS retourne 0. INCONCLUSIVE et FAIL echouent.
process.exit(report.verdict === 'PASS' ? 0 : 1);
