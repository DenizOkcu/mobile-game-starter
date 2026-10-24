#!/usr/bin/env node
// Offline API inventory from pinned sources. Network refresh is opt-in.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { ROOT, parseEnv } from './lib.mjs';
const require = createRequire(path.join(ROOT, 'server/package.json'));
const ts = require('typescript');
const FOLDER = path.join(ROOT, 'docs/nakama');
const SURFACE = path.join(FOLDER, 'server-surface.json');
const RUNTIME = 'server/node_modules/nakama-runtime/index.d.ts';
const SDK = 'addons/com.heroiclabs.nakama/';
const digest = source => createHash('sha256').update(source).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const inline = text => text.replace(/\s+/g, ' ').trim();
const code = text => '`' + text.replaceAll('|', '\\|').replaceAll('`', '\\`') + '`';
const serverVersion = () => {
  const version = parseEnv(read('.env.example')).NAKAMA_IMAGE.split(':').at(-1);
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Reference requires an explicit Nakama release version in .env.example');
  return version;
};
const upstream = (surface, location) => `https://github.com/heroiclabs/nakama/blob/${surface.commit}/server/${location[0]}#L${location[1]}`;
const sourceLink = (file, line) => `../../${file}#L${line}`;

export function parseGodot(source) {
  const entries = [];
  for (const match of source.matchAll(/^(?:static )?func (\w+)\(/gm)) {
    const name = match[1];
    if (name.startsWith('_') && name !== '_init') continue;
    const rest = source.slice(match.index);
    let depth = 0, quote = '', closed = -1;
    for (let i = rest.indexOf('('); i < rest.length; i++) {
      const char = rest[i];
      if (quote) {
        if (char === '\\') i++;
        else if (char === quote) quote = '';
      } else if (char === '"' || char === "'") quote = char;
      else if (char === '(') depth++;
      else if (char === ')' && --depth === 0) { closed = i; break; }
    }
    const end = closed < 0 ? -1 : rest.indexOf(':', closed);
    if (end < 0) throw new Error(`Cannot parse Godot signature ${name}`);
    entries.push({ name, line: source.slice(0, match.index).split('\n').length,
      signature: inline(rest.slice(0, end)) });
  }
  for (const match of source.matchAll(/^(signal|enum|const|var)\s+([A-Za-z]\w*)[^\n]*/gm)) {
    entries.push({ name: match[2], line: source.slice(0, match.index).split('\n').length,
      signature: match[1] === 'signal' ? inline(match[0]) : `${match[1]} ${match[2]}` });
  }
  return entries.sort((a, b) => a.line - b.line);
}
export function parseRuntime(source) {
  const file = ts.createSourceFile(RUNTIME, source, ts.ScriptTarget.Latest, true);
  if (file.parseDiagnostics.length) throw new Error('Cannot parse pinned TypeScript declarations');
  const ns = file.statements.find(ts.isModuleDeclaration);
  if (!ns || !ts.isModuleBlock(ns.body)) throw new Error('Missing nkruntime namespace');
  const declarations = ns.body.statements.flatMap(node => ts.isVariableStatement(node) ? [...node.declarationList.declarations] : [node]);
  return declarations.filter(node => node.name).map(node => ({
    name: node.name.getText(file), kind: ts.SyntaxKind[node.kind],
    line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
    members: node.members?.map(member => ({
      name: member.name?.getText(file) || '(call)',
      line: file.getLineAndCharacterOfPosition(member.getStart(file)).line + 1,
      signature: inline(member.getText(file)),
    })) || [],
  }));
}

export async function refreshServerSurface() {
  const version = serverVersion(), tag = 'v' + version;
  // Resolve annotated/lightweight tags to an immutable commit before reading.
  const request = async url => {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'mobile-game-starter-reference' } });
    if (!response.ok) throw new Error(`Official source fetch failed (${response.status})`);
    return response;
  };
  let ref = await (await request(`https://api.github.com/repos/heroiclabs/nakama/git/ref/tags/${tag}`)).json();
  let object = ref.object;
  while (object.type === 'tag') object = (await (await request(object.url)).json()).object;
  if (object.type !== 'commit' || !/^[0-9a-f]{40}$/.test(object.sha)) throw new Error('Expected immutable upstream commit');
  const result = { format: 1, version, commit: object.sha, sources: {}, Nakama: {}, Initializer: {}, MatchDispatcher: {} };
  for (const [name, file] of [['Nakama', 'runtime_javascript_nakama.go'], ['Initializer', 'runtime_javascript_init.go'], ['MatchDispatcher', 'runtime_javascript_match_core.go']]) {
    const source = await (await request(`https://raw.githubusercontent.com/heroiclabs/nakama/${result.commit}/server/${file}`)).text();
    result.sources[file] = digest(source);
    const methods = new Map([...source.matchAll(/^func \(\w+ \*\w+\) (\w+)\(/gm)].map(match => [match[1], source.slice(0, match.index).split('\n').length]));
    if (name === 'MatchDispatcher') {
      for (const match of source.matchAll(/call\.This\.Set\("(\w+)", core\.(\w+)\(runtime\)\)/g)) {
        if (!methods.has(match[2])) throw new Error('Missing dispatcher implementation');
        result[name][match[1]] = [file, methods.get(match[2])];
      }
    } else {
      const begin = source.search(/^func .* mappings\(/m);
      if (begin < 0) throw new Error('Missing exported server method registry');
      const after = source.indexOf('\nfunc ', begin + 1);
      const mapping = source.slice(begin, after < 0 ? source.length : after);
      for (const match of mapping.matchAll(/^\s*"(\w+)":\s*\w+\.(\w+)\(r\),/gm)) {
        if (!methods.has(match[2])) throw new Error(`Missing implementation for ${match[1]}`);
        result[name][match[1]] = [file, methods.get(match[2])];
      }
      if (name === 'Nakama') {
        if (!methods.has('getSatori')) throw new Error('Missing separate Satori constructor');
        result[name].getSatori = [file, methods.get('getSatori')];
      }
    }
    if (Object.keys(result[name]).length < (name === 'MatchDispatcher' ? 4 : 100)) throw new Error(`Incomplete ${name} source extraction`);
  }
  fs.writeFileSync(SURFACE, JSON.stringify(result, null, 2) + '\n');
  console.log(`Refreshed server surface from Nakama ${version} (${result.commit}). Review API gaps before accepting changes.`);
}

export function generateReference({ check = false } = {}) {
  const surface = JSON.parse(fs.readFileSync(SURFACE, 'utf8'));
  if (surface.format !== 1 || surface.version !== serverVersion()) throw new Error('Server version changed; run nakama-reference.mjs --refresh-server and review.');
  const runtimeSource = read(RUNTIME), runtime = parseRuntime(runtimeSource);
  const inputFiles = [RUNTIME, 'docs/nakama/server-surface.json'];
  const sdkFiles = ['Nakama.gd', 'client/NakamaClient.gd', 'socket/NakamaSocket.gd', 'api/NakamaSession.gd',
    'client/NakamaHTTPAdapter.gd', 'socket/NakamaSocketAdapter.gd', 'utils/NakamaMultiplayerBridge.gd', 'utils/NakamaMultiplayerPeer.gd',
    'utils/NakamaAsyncResult.gd', 'utils/NakamaException.gd', 'utils/NakamaLogger.gd', 'utils/NakamaSerializer.gd'];
  const satoriFiles = ['Satori.gd', 'Satori/SatoriClient.gd', 'Satori/SatoriSession.gd'];
  const lock = JSON.parse(read('server/package-lock.json'));
  const hashes = {
    defaultServerVersion: digest(serverVersion()),
    lockedRuntime: digest(JSON.stringify(lock.packages['node_modules/nakama-runtime'])),
    lockedCompiler: digest(JSON.stringify(lock.packages['node_modules/typescript'])),
  };
  const header = title => `# ${title}\n\nGenerated by \`node tools/nakama-reference.mjs\`. Do not edit. Read [the entry guide](README.md) first and load only the section needed. Signatures show availability, not authorization, product licensing, or tested game behavior.\n\n`;
  let sdk = header('Pinned Godot SDK API');
  for (const [section, files] of [['Nakama', sdkFiles], ['Satori (separate product; not configured)', satoriFiles]]) {
    sdk += `## ${section}\n\n`;
    for (const file of files) {
      const relative = SDK + file, source = read(relative); inputFiles.push(relative);
      sdk += `### ${path.basename(file, '.gd')}\n\n[Implementation](${sourceLink(relative, 1)}). Public top-level methods (including constructor), properties, signals and enums; inherited engine methods and private helpers are omitted. Read the implementation for defaults, return models and enum values. Some return types are only annotated in upstream comments.\n\n`;
      sdk += parseGodot(source).map(entry => `- ${code(entry.signature)} — [source](${sourceLink(relative, entry.line)})`).join('\n') + '\n\n';
    }
  }
  sdk += '## Generated response and realtime model types\n\nRead the linked class for fields and serialization. Generated transport/serializer internals are not application APIs.\n\n';
  for (const file of ['api/NakamaAPI.gd', 'api/NakamaRTAPI.gd', 'Satori/SatoriAPI.gd']) {
    const relative = SDK + file, source = read(relative); inputFiles.push(relative);
    sdk += `### ${path.basename(file, '.gd')}\n\n`;
    sdk += [...source.matchAll(/^\s*class (\w+)\s+extends /gm)].map(match => `- [${match[1]}](${sourceLink(relative, source.slice(0, match.index + match[0].indexOf('class')).split('\n').length)})`).join('\n') + '\n\n';
  }
  let api = header('Pinned TypeScript runtime API');
  api += `Server: **${surface.version}** at [${surface.commit.slice(0, 12)}](https://github.com/heroiclabs/nakama/tree/${surface.commit}). Runtime package: **${JSON.parse(read('server/node_modules/nakama-runtime/package.json')).version}**. The default image version is not evidence about a game's selected env or running server.\n\n`;
  const detailed = runtime.filter(entry => ['Nakama', 'Initializer', 'MatchDispatcher', 'MatchHandler', 'Logger', 'Satori', 'InitModule'].includes(entry.name) || entry.name.endsWith('Function'));
  for (const entry of detailed) {
    api += `## ${entry.name}${entry.name === 'Satori' ? ' (separate product)' : ''}\n\n[Declaration](${sourceLink(RUNTIME, entry.line)}).\n\n`;
    api += entry.members.map(member => {
      const location = surface[entry.name]?.[member.name];
      return `- ${code(member.signature)} — [types](${sourceLink(RUNTIME, member.line)})${location ? ` · [server implementation](${upstream(surface, location)})` : ''}`;
    }).join('\n') + '\n\n';
  }
  api += '## All runtime type declarations\n\nIncludes request/response models, hook envelopes, config types, permissions and codes. Search the name, then read its exact definition. Types live under ignored node_modules; run `build` first in a fresh clone, or follow the immutable upstream types link in the entry guide.\n\n';
  api += runtime.map(entry => `- [${entry.name}](${sourceLink(RUNTIME, entry.line)}) (${entry.kind})`).join('\n') + '\n';
  let gaps = header('Server and runtime declaration differences');
  gaps += 'This compares exported JavaScript registry names with the installed declarations. A matching name does not establish argument/return correctness or SDK coverage. These are evidence for investigation, not permission to cast to `any`, patch the vendor files, or enable unrequested features. Server-only entries need a reviewed type adapter and behavioral proof before use; declaration-only entries must not be called without verifying the implementation name.\n\n';
  for (const name of ['Nakama', 'Initializer', 'MatchDispatcher']) {
    const members = runtime.find(entry => entry.name === name)?.members || [];
    const declared = new Set(members.map(member => member.name));
    const exported = surface[name];
    gaps += `## ${name}\n\n`;
    gaps += '### Exported by server; missing from declarations\n\n';
    gaps += Object.keys(exported).filter(key => !declared.has(key)).map(key => `- [${key}](${upstream(surface, exported[key])})`).join('\n') || 'None.';
    gaps += '\n\n### Declared; absent from this server registry\n\n';
    gaps += members.filter(member => !Object.hasOwn(exported, member.name)).map(member => `- [${member.name}](${sourceLink(RUNTIME, member.line)})`).join('\n') || 'None.';
    gaps += '\n\n### Duplicate declarations / overloads to inspect\n\n';
    const repeated = [...declared].filter(key => members.filter(member => member.name === key).length > 1);
    gaps += repeated.map(key => '- ' + code(key)).join('\n') || 'None.';
    gaps += '\n\n';
  }
  for (const file of inputFiles) hashes[file] = digest(read(file));
  const stamp = '\n<!-- Source SHA-256 fingerprints: ' + JSON.stringify(hashes) + ' -->\n';
  for (const [name, contents] of [['sdk-reference.md', sdk], ['runtime-reference.md', api], ['api-gaps.md', gaps]]) {
    const file = path.join(FOLDER, name), expected = contents + stamp;
    if (check) {
      if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== expected) throw new Error(`${name} is stale. Run node tools/nakama-reference.mjs and review the diff.`);
    } else fs.writeFileSync(file, expected);
  }
  console.log(`Nakama reference ${check ? 'verified' : 'generated'}: ${sdkFiles.length} SDK surfaces, ${runtime.length} runtime types, ${Object.keys(surface.Nakama).length} server functions, ${Object.keys(surface.Initializer).length} initializer entries.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.some(arg => !['--check', '--refresh-server'].includes(arg)) || (args.includes('--check') && args.includes('--refresh-server'))) throw new Error('Usage: node tools/nakama-reference.mjs [--check | --refresh-server]');
    if (args.includes('--refresh-server')) await refreshServerSurface();
    generateReference({ check: args.includes('--check') });
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
