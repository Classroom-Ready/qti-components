import type { QtiOutcomeProcessing } from '../components/qti-outcome-processing/qti-outcome-processing';
import type {
  ComputedContext,
  ItemContext,
  OutcomeVariable,
  ResponseVariable,
  VariableDeclaration
} from '@qti-components/base';
import type { TestBaseInterface } from './test-base';

type Constructor<T = {}> = abstract new (...args: any[]) => T;

declare class TestProcessingInterface {
  updateOutcomeVariable(identifier: string, value: string | string[] | undefined): void;
  getOutcome(identifier: string): Readonly<OutcomeVariable>;
  getVariable(identifier: string): Readonly<VariableDeclaration<string | string[] | null>>;
  outcomeProcessing(options?: { atEnd?: boolean; partId?: string }): boolean;
}
export const TestProcessingMixin = <T extends Constructor<TestBaseInterface>>(superClass: T) => {
  abstract class TestProcessingElement extends superClass implements TestProcessingInterface {
    constructor(...args: any[]) {
      super(...args);
      this.addEventListener('qti-register-variable', (e: CustomEvent<{ variable: any }>) => {
        this.testContext = {
          ...this.testContext,
          testOutcomeVariables: [...(this.testContext.testOutcomeVariables || []), e.detail.variable]
        };
        e.stopPropagation();
      });
      // wordt aangeroepen vanuit de processingtemplate
      this.addEventListener(
        'qti-set-outcome-value',
        (e: CustomEvent<{ outcomeIdentifier: string; value: string | string[] }>) => {
          const { outcomeIdentifier, value } = e.detail;
          this.updateOutcomeVariable(outcomeIdentifier, value);
          e.stopPropagation();
        }
      );
      // After each item update, check whether a qti-test-part — or the whole
      // test — has just become complete. Each conclusion fires its own
      // outcomeProcessing run so the matching atEnd feedback evaluates.
      // Fires at most once per part, and at most once for the test.
      this.addEventListener('qti-item-context-updated', () => this.#checkCompletions());
      // qti-testdoc-loaded fires when a new testDoc has been assigned — reset
      // the per-test latches so the new test starts with no parts ended.
      this.addEventListener('qti-testdoc-loaded', () => {
        this.#endedParts.clear();
        this.#testEnded = false;
      });
    }

    /** Test-parts whose end-of-part processing has already fired. */
    #endedParts = new Set<string>();
    /** Whether end-of-test processing has already fired. */
    #testEnded = false;

    #checkCompletions(): void {
      if (!this._testElement) return;
      const parts = Array.from(this._testElement.querySelectorAll('qti-test-part'));
      const partsWithItems = parts.filter(p => p.querySelectorAll('qti-assessment-item-ref').length > 0);

      for (const part of partsWithItems) {
        const partId = part.getAttribute('identifier');
        if (!partId || this.#endedParts.has(partId)) continue;
        const itemRefs = Array.from(part.querySelectorAll('qti-assessment-item-ref'));
        if (!this.#itemsAllDone(itemRefs)) continue;
        this.#endedParts.add(partId);
        this.outcomeProcessing({ atEnd: true, partId });
      }

      // Once every test-part has fired its end-of-part signal, the whole
      // test is over too — fire end-of-test so test-root atEnd feedback
      // evaluates.
      if (
        !this.#testEnded &&
        partsWithItems.length > 0 &&
        partsWithItems.every(p => this.#endedParts.has(p.getAttribute('identifier') ?? ''))
      ) {
        this.#testEnded = true;
        this.outcomeProcessing({ atEnd: true });
      }
    }

    #itemsAllDone(itemRefs: Element[]): boolean {
      if (itemRefs.length === 0) return false;
      return itemRefs.every(ref => {
        const categories = (ref.getAttribute('category') ?? '').split(/\s+/).filter(Boolean);
        if (categories.includes('info')) return true;
        // numAttempts > 0: completionStatus flips to 'completed' on a valid
        // response (e.g. a radio click), but the candidate must actually end
        // the attempt before the item counts.
        const id = ref.getAttribute('identifier');
        const item = this.testContext.items.find(i => i.identifier === id);
        if (!item) return false;
        const numAttempts = Number(item.variables.find(v => v.identifier === 'numAttempts')?.value) || 0;
        if (numAttempts === 0) return false;
        // Treat the submitted attempt as the candidate's final answer unless
        // we can prove it's wrong AND they still have attempts left. We can
        // only prove "wrong" for items that declare a correct response; for
        // items where we don't know (essays, etc.) we assume final.
        const correctness = this.#assessCorrectness(item);
        if (correctness !== 'incorrect') return true;
        // Known wrong → give them up to maxAttempts before assuming final.
        // maxAttempts === 0 means unlimited per QTI 3 spec.
        const maxAttempts = this.#getMaxAttempts(id) ?? 1;
        return maxAttempts > 0 && numAttempts >= maxAttempts;
      });
    }

    #assessCorrectness(item: ItemContext): 'unknown' | 'correct' | 'incorrect' {
      // Bookkeeping variables like numAttempts can be typed 'response' but
      // never declare a correctResponse — filter on declared correctResponse
      // to find only the variables we can judge.
      const responseVars = item.variables.filter(
        (v): v is ResponseVariable =>
          v.type === 'response' &&
          (v as ResponseVariable).correctResponse !== undefined &&
          (v as ResponseVariable).correctResponse !== null
      );
      if (responseVars.length === 0) return 'unknown';
      const allMatch = responseVars.every(v => {
        const expected = v.correctResponse;
        const actual = v.value;
        if (actual === undefined || actual === null) return false;
        if (Array.isArray(expected) && Array.isArray(actual)) {
          return expected.length === actual.length && expected.every(e => actual.includes(e));
        }
        if (Array.isArray(expected) || Array.isArray(actual)) return false;
        return expected === actual;
      });
      return allMatch ? 'correct' : 'incorrect';
    }

    /**
     * maxAttempts already lives on computedContext (which test-navigation
     * builds by walking qti-item-session-control with the right inheritance).
     * Reach in via the test-navigation child rather than duplicate that walk
     * here. Returns undefined if there's no test-navigation or the item isn't
     * in its computedContext yet.
     */
    #getMaxAttempts(itemRefId: string | null): number | undefined {
      if (!itemRefId) return undefined;
      const testNav = this.querySelector('test-navigation') as
        | (HTMLElement & { computedContext?: ComputedContext })
        | null;
      const computedItem = testNav?.computedContext?.testParts
        ?.flatMap(tp => tp.sections.flatMap(s => s.items))
        ?.find(i => i.identifier === itemRefId);
      return computedItem?.maxAttempts;
    }

    outcomeProcessing(options: { atEnd?: boolean; partId?: string } = {}): boolean {
      const outcomeProcessor = this._testElement?.querySelector<QtiOutcomeProcessing>('qti-outcome-processing');
      if (!outcomeProcessor) return false;
      outcomeProcessor.process();
      // Dispatch from _testElement so qti-assessment-test receives it as the target
      // and qti-test still sees it via bubbling for external listeners.
      // The atEnd flag distinguishes the conclusion-of-test processing run
      // (which triggers qti-test-feedback access="atEnd") from in-flight runs.
      // The partId scopes which qti-test-feedback elements re-evaluate: when
      // present, only feedback inside the matching qti-test-part fires; when
      // absent, only test-root feedback fires.
      const target = this._testElement ?? this;
      target.dispatchEvent(
        new CustomEvent('qti-test-outcome-changed', {
          detail: { atEnd: options.atEnd === true, partId: options.partId ?? null },
          bubbles: true,
          composed: true
        })
      );
      return true;
    }

    /* --------------------------- ENABLED WHEN UNIT TESTING OUTCOME PROCESSING ------------------------------------ */

    public updateOutcomeVariable(identifier: string, value: string | string[] | undefined) {
      const outcomeVariable = this.getOutcome(identifier);
      if (!outcomeVariable) {
        console.warn(`Can not set qti-outcome-identifier: ${identifier}, it is not available`);
        return;
      }
      this.testContext = {
        ...this.testContext,
        testOutcomeVariables: this.testContext.testOutcomeVariables?.map(v => {
          if (v.identifier !== identifier) {
            return v;
          }
          return {
            ...v,
            value: outcomeVariable.cardinality === 'single' ? value : [...v.value, value as string]
          };
        })
      };
    }

    public getOutcome(identifier: string): Readonly<OutcomeVariable> {
      return this.getVariable(identifier) as OutcomeVariable;
    }
    public getVariable(identifier: string): Readonly<VariableDeclaration<string | string[] | null>> {
      return this.testContext.testOutcomeVariables?.find(v => v.identifier === identifier) || null;
    }
    /* --------------------------- ENABLED WHEN UNIT TESTING OUTCOME PROCESSING ------------------------------------ */
  }

  return TestProcessingElement as Constructor<TestProcessingInterface> & T;
};
