import { expect, describe, it } from 'vitest';

import { createCorrectionRegistry } from './correction-registry';
import { QtiSimpleChoiceCorrection } from './elements/index';
import { TestNavigationCorrection } from './components/test-correction-elements';

/**
 * The correction elements register under the standard QTI tag names, so they can
 * only live in a scoped registry — the standard packages' own constructors stay
 * correction-free. `createCorrectionRegistry` assembles that registry, which is
 * the only way a consumer of the published package can reach the correction
 * behaviour: it is handed to a shadow root (`attachShadow`) or to an
 * item-container / test-container via `customElementRegistry`.
 *
 * A factory rather than a shared instance: `new CustomElementRegistry()` throws
 * in a browser without scoped-registry support, so constructing it must be the
 * caller's decision rather than a side effect of importing the package.
 */
describe('createCorrectionRegistry', () => {
  it('resolves overridden tags to the correction constructor', () => {
    const registry = createCorrectionRegistry();

    expect(registry.get('test-navigation')).toBe(TestNavigationCorrection);
    expect(registry.get('qti-simple-choice')).toBe(QtiSimpleChoiceCorrection);
  });

  it('resolves tags with no correction variant to the standard constructor', async () => {
    const { QtiAssessmentSection } = await import('@qti-components/test/elements');
    const registry = createCorrectionRegistry();

    expect(registry.get('qti-assessment-section')).toBe(QtiAssessmentSection);
  });

  it('returns an independent registry per call', () => {
    expect(createCorrectionRegistry()).not.toBe(createCorrectionRegistry());
  });
});
