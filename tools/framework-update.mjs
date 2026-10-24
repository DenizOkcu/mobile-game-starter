import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, readEnv } from './lib.mjs';

export const REPOSITORY = 'https://github.com/DenizOkcu/mobile-game-starter.git';
const LOCK = 'framework.lock.json';
const PENDING = 'framework-update.pending.json';
const PREFIX = 'refs/mobile-framework/';
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
function git(root, args, options = {}) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...options });
  if (result.error || result.status !== 0) throw new Error(`git ${args[0]} failed${result.stderr ? ': ' + result.stderr.trim() : ''}`);
  return result.stdout.replace(/\n$/, '');
}
function revision(root, ref) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(ref)) throw new Error('Invalid framework revision');
  return git(root, ['rev-parse', '--verify', `${ref}^{commit}`]);
}
function pendingPath(root) { return path.resolve(root, git(root, ['rev-parse', '--git-path', PENDING])); }
function clean(root) {
  if (git(root, ['status', '--porcelain'])) throw new Error('Commit or stash local changes before starting an update.');
}
function isAncestor(root, from, target) {
  const result = spawnSync('git', ['merge-base', '--is-ancestor', from, target], { cwd: root, encoding: 'utf8' });
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  throw new Error('Unable to compare framework revisions');
}
const version = name => /^v(\d+)\.(\d+)\.(\d+)$/.exec(name)?.slice(1).map(Number);
const compatible = (a, b) => a[0] === b[0] && (a[0] !== 0 || a[1] === b[1]);

// Record the template snapshot offline, before configure changes tracked files.
export function recordFrameworkBaseline(root = ROOT) {
  if (!fs.existsSync(path.join(root, 'framework.json')) || fs.existsSync(path.join(root, LOCK))) return;
  let tree;
  try {
    const roots = git(root, ['rev-list', '--max-parents=0', 'HEAD']).split('\n');
    if (roots.length !== 1) return;
    tree = git(root, ['rev-parse', `${roots[0]}^{tree}`]);
  } catch { return; } // A downloaded ZIP has no reliable source revision.
  write(path.join(root, LOCK), { format: 1, repository: REPOSITORY, template_tree: tree, source_revision: null });
}

// Private/generated/game-owned files never enter the automatic patch. Record
// their changes in the report so an assistant can adapt relevant interfaces.
export function preserved(file) {
  return file === LOCK || file === 'framework.json' || file === 'export_presets.cfg'
    || file === 'client/config.json' || file === 'framework-update-report.md'
    || /(^|\/)(\.env(?:\..*)?|\.setup|\.git|\.godot|node_modules|exports|backups)(\/|$)/.test(file) && file !== '.env.example'
    || /\.(keystore|jks|p12|p8|mobileprovision|pem|key)$/.test(file)
    || /^(client\/game|assets)(\/|$)/.test(file);
}

