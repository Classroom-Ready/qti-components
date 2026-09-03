import { expect, waitFor } from 'storybook/test';
import { html } from 'lit';

import { withCorrection } from '../kennisnet/with-correction';

import type { Meta, StoryObj } from '@storybook/web-components-vite';

type Story = StoryObj;

/**
 * Candidate correction accumulates across attempts. After each scored attempt the
 * player marks the candidate's pick, and — because an end-of-attempt review wants
 * the history, not just the latest guess — the mark stays put when they choose
 * something else. Two wrong attempts therefore leave two ✘ marks.
 *
 * Accumulation is opt-in per call: `toggleCandidateCorrection(show, accumulate)`.
 * The default still recomputes the marks from the current response, which is what
 * every non-review consumer relies on. `TestNavigationCorrection` passes
 * `accumulate` for items the assessment opted in via the QTI-standard
 * `qti-item-session-control show-solution`.
 */
const meta: Meta = {
  title: 'corrections/candidate correction accumulate',
  decorators: [withCorrection],
  parameters: {
    layout: 'padded',
    chromatic: { disableSnapshot: true }
  }
};

export default meta;

type CorrectableChoice = HTMLElement & {
  identifier: string;
  candidateCorrection: 'correct' | 'incorrect' | 'partially-correct' | null;
};

type CorrectableInteraction = HTMLElement & {
  response: string | string[] | null;
  toggleCandidateCorrection(show: boolean, accumulate?: boolean): void;
};

/**
 * The story renders inside the correction registry's shadow root, so neither
 * `document` nor a plain `canvasElement.querySelector` reaches it — walk the
 * shadow trees instead.
 */
const deepQuery = <T extends HTMLElement>(root: ParentNode, selector: string): T | null => {
  const direct = root.querySelector<T>(selector);
  if (direct) return direct;
  for (const child of Array.from(root.querySelectorAll('*'))) {
    const shadow = (child as HTMLElement).shadowRoot;
    if (!shadow) continue;
    const found = deepQuery<T>(shadow, selector);
    if (found) return found;
  }
  return null;
};

// The correct answer is ChoiceC; ChoiceA and ChoiceB are both wrong.
const question = html`
  <qti-item-body>
    <p style="margin-block-end:1.5rem">
      <strong>Two wrong attempts, then the right one — every pick keeps its mark.</strong>
    </p>
    <qti-choice-interaction
      id="accumulating"
      response-identifier="RESPONSE"
      shuffle="false"
      max-choices="1"
      correct-response="ChoiceC"
    >
      <qti-prompt>Which of these is a prime number?</qti-prompt>
      <qti-simple-choice identifier="ChoiceA">9</qti-simple-choice>
      <qti-simple-choice identifier="ChoiceB">15</qti-simple-choice>
      <qti-simple-choice identifier="ChoiceC">17</qti-simple-choice>
    </qti-choice-interaction>
  </qti-item-body>
`;

/** Score an attempt the way `TestNavigationCorrection.afterAttemptEnded` does. */
const scoreAttempt = (interaction: CorrectableInteraction, response: string, accumulate: boolean): void => {
  interaction.response = response;
  interaction.toggleCandidateCorrection(true, accumulate);
};

const marksFor = (interaction: HTMLElement): Record<string, string | null> => {
  const choices = Array.from(interaction.querySelectorAll<CorrectableChoice>('qti-simple-choice'));
  return Object.fromEntries(choices.map(choice => [choice.identifier, choice.candidateCorrection]));
};

/**
 * Three scored attempts — ChoiceA (wrong), ChoiceB (wrong), ChoiceC (right) —
 * leave all three marked: two ✘ and one ✔.
 */
export const AccumulatedAcrossAttempts: Story = {
  name: 'marks accumulate across attempts',
  render: () => question,
  play: async ({ canvasElement }) => {
    const interaction = await waitFor(() => {
      const found = deepQuery<CorrectableInteraction>(canvasElement, '#accumulating');
      expect(found).toBeTruthy();
      return found!;
    });

    scoreAttempt(interaction, 'ChoiceA', true);
    await waitFor(() => expect(marksFor(interaction)).toMatchObject({ ChoiceA: 'incorrect' }));

    scoreAttempt(interaction, 'ChoiceB', true);
    scoreAttempt(interaction, 'ChoiceC', true);

    await waitFor(() =>
      expect(marksFor(interaction)).toMatchObject({
        ChoiceA: 'incorrect',
        ChoiceB: 'incorrect',
        ChoiceC: 'correct'
      })
    );
  }
};

/** Without `accumulate`, each show recomputes from the current response only. */
export const ReplacedWithoutAccumulate: Story = {
  name: 'marks are replaced without accumulate',
  render: () => question,
  play: async ({ canvasElement }) => {
    const interaction = await waitFor(() => {
      const found = deepQuery<CorrectableInteraction>(canvasElement, '#accumulating');
      expect(found).toBeTruthy();
      return found!;
    });

    scoreAttempt(interaction, 'ChoiceA', false);
    await waitFor(() => expect(marksFor(interaction)).toMatchObject({ ChoiceA: 'incorrect' }));

    scoreAttempt(interaction, 'ChoiceB', false);

    await waitFor(() =>
      expect(marksFor(interaction)).toMatchObject({
        ChoiceA: null,
        ChoiceB: 'incorrect',
        ChoiceC: null
      })
    );
  }
};
