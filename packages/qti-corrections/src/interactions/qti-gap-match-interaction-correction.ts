import { QtiGapMatchInteraction } from '@qti-components/gap-match-interaction/elements';

import { DragDropCorrectionMixin } from '../mixins/drag-drop-correction.mixin';
import { parsePairs, type CorrectableChoice } from './shared';

export class QtiGapMatchInteractionCorrection extends DragDropCorrectionMixin(QtiGapMatchInteraction) {
  /**
   * `accumulate` is threaded to the base implementation but changes nothing
   * here: these marks live on the drags currently placed in each gap, so they
   * already follow the candidate's placement and there is no earlier mark left
   * behind to keep.
   */
  public override toggleCandidateCorrection(show: boolean, accumulate = false): void {
    super.toggleCandidateCorrection(show, accumulate);
    const matches = parsePairs(this.correctResponse);

    for (const target of this.querySelectorAll('qti-gap')) {
      const targetId = target.getAttribute('identifier');
      const selectedChoices = (target as unknown as HTMLElement & { drags: readonly CorrectableChoice[] }).drags;
      for (const choice of selectedChoices) {
        choice.candidateCorrection = null;
        if (show && matches.some(match => match.source === choice.identifier && match.target === targetId)) {
          choice.candidateCorrection = 'correct';
        } else if (show) {
          choice.candidateCorrection = 'incorrect';
        }
      }
    }
  }
}