export function inspectUpdate({ root = ROOT, repository = REPOSITORY, to, baseline, fetch = true } = {}) {
  if (fetch) git(root, ['fetch', '--prune', '--no-tags', repository,
    `+refs/heads/main:${PREFIX}main`, `+refs/tags/*:${PREFIX}tags/*`]);
  const lock = fs.existsSync(path.join(root, LOCK)) ? json(path.join(root, LOCK)) : null;
  if (lock && (lock.format !== 1 || lock.repository !== REPOSITORY)) throw new Error('Unsupported framework baseline file');
  let from = baseline || lock?.source_revision;
  if (from && !/^[0-9a-f]{40,64}$/.test(from)) throw new Error('Baseline must be a full commit SHA');
  if (!from) {
    const roots = git(root, ['rev-list', '--max-parents=0', 'HEAD']).split('\n');
    const tree = lock?.template_tree || (roots.length === 1 && git(root, ['rev-parse', `${roots[0]}^{tree}`]));
    const commits = git(root, ['log', '--format=%H %T', `${PREFIX}main`]).split('\n');
    from = commits.find(line => line.split(' ')[1] === tree)?.split(' ')[0];
    if (!from) throw new Error('Cannot identify the original template snapshot. Review the initial game commit and rerun with --baseline FULL_SHA; never guess.');
  }
  from = revision(root, from);
  const refs = git(root, ['for-each-ref', '--format=%(refname:strip=3)', `${PREFIX}tags/`]).split('\n').filter(name => version(name));
  let current;
  try { current = JSON.parse(git(root, ['show', `${from}:framework.json`])).version; } catch { /* Legacy baseline: explicit release required. */ }
  const currentVersion = current && version('v' + current);
  if (!to) {
    if (!currentVersion) throw new Error('Legacy baseline: select a reviewed release with --to vX.Y.Z.');
    const candidates = refs.filter(name => compatible(currentVersion, version(name))).sort((a, b) => {
      const x = version(a), y = version(b); return y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
    });
    to = candidates.find(name => isAncestor(root, from, revision(root, `${PREFIX}tags/${name}`)));
    if (!to) return { format: 1, status: 'no-forward-release', from, target: null, release: null,
      notes: 'No forward compatible release is published for this baseline. It may be an unreleased template snapshot; keep it and retry after a newer release is published.',
      selected: [], skipped: [], patch: '' };
  }
  if (!refs.includes(to)) throw new Error('No matching published release. Use --to vX.Y.Z after the maintainer publishes a release tag.');
  const target = revision(root, `${PREFIX}tags/${to}`);
  if (!isAncestor(root, from, target)) throw new Error('The selected release is not a forward release from this baseline; refusing a downgrade or unrelated history.');
  const metadata = JSON.parse(git(root, ['show', `${target}:framework.json`]));
  if (metadata.format !== 1 || 'v' + metadata.version !== to) throw new Error('Release tag and framework.json version disagree');
  // Diff with rename detection disabled: each path is classified independently.
  const files = git(root, ['diff', '--no-renames', '--name-only', '-z', from, target]).split('\0').filter(Boolean);
  const skipped = files.filter(preserved), selected = files.filter(file => !preserved(file));
  const patch = selected.length ? git(root, ['diff', '--binary', '--full-index', '--no-renames', '--no-ext-diff', '--no-textconv', from, target, '--', ...selected]) + '\n' : '';
  const notes = git(root, ['show', `${target}:CHANGELOG.md`]);
  return { format: 1, status: from === target ? 'current' : 'update', from, target, release: to, notes, selected, skipped, patch };
}

export function applyUpdate(plan, { root = ROOT } = {}) {
  if (plan.status === 'no-forward-release') return console.log(plan.notes);
  clean(root);
  const pending = pendingPath(root);
  if (fs.existsSync(pending)) throw new Error('An update is already pending; resolve and finish it first.');
  if (plan.from === plan.target) return console.log('Already at the selected framework release.');
  const original = git(root, ['rev-parse', 'HEAD']);
  const branch = `codex/framework-${plan.release}-${plan.target.slice(0, 8)}`;
  git(root, ['switch', '-c', branch]);
  const { patch, ...state } = plan;
  const pendingState = { ...state, branch, original, application: 'applying' };
  write(pending, pendingState);
  fs.writeFileSync(path.join(root, 'framework-update-report.md'), `# Framework update to ${plan.release}\n\nFrom: ${plan.from}\nTarget: ${plan.target}\n\n## Apply and review\n\n${plan.selected.map(file => '- ' + file).join('\n') || 'No automatic file changes.'}\n\n## Preserved; review for interface or migration changes\n\n${plan.skipped.map(file => '- ' + file).join('\n') || 'None.'}\n\nReview release notes, configuration additions, client compatibility and migrations. Resolve conflicts and stage resolutions. If application failed or was interrupted, review every selected path and record the resolution with \`node tools/manage.mjs framework-update --resolve REASON\` before finishing. Then run \`node tools/manage.mjs framework-update --finish\`. Baseline remains unchanged until validation succeeds. No deployment is performed.\n`);
  try {
    if (patch) git(root, ['apply', '--3way', '--index', '--whitespace=nowarn', '-'], { input: patch });
    pendingState.application = 'applied';
  } catch (error) {
    pendingState.application = 'failed';
    write(pending, pendingState);
    throw error;
  }
  write(pending, pendingState);
  console.log(`Applied on ${branch}. Review framework-update-report.md, then run framework-update --finish.`);
}

