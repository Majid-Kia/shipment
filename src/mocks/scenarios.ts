interface MutationFailureState {
  delay: number;
  failureRate: number;
  forcedResult: "failure" | "success" | null;
  randomState: number;
}

const DEFAULT_RANDOM_STATE = 0x5eed1234;
const state: MutationFailureState = {
  delay: 0,
  failureRate: 0.2,
  forcedResult: null,
  randomState: DEFAULT_RANDOM_STATE,
};
const mutationPreflightListeners = new Set<() => void>();

function nextRandom() {
  state.randomState = (state.randomState * 1_664_525 + 1_013_904_223) >>> 0;
  return state.randomState / 2 ** 32;
}

export function shouldFailMutation() {
  if (state.forcedResult) {
    const shouldFail = state.forcedResult === "failure";
    state.forcedResult = null;
    return shouldFail;
  }

  return nextRandom() < state.failureRate;
}

export function setMutationFailureRate(failureRate: number) {
  if (failureRate < 0 || failureRate > 1) {
    throw new RangeError("Mutation failure rate must be between 0 and 1.");
  }
  state.failureRate = failureRate;
}

export function getMutationDelay() {
  return state.delay;
}

export function waitForNextMutationPreflight() {
  return new Promise<void>((resolve) => {
    mutationPreflightListeners.add(resolve);
  });
}

export function notifyMutationPreflight() {
  for (const listener of mutationPreflightListeners) listener();
  mutationPreflightListeners.clear();
}

export function setMutationDelay(delay: number) {
  state.delay = delay;
}

export function forceNextMutationResult(result: "failure" | "success") {
  state.forcedResult = result;
}

export function resetMutationScenarios() {
  state.delay = 0;
  state.failureRate = 0.2;
  state.forcedResult = null;
  state.randomState = DEFAULT_RANDOM_STATE;
  mutationPreflightListeners.clear();
}
