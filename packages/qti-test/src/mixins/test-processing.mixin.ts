import type { QtiOutcomeProcessing } from '../components/qti-outcome-processing/qti-outcome-processing';
import type { OutcomeVariable, VariableDeclaration } from '@qti-components/base';
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
      // Completion detection lives in test-navigation (it already owns the
      // per-item view via computedContext); we just run outcome processing
      // when it tells us a part or the test has just transitioned to done.
      this.addEventListener('qti-part-completed', (e: CustomEvent<{ partId: string }>) => {
        this.outcomeProcessing({ atEnd: true, partId: e.detail.partId });
      });
      this.addEventListener('qti-test-completed', () => {
        this.outcomeProcessing({ atEnd: true });
      });
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