export function resolveUpdate({ root = ROOT, reason } = {}) {
  const file = pendingPath(root);
  if (!fs.existsSync(file)) throw new Error('No pending framework update.');
  const state = json(file);
  if (state.format !== 1 || git(root, ['branch', '--show-current']) !== state.branch) throw new Error('Switch back to the pending update branch.');
  if (git(root, ['diff', '--name-only', '--diff-filter=U'])) throw new Error('Resolve and stage conflicts before recording a resolution.');
  if (state.application === 'applied') throw new Error('The patch applied successfully; review it and run --finish.');
  if (typeof reason !== 'string' || reason.trim().length < 12 || reason.length > 4000) throw new Error('Provide a resolution reason (12-4000 characters), including manually applied changes or paths intentionally retained.');
  state.resolution = { reason: reason.trim(), reviewed_paths: state.selected };
  // Persist the report first so a failed report write cannot unlock completion.
  fs.appendFileSync(path.join(root, 'framework-update-report.md'), `\n## Manual application resolution\n\n${state.resolution.reason}\n`);
  state.application = 'reviewed';
  write(file, state);
  console.log('Manual resolution recorded. Run --finish to validate before advancing the baseline.');
}

export function finishUpdate({ root = ROOT, validate = defaultValidation } = {}) {
  const file = pendingPath(root);
  if (!fs.existsSync(file)) throw new Error('No pending framework update.');
  const state = json(file);
  if (state.format !== 1 || git(root, ['branch', '--show-current']) !== state.branch) throw new Error('Switch back to the pending update branch.');
  if (git(root, ['diff', '--name-only', '--diff-filter=U'])) throw new Error('Resolve and stage conflicts before finishing.');
  if (!['applied', 'reviewed'].includes(state.application)) throw new Error('Patch application did not complete. Review all selected paths, manually apply missing changes or document retained paths, then run --resolve REASON before --finish.');
  git(root, ['diff', '--check']); git(root, ['diff', '--cached', '--check']);
  validate(root);
  write(path.join(root, LOCK), { format: 1, repository: REPOSITORY, source_revision: state.target, release: state.release, preserved_paths: state.skipped, manual_resolution: state.resolution });
  fs.unlinkSync(file);
  console.log('Validation passed; framework.lock.json updated. Review and commit the update branch. Device checks and deployment remain separate.');
}
function defaultValidation(root) {
  const env = readEnv(path.join(root, '.env'));
  const origin = new URL(env.CLIENT_API_URL);
  if (origin.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname)
    || (origin.port || '80') !== env.LOCAL_API_PORT) {
    throw new Error('Finish requires a local loopback CLIENT_API_URL matching LOCAL_API_PORT in .env; keep production config separate.');
  }
  for (const command of ['check', 'up', 'smoke']) {
    const result = spawnSync(process.execPath, ['tools/manage.mjs', command], { cwd: root, stdio: 'inherit' });
    if (result.error || result.status !== 0) throw new Error(`${command} failed; baseline remains unchanged. Fix and rerun --finish.`);
  }
}
export function frameworkUpdate(args, { root = ROOT } = {}) {
  if (args.includes('--help')) return console.log('Usage: node tools/manage.mjs framework-update [--to vX.Y.Z] [--baseline FULL_SHA] [--apply] | --resolve REASON | --finish\nDefault: fetch release metadata and preview; no game files change.');
  if (args.length === 1 && args[0] === '--finish') return finishUpdate({ root });
  if (args.length === 2 && args[0] === '--resolve') return resolveUpdate({ root, reason: args[1] });
  let to, baseline, apply = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--apply' && !apply) apply = true;
    else if (args[i] === '--to' && !to && args[i + 1]) to = args[++i];
    else if (args[i] === '--baseline' && !baseline && args[i + 1]) baseline = args[++i];
    else throw new Error('Unknown update option; run framework-update --help.');
  }
  const plan = inspectUpdate({ root, to, baseline });
  if (plan.status === 'no-forward-release') return console.log(`Baseline: ${plan.from}\n${plan.notes}`);
  console.log(`Framework update: ${plan.release}\nBaseline: ${plan.from}\nTarget: ${plan.target}\n\nRelease notes\n${plan.notes}\n\nApply and review\n${plan.selected.join('\n') || '(none)'}\n\nPreserved; review for required adaptations\n${plan.skipped.join('\n') || '(none)'}`);
  if (apply) applyUpdate(plan, { root });
}
