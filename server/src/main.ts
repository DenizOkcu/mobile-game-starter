// Nakama runs this ES5 bundle, not Node.js. Keep named global RPC adapters.
interface PlayerState {
  schema_version: number;
  display_name: string;
  coins: number;
  tutorial_completed: boolean;
  created_at: number;
  updated_at: number;
}

interface PlayerRecord {
  state: PlayerState;
  version: string;
}

const COLLECTION = 'player';
const KEY = 'state';

function fail(message: string, code: nkruntime.Codes = nkruntime.Codes.INVALID_ARGUMENT): never {
  throw { message: message, code: code };
}

function authenticatedUser(ctx: nkruntime.Context): string {
  if (!ctx.userId) fail('Authentication required', nkruntime.Codes.UNAUTHENTICATED);
  return ctx.userId;
}

function intent(payload: string | undefined, allowed: string[]): Record<string, unknown> {
  let data: unknown;
  try {
    data = JSON.parse(payload || '');
  } catch (_) {
    fail('Invalid JSON');
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) fail('Expected JSON object');
  Object.keys(data).forEach(function (key) {
    if (allowed.indexOf(key) === -1) fail('Unknown field: ' + key);
  });
  return data as Record<string, unknown>;
}

function read(nk: nkruntime.Nakama, userId: string): PlayerRecord | null {
  const object = nk.storageRead([{ collection: COLLECTION, key: KEY, userId: userId }])[0];
  if (!object) return null;
  if (object.value.schema_version !== 1) fail('Unsupported player schema', nkruntime.Codes.FAILED_PRECONDITION);
  return { state: object.value as unknown as PlayerState, version: object.version };
}

function save(nk: nkruntime.Nakama, userId: string, state: PlayerState, version: string): void {
  state.updated_at = Math.floor(Date.now() / 1000);
  try {
    nk.storageWrite([{ collection: COLLECTION, key: KEY, userId: userId,
      value: state, version: version, permissionRead: 0, permissionWrite: 0 }]);
  } catch (_) {
    // Do not replay mutations; the client must reconcile an unknown outcome.
    fail('State changed or storage unavailable; refresh and try again', nkruntime.Codes.ABORTED);
  }
}

function load(nk: nkruntime.Nakama, userId: string): PlayerRecord {
  let record = read(nk, userId);
  if (record) return record;
  const now = Math.floor(Date.now() / 1000);
  const state: PlayerState = { schema_version: 1, display_name: 'Player', coins: 0,
    tutorial_completed: false, created_at: now, updated_at: now };
  try {
    save(nk, userId, state, '*');
  } catch (_) {
    // Another bootstrap may have won creation; read its canonical record.
  }
  record = read(nk, userId);
  if (!record) fail('Player initialization unavailable', nkruntime.Codes.UNAVAILABLE);
  return record;
}

function snapshot(nk: nkruntime.Nakama, userId: string): string {
  return JSON.stringify({ state: load(nk, userId).state, server_time: Math.floor(Date.now() / 1000) });
}

const getState: nkruntime.RpcFunction = function (ctx, _logger, nk, payload) {
  const userId = authenticatedUser(ctx);
  intent(payload, []);
  return snapshot(nk, userId);
};

const updateProfile: nkruntime.RpcFunction = function (ctx, _logger, nk, payload) {
  const userId = authenticatedUser(ctx);
  const data = intent(payload, ['display_name']);
  const name = data.display_name;
  if (typeof name !== 'string' || name.length < 1 || name.length > 24 ||
      !/^[A-Za-z0-9 _-]+$/.test(name) || !/[A-Za-z0-9]/.test(name)) {
    fail('Name must be 1-24 ASCII letters, numbers, spaces, _ or -');
  }
  const record = load(nk, userId);
  record.state.display_name = name;
  save(nk, userId, record.state, record.version);
  return snapshot(nk, userId);
};

const completeTutorial: nkruntime.RpcFunction = function (ctx, _logger, nk, payload) {
  const userId = authenticatedUser(ctx);
  intent(payload, []);
  const record = load(nk, userId);
  if (!record.state.tutorial_completed) {
    record.state.tutorial_completed = true;
    record.state.coins += 10;
    save(nk, userId, record.state, record.version);
  }
  return snapshot(nk, userId);
};

const InitModule: nkruntime.InitModule = function (_ctx, _logger, _nk, initializer) {
  initializer.registerRpc('get_state', getState);
  initializer.registerRpc('update_profile', updateProfile);
  initializer.registerRpc('complete_tutorial', completeTutorial);
};
