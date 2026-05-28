import { consume } from '@lit/context';
import { customElement, property, state } from 'lit/decorators.js';
import { css, html } from 'lit';

import { sessionContext, testContext } from '@qti-components/base';
import { QtiModalFeedback } from '@qti-components/elements';

import type { PropertyValues } from 'lit';
import type { SessionContext, TestContext } from '@qti-components/base';

export type TestFeedbackAccess = 'atEnd' | 'during';

@customElement('qti-test-feedback')
export class QtiTestFeedback extends QtiModalFeedback {
  static override styles = css`
    :host {
      color: gray;
    }
  `;

  /**
   * Per QTI 3 spec, controls when test feedback is presented.
   * - "atEnd": shown only at the conclusion of the test or test part.
   * - "during": shown while the test is still in progress, after each
   *   instance of outcome processing.
   */
  @property({ type: String, attribute: 'access' })
  public access: TestFeedbackAccess = 'atEnd';

  @consume({ context: testContext, subscribe: true })
  @state()
  private _testContext?: TestContext;

  @consume({ context: sessionContext, subscribe: true })
  @state()
  private _sessionContext?: SessionContext;

  public override checkShowFeedback(
    outcomeIdentifier: string,
    options: { atEnd?: boolean; partId?: string | null } = {}
  ): void {
    if (this.outcomeIdentifier !== outcomeIdentifier) return;
    this.willUpdate(new Map(), { atEnd: options.atEnd === true, partId: options.partId ?? null });
  }

  protected override willUpdate(
    changedProperties: PropertyValues,
    trigger?: { atEnd: boolean; partId: string | null }
  ): void {
    super.willUpdate?.(changedProperties);
    const ownPartId = this.closest('qti-test-part')?.getAttribute('identifier') ?? null;
    const activePartId = this._sessionContext?.navPartId ?? null;

    // A part-scoped feedback is the candidate's "end of part" screen; once
    // they move into another part it should disappear.
    if (ownPartId && activePartId && activePartId !== ownPartId) {
      this.showStatus = 'off';
      return;
    }

    // Only re-evaluate visibility on an explicit checkShowFeedback() call —
    // atEnd feedback must not toggle on every context tick.
    if (!trigger) return;
    if (this.access === 'atEnd' && (!trigger.atEnd || trigger.partId !== ownPartId)) return;

    const outcomeVariable = this._testContext?.testOutcomeVariables?.find(v => v.identifier === this.outcomeIdentifier);
    if (!outcomeVariable) return;

    const isFound = Array.isArray(outcomeVariable.value)
      ? outcomeVariable.value.includes(this.identifier)
      : !!this.identifier && outcomeVariable.value != null && this.identifier === outcomeVariable.value;

    this.showStatus = (isFound && this.showHide === 'show') || (!isFound && this.showHide === 'hide') ? 'on' : 'off';
  }

  override render() {
    return html`<div ?hidden=${this.showStatus !== 'on'}><slot></slot></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'qti-test-feedback': QtiTestFeedback;
  }
}
