import { consume } from '@lit/context';

import { QtiExpression, testContext } from '@qti-components/base';

import type { QtiExpressionBase, TestContext } from '@qti-components/base';
import type { QtiAssessmentItemRef } from '../qti-assessment-item-ref/qti-assessment-item-ref';
import type { QtiAssessmentTest } from '../qti-assessment-test/qti-assessment-test';

// <qti-custom-operator definition="trim">
export class QtiTestVariables extends QtiExpression<number> {
  @consume({ context: testContext, subscribe: true })
  public _testContext?: TestContext;

  public override getResult() {
    // children can be a mix of qti-expression and qti-condition-expression
    const includedCategories = this.getAttribute('include-category')?.split(' ') ?? [];
    const excludedCategories = this.getAttribute('exclude-category')?.split(' ') ?? [];
    const weightIdentifier = this.getAttribute('weight-identifier') ?? '';
    const itemVariable = this.getAttribute('variable-identifier');

    // Item refs (with weight metadata) live on the qti-assessment-test, which is
    // rendered inside test-container's shadow DOM. testContext only has identifiers
    // and categories; for weight lookups we still need the assessment-test ref.
    const testElement = this.#findTestElement();
    const itemRefByIdentifier = new Map<string, QtiAssessmentItemRef>();
    testElement
      ?.querySelectorAll<QtiAssessmentItemRef>('qti-assessment-item-ref')
      .forEach(ref => itemRefByIdentifier.set(ref.identifier, ref));

    const includedItems = (this._testContext?.items ?? [])
      .filter(item => {
        let include = true;
        if (includedCategories.length > 0) {
          include = includedCategories.includes(item.category);
        }
        if (excludedCategories.length > 0) {
          include = !excludedCategories.includes(item.category);
        }
        return include;
      })
      .map(item => {
        let weight = 1;
        if (weightIdentifier) {
          const weightVariable = itemRefByIdentifier.get(item.identifier)?.weigths.get(weightIdentifier);
          if (weightVariable !== null && weightVariable !== undefined) {
            weight = weightVariable;
          }
        }
        return { item: item.identifier, weight };
      });

    const logic = new QtiTestVariablesExpression(this._testContext, itemVariable, includedItems);
    return logic.calculate();
  }

  public override calculate() {
    return this.getResult();
  }

  #findTestElement(): QtiAssessmentTest | null {
    const qtiTest = this.closest('qti-test');
    return qtiTest?._testElement ?? null;
  }
}

export class QtiTestVariablesExpression implements QtiExpressionBase<number> {
  constructor(
    private testContext: TestContext,
    private itemVariable: string,
    private includedItems: { item: string; weight: number }[]
  ) {}

  calculate(): number {
    const { items } = this.testContext;
    let total = 0;
    const uniqueItems = [...new Set(this.includedItems.map(item => item.item))];
    items.forEach(item => {
      if (uniqueItems.includes(item.identifier)) {
        const variable = item.variables.find(vr => vr.identifier === this.itemVariable);
        const weight = this.includedItems.find(i => i.item === item.identifier)?.weight ?? 1;
        if (variable) {
          total += Number(variable.value) * weight;
        }
      }
    });
    return total;
  }
}

customElements.define('qti-test-variables', QtiTestVariables);

declare global {
  interface HTMLElementTagNameMap {
    'qti-test-variables': QtiTestVariables;
  }
}
