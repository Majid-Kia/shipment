interface MutationFailureState {
  failureRate: number;
  forcedResult: "failure" | "success" | null;
  randomState: number;
}

const DEFAULT_RANDOM_STATE = 0x5eed1234;
const state: MutationFailureState = {
  failureRate: 0.2,
  forcedResult: null,
  randomState: DEFAULT_RANDOM_STATE,
};

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

export function forceNextMutationResult(result: "failure" | "success") {
  state.forcedResult = result;
}

export function resetMutationScenarios() {
  state.failureRate = 0.2;
  state.forcedResult = null;
  state.randomState = DEFAULT_RANDOM_STATE;
}
