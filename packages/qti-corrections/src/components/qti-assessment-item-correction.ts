import { QtiAssessmentItem } from '@qti-components/elements/elements';

type CorrectionInteraction = {
  toggleCorrectResponse(show: boolean): void;
  toggleCandidateCorrection(show: boolean, accumulate?: boolean): void;
};

/** Assessment-item extension that coordinates correction-capable interactions. */
export class QtiAssessmentItemCorrection extends QtiAssessmentItem {
  /**
   * Whether a response change should leave the candidate correction on screen.
   *
   * Not set directly: it is derived by `showCandidateCorrection`. Showing marks
   * in accumulate mode turns it on, so a mark survives the candidate picking
   * something else and the next attempt can add to it; hiding, or a plain
   * non-accumulating show, turns it back off.
   */
  #persistCandidateCorrection = false;
  public showCorrectResponse(show: boolean): void {
    for (const interaction of this.interactionElements) {
      (interaction as unknown as Partial<CorrectionInteraction>).toggleCorrectResponse?.(show);
    }

    this.updateControlState('item-show-correct-response', show);
  }

  /**
   * @param accumulate Add to the marks already on screen rather than recomputing
   *   them from the current response, so a wrong pick from an earlier attempt
   *   stays flagged. This is what an end-of-attempt review needs, so it also
   *   keeps the marks across the candidate's next selection.
   */
  public showCandidateCorrection(show: boolean, accumulate = false): void {
    this.#persistCandidateCorrection = show && accumulate;

    for (const interaction of this.interactionElements) {
      (interaction as unknown as Partial<CorrectionInteraction>).toggleCandidateCorrection?.(show, accumulate);
    }

    this.updateControlState('item-show-candidate-correction', show);
  }

  protected override afterResponseVariableUpdated(): void {
    if (this.#persistCandidateCorrection) return;
    this.showCandidateCorrection(false);
  }

  private updateControlState(selector: string, shown: boolean): void {
    let root = this.getRootNode();
    while (true) {
      (root as ParentNode)
        .querySelectorAll<HTMLElement & { shown: boolean }>(selector)
        .forEach(control => (control.shown = shown));

      if (!(root instanceof ShadowRoot)) return;
      root = root.host.getRootNode();
    }
  }
}
