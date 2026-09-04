import { expect, describe, it, beforeEach, afterEach } from 'vitest';

import { QtiChoiceInteractionCorrection } from '../interactions/qti-choice-interaction-correction';

/**
 * Candidate correction accumulates across attempts: a wrong pick from an
 * earlier attempt stays flagged after the candidate picks something else, so
 * two wrong attempts leave two marks. Accumulation is opt-in per call — the
 * default still recomputes the marks from the current response, which is what
 * every non-review consumer relies on.
 */
if (!customElements.get('qti-choice-interaction')) {
  customElements.define('qti-choice-interaction', QtiChoiceInteractionCorrection);
}

describe('ChoiceCorrectionMixin accumulate', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => container.remove());

  type Choice = HTMLElement & {
    identifier: string;
    candidateCorrection: 'correct' | 'incorrect' | 'partially-correct' | null;
  };

  /**
   * A choice interaction with three choices and a known correct response,
   * standing in for a rendered item: `_choiceElements` and `response` are the
   * only surface the mixin reads, and `correctResponse` comes from the
   * standalone property rather than an item context.
   */
  const mountInteraction = async () => {
    const el = document.createElement('qti-choice-interaction') as unknown as HTMLElement & {
      correctResponse: string | string[];
      response: string | string[] | null;
      _choiceElements: Choice[];
      toggleCandidateCorrection(show: boolean, accumulate?: boolean): void;
      updateComplete: Promise<unknown>;
    };
    container.appendChild(el);
    await el.updateComplete;

    const choices = ['ChoiceA', 'ChoiceB', 'ChoiceC'].map(identifier => {
      const choice = document.createElement('div') as unknown as Choice;
      choice.identifier = identifier;
      choice.candidateCorrection = null;
      Object.defineProperty(choice, 'internals', { value: { states: new Set<string>() }, configurable: true });
      return choice;
    });

    el._choiceElements = choices;
    el.correctResponse = 'ChoiceC';
    // The interaction-level verdict reads `correctness`, which is derived from
    // the correct response; stub it so this spec stays about the per-choice marks.
    Object.defineProperty(el, 'correctness', { get: () => 'incorrect', configurable: true });

    const marksFor = () => Object.fromEntries(choices.map(choice => [choice.identifier, choice.candidateCorrection]));

    return { el, marksFor };
  };

  it('keeps an earlier wrong pick marked when accumulating', async () => {
    const { el, marksFor } = await mountInteraction();

    // Attempt 1: the candidate picks ChoiceA (wrong) and the attempt is scored.
    el.response = 'ChoiceA';
    el.toggleCandidateCorrection(true, true);
    expect(marksFor()).toMatchObject({ ChoiceA: 'incorrect', ChoiceB: null, ChoiceC: null });

    // Attempt 2: they pick ChoiceB (also wrong). ChoiceA stays flagged.
    el.response = 'ChoiceB';
    el.toggleCandidateCorrection(true, true);

    expect(marksFor()).toMatchObject({ ChoiceA: 'incorrect', ChoiceB: 'incorrect', ChoiceC: null });
  });

  it('replaces the marks when not accumulating', async () => {
    const { el, marksFor } = await mountInteraction();

    el.response = 'ChoiceA';
    el.toggleCandidateCorrection(true, true);
    expect(marksFor()).toMatchObject({ ChoiceA: 'incorrect' });

    // A plain, non-accumulating show recomputes from the current response only.
    el.response = 'ChoiceB';
    el.toggleCandidateCorrection(true);

    expect(marksFor()).toMatchObject({ ChoiceA: null, ChoiceB: 'incorrect', ChoiceC: null });
  });

  it('clears every accumulated mark when hiding', async () => {
    const { el, marksFor } = await mountInteraction();

    el.response = 'ChoiceA';
    el.toggleCandidateCorrection(true, true);
    el.response = 'ChoiceB';
    el.toggleCandidateCorrection(true, true);

    // Hiding always clears, regardless of mode.
    el.toggleCandidateCorrection(false, true);

    expect(marksFor()).toMatchObject({ ChoiceA: null, ChoiceB: null, ChoiceC: null });
  });

  it('marks the correct pick alongside earlier wrong ones', async () => {
    const { el, marksFor } = await mountInteraction();

    el.response = 'ChoiceA';
    el.toggleCandidateCorrection(true, true);

    // The candidate gets it right on a later attempt — the ✘ history remains.
    el.response = 'ChoiceC';
    el.toggleCandidateCorrection(true, true);

    expect(marksFor()).toMatchObject({ ChoiceA: 'incorrect', ChoiceB: null, ChoiceC: 'correct' });
  });
});
