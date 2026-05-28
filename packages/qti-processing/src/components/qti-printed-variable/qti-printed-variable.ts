import { consume } from '@lit/context';
import { html, LitElement, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';

import { itemContext, testContext } from '@qti-components/base';

import type { ItemContext, TestContext, VariableDeclaration } from '@qti-components/base';

export class QtiPrintedVariable extends LitElement {
  @property({ type: String })
  identifier: string;

  @consume({ context: itemContext, subscribe: true })
  @state()
  protected context?: ItemContext;

  @consume({ context: testContext, subscribe: true })
  @state()
  protected _testContext?: TestContext;

  override render() {
    const value = this.#closestVariable()?.value;
    if (value === null || value === undefined) return nothing;
    return html`${Array.isArray(value) ? value.join(' ') : value}`;
  }

  public calculate(): VariableDeclaration<string | string[]> {
    return this.#closestVariable() ?? null;
  }

  /**
   * Resolve the variable from the closest available scope: item-level first,
   * then test-level outcome variables. This lets the element work both inside
   * qti-feedback-block (item scope) and qti-test-feedback (test scope).
   */
  #closestVariable(): VariableDeclaration<string | string[] | null> | null {
    const itemVariable = this.context?.variables.find(v => v.identifier === this.identifier);
    if (itemVariable) return itemVariable;
    return this._testContext?.testOutcomeVariables?.find(v => v.identifier === this.identifier) ?? null;
  }
}

customElements.define('qti-printed-variable', QtiPrintedVariable);
