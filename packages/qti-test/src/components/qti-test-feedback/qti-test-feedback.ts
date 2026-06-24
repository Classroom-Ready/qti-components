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

  /**
   * For `access="atEnd"`: whether the feedback's outcome has matched and it is
   * ready to be shown. While available, the feedback stays hidden until a
   * test-show-feedback button navigates the candidate to it. `during` feedback
   * ignores this flag and shows the instant its outcome matches.
   */
  @state()
  private _available = false;

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
    // they move into another part it should disappear and stop being offered.
    if (ownPartId && activePartId && activePartId !== ownPartId) {
      this.#setAvailable(false, ownPartId);
      this.showStatus = 'off';
      return;
    }

    // Re-evaluate the matched outcome only on an explicit checkShowFeedback()
    // call — feedback must not re-evaluate on every context tick.
    if (trigger && !(this.access === 'atEnd' && (!trigger.atEnd || trigger.partId !== ownPartId))) {
      const isFound = this.#outcomeMatches();
      const shown = (isFound && this.showHide === 'show') || (!isFound && this.showHide === 'hide');

      if (this.access === 'during') {
        // during-feedback shows the instant its outcome matches.
        this.showStatus = shown ? 'on' : 'off';
        return;
      }

      // atEnd: becoming "available" only unlocks the button; it does not show.
      this.#setAvailable(shown, ownPartId);
    }

    // atEnd visibility is driven by navigation: the feedback shows only while
    // the candidate has navigated to it (test-show-feedback), and hides as soon
    // as they navigate to any item — handled by the navigation mixin clearing
    // navFeedbackIdentifier.
    if (this.access === 'atEnd') {
      const navTarget = this._sessionContext?.navFeedbackIdentifier ?? null;
      this.showStatus = this._available && navTarget === this.identifier ? 'on' : 'off';
    }
  }

  /** Whether this feedback's outcome variable currently includes its identifier. */
  #outcomeMatches(): boolean {
    const outcomeVariable = this._testContext?.testOutcomeVariables?.find(v => v.identifier === this.outcomeIdentifier);
    if (!outcomeVariable) return false;
    return Array.isArray(outcomeVariable.value)
      ? outcomeVariable.value.includes(this.identifier)
      : !!this.identifier && outcomeVariable.value != null && this.identifier === outcomeVariable.value;
  }

  /** Update availability and announce the change so test-show-feedback can enable. */
  #setAvailable(available: boolean, partId: string | null): void {
    if (this._available === available) return;
    this._available = available;
    this.dispatchEvent(
      new CustomEvent('qti-test-feedback-availability-changed', {
        detail: { identifier: this.identifier, partId, available },
        bubbles: true,
        composed: true
      })
    );
  }

  override render() {
    return html`<div ?hidden=${this.showStatus !== 'on'}><slot></slot></div>`;
  }
}

export type QtiTestFeedbackAvailabilityChangedEvent = CustomEvent<{
  identifier: string;
  partId: string | null;
  available: boolean;
}>;

declare global {
  interface HTMLElementTagNameMap {
    'qti-test-feedback': QtiTestFeedback;
  }
  interface GlobalEventHandlersEventMap {
    'qti-test-feedback-availability-changed': QtiTestFeedbackAvailabilityChangedEvent;
  }
}
