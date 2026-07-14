import { expect, describe, it, beforeEach, afterEach, vi } from 'vitest';

import './test-navigation';

import type { TestNavigation } from './test-navigation';
import type { ComputedContext } from '@qti-components/base';

/**
 * Behaviour of the opt-in `reveal-correction` flag on <test-navigation>: after
 * each ended attempt it marks the candidate's wrong selection (candidate
 * correction), and once the item's attempts are exhausted while still incorrect
 * it also reveals the correct answer. Driven entirely by the SCORE / numAttempts
 * on the processed item context plus the item's max-attempts.
 */
describe('TestNavigation reveal-correction', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  // A computed context whose single item carries the given max-attempts — this
  // is what #maxAttemptsFor reads to decide when attempts are exhausted.
  const contextWithMaxAttempts = (maxAttempts: number): ComputedContext =>
    ({
      view: 'candidate',
      identifier: 'test',
      title: 'Test',
      testParts: [
        {
          active: true,
          identifier: 'part1',
          navigationMode: 'nonlinear',
          submissionMode: 'individual',
          sections: [
            {
              active: true,
              identifier: 'section1',
              title: 'Section 1',
              navigationMode: 'nonlinear',
              submissionMode: 'individual',
              items: [{ identifier: 'item1', active: true, categories: [], maxAttempts }]
            }
          ]
        }
      ]
    }) as unknown as ComputedContext;

  // Mount a <test-navigation> with a stubbed assessment item inside it, so a
  // bubbling qti-item-context-updated event resolves back to the item via
  // composedPath()…closest('qti-assessment-item').
  const mount = async (revealCorrection: boolean, maxAttempts: number) => {
    const nav = document.createElement('test-navigation') as TestNavigation;
    // The only non-optional context read in willUpdate; empty items is enough.
    (nav as unknown as { _testContext: unknown })._testContext = { items: [] };
    nav.revealCorrection = revealCorrection;
    container.appendChild(nav);

    const item = document.createElement('qti-assessment-item');
    const showCandidateCorrection = vi.fn();
    const showCorrectResponse = vi.fn();
    Object.assign(item, { showCandidateCorrection, showCorrectResponse });
    nav.appendChild(item);

    // Set after appending so the (optional) connected-item rebuild can't clobber it.
    (nav as unknown as { computedContext: ComputedContext }).computedContext = contextWithMaxAttempts(maxAttempts);
    await nav.updateComplete;

    return { item, showCandidateCorrection, showCorrectResponse };
  };

  const endAttempt = (
    item: HTMLElement,
    {
      score,
      numAttempts,
      responseProcessed = true
    }: { score: number; numAttempts: number; responseProcessed?: boolean }
  ) => {
    item.dispatchEvent(
      new CustomEvent('qti-item-context-updated', {
        bubbles: true,
        composed: true,
        detail: {
          responseProcessed,
          itemContext: {
            identifier: 'item1',
            variables: [
              { identifier: 'SCORE', value: `${score}` },
              { identifier: 'numAttempts', value: `${numAttempts}` }
            ]
          }
        }
      })
    );
  };

  it('marks the wrong answer (accumulating) but does not reveal the correct one before attempts are exhausted', async () => {
    const { item, showCandidateCorrection, showCorrectResponse } = await mount(true, 2);

    endAttempt(item, { score: 0, numAttempts: 1 });

    // accumulate=true so an earlier wrong pick stays marked across attempts…
    expect(showCandidateCorrection).toHaveBeenCalledWith(true, true);
    // …and the item is opted out of the on-change auto-clear so it persists.
    expect((item as unknown as { persistCandidateCorrection: boolean }).persistCandidateCorrection).toBe(true);
    expect(showCorrectResponse).toHaveBeenCalledWith(false);
  });

  it('reveals the correct answer once attempts are exhausted and still incorrect', async () => {
    const { item, showCandidateCorrection, showCorrectResponse } = await mount(true, 2);

    endAttempt(item, { score: 0, numAttempts: 2 });

    expect(showCandidateCorrection).toHaveBeenCalledWith(true, true);
    expect(showCorrectResponse).toHaveBeenCalledWith(true);
  });

  it('marks the correct pick and reveals the correct answer on a correct attempt', async () => {
    const { item, showCandidateCorrection, showCorrectResponse } = await mount(true, 2);

    endAttempt(item, { score: 1, numAttempts: 1 });

    // Still marks the candidate's pick (accumulate keeps earlier ✘)…
    expect(showCandidateCorrection).toHaveBeenCalledWith(true, true);
    // …and reveals the correct answer (✔) as soon as they get it right.
    expect(showCorrectResponse).toHaveBeenCalledWith(true);
  });

  it('does nothing when reveal-correction is not set', async () => {
    const { item, showCandidateCorrection, showCorrectResponse } = await mount(false, 2);

    endAttempt(item, { score: 0, numAttempts: 2 });

    expect(showCandidateCorrection).not.toHaveBeenCalled();
    expect(showCorrectResponse).not.toHaveBeenCalled();
  });

  it('ignores plain selections that are not a processed attempt', async () => {
    const { item, showCandidateCorrection, showCorrectResponse } = await mount(true, 2);

    endAttempt(item, { score: 0, numAttempts: 1, responseProcessed: false });

    expect(showCandidateCorrection).not.toHaveBeenCalled();
    expect(showCorrectResponse).not.toHaveBeenCalled();
  });
});
