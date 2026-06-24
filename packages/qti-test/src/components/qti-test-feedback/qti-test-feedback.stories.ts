// noinspection JSUnusedGlobalSymbols

import { expect, waitFor } from 'storybook/test';
import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { html } from 'lit';
import { within } from 'shadow-dom-testing-library';

import {
  getAssessmentItemFromTestContainerByDataTitle,
  getAssessmentItemFromTestContainerByItemRefId,
  getAssessmentItemsFromTestContainer,
  getAssessmentTest
} from '../../../../../tools/testing/test-utils';

import type { QtiTestFeedback } from './qti-test-feedback';
import type { TestShowFeedback } from '../test-show-feedback/test-show-feedback';
import type { QtiPrintedVariable } from '@qti-components/processing';
import type { QtiChoiceInteraction } from '@qti-components/choice-interaction';
import type { QtiSimpleChoice } from '@qti-components/interactions-core';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

const { args, argTypes } = getStorybookHelpers('qti-test-feedback');

type Story = StoryObj<QtiTestFeedback & typeof args>;

const meta: Meta<QtiTestFeedback> = {
  component: 'qti-test-feedback',
  args,
  argTypes
};
export default meta;

/** The candidate-facing "How Did I Do?" button that reveals atEnd feedback. */
const showFeedbackButton = (canvasElement: HTMLElement): TestShowFeedback =>
  canvasElement.querySelector<TestShowFeedback>('test-show-feedback')!;

export const AtTestEnd: Story = {
  render: () => html`
    <qti-test navigate="item">
      <test-navigation>
        <test-container test-url="/assets/qti-test-feedback/atend.xml"></test-container>
        <test-end-attempt>End Attempt</test-end-attempt>
        <test-show-feedback>How Did I Do?</test-show-feedback>
      </test-navigation>
    </qti-test>
  `,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const assessmentTest = await getAssessmentTest(canvasElement);
    await getAssessmentItemsFromTestContainer(canvasElement);

    const feedback = await waitFor(() => {
      const fb = assessmentTest.querySelector<QtiTestFeedback>('qti-test-feedback');
      if (!fb) throw new Error('qti-test-feedback not connected yet');
      return fb;
    });
    const showBtn = showFeedbackButton(canvasElement);

    // Before any item is submitted, atEnd feedback must not be shown and the
    // "How Did I Do?" button must be disabled (so a host can keep it hidden).
    expect(feedback.access).toBe('atEnd');
    expect(feedback.showStatus).not.toBe('on');
    expect(showBtn.hasAttribute('disabled')).toBe(true);
    const feedbackText = await canvas.findByShadowText('End-of-test feedback.');
    expect(feedbackText.assignedSlot).not.toBeVisible();

    // Answer the question and end the attempt. With every scorable item now
    // answered, end-of-test outcome processing fires automatically — but the
    // feedback only becomes *available* (the button enables); it is not shown.
    const item = await waitFor(async () => {
      const el = await getAssessmentItemFromTestContainerByDataTitle(canvasElement, 'Question (1 pt)');
      if (!el) throw new Error('Question not loaded yet');
      return el;
    });
    within(item.querySelector<QtiChoiceInteraction>('qti-choice-interaction'))
      .getByText<QtiSimpleChoice>('Correct')
      .click();
    const endAttemptBtn = await canvas.findByShadowText('End Attempt');
    endAttemptBtn.click();

    await waitFor(() => expect(showBtn.hasAttribute('disabled')).toBe(false));
    expect(feedback.showStatus).not.toBe('on');
    expect(feedbackText.assignedSlot).not.toBeVisible();

    // Clicking "How Did I Do?" navigates away from the item to the feedback.
    showBtn.click();
    await waitFor(() => expect(feedback.showStatus).toBe('on'));
    await waitFor(() => expect(feedbackText.assignedSlot).toBeVisible());
    // Navigating to feedback clears the on-screen assessment item.
    await waitFor(() => expect(item.isConnected).toBe(false));
    // While viewing the feedback the button is disabled — nowhere new to go.
    await waitFor(() => expect(showBtn.hasAttribute('disabled')).toBe(true));
  }
};

const linearSumTemplate = () => html`
  <qti-test navigate="item">
    <test-navigation>
      <test-container test-url="/assets/qti-test-feedback/sum.xml"></test-container>
      <test-end-attempt id="end-attempt-btn">End Attempt</test-end-attempt>
      <test-next id="next-btn">Next</test-next>
      <test-show-feedback>How Did I Do?</test-show-feedback>
    </test-navigation>
  </qti-test>
`;

const playLinearSum = async ({
  canvasElement,
  q1Choice,
  q2Choice,
  expectedTotal
}: {
  canvasElement: HTMLElement;
  q1Choice: string;
  q2Choice: string;
  expectedTotal: string;
}) => {
  const canvas = within(canvasElement);
  const assessmentTest = await getAssessmentTest(canvasElement);
  await getAssessmentItemsFromTestContainer(canvasElement);

  const endAttemptBtn = await canvas.findByShadowText('End Attempt');
  const nextBtn = await canvas.findByShadowText('Next');
  const showBtn = showFeedbackButton(canvasElement);
  const feedback = assessmentTest.querySelector<QtiTestFeedback>('qti-test-feedback');

  // Initially the test feedback must not be visible and the button disabled.
  expect(feedback.showStatus).not.toBe('on');
  expect(showBtn.hasAttribute('disabled')).toBe(true);

  // Answer Q1, then submit. With Q2 untouched, the test feedback stays
  // unavailable.
  const q1 = await waitFor(async () => {
    const item = await getAssessmentItemFromTestContainerByDataTitle(canvasElement, 'Question (1 pt)');
    if (!item) throw new Error('Q1 not loaded yet');
    return item;
  });
  within(q1.querySelector<QtiChoiceInteraction>('qti-choice-interaction')).getByText<QtiSimpleChoice>(q1Choice).click();
  endAttemptBtn.click();
  await waitFor(() => expect(nextBtn).toBeEnabled());
  expect(feedback.showStatus).not.toBe('on');
  expect(showBtn.hasAttribute('disabled')).toBe(true);

  // Advance to Q2 (linear navigation).
  nextBtn.click();
  const q2 = await waitFor(async () => {
    const item = await getAssessmentItemFromTestContainerByDataTitle(canvasElement, 'Question (2 pt)');
    if (!item) throw new Error('Q2 not loaded yet');
    return item;
  });
  within(q2.querySelector<QtiChoiceInteraction>('qti-choice-interaction')).getByText<QtiSimpleChoice>(q2Choice).click();
  endAttemptBtn.click();

  // With both items now submitted, end-of-test outcome processing fires
  // automatically and the atEnd feedback becomes available — the button enables
  // but the feedback is not shown until the candidate asks for it.
  await waitFor(() => expect(showBtn.hasAttribute('disabled')).toBe(false));
  expect(feedback.showStatus).not.toBe('on');

  // The atEnd feedback prints TEST_SCORE / TEST_MAX_SCORE — the sum of the
  // per-item SCORE values over the sum of the per-item MAXSCORE values.
  const [scoreVar, maxScoreVar] = feedback.querySelectorAll<QtiPrintedVariable>('qti-printed-variable');
  expect(scoreVar.calculate().value).toBe(expectedTotal);
  expect(maxScoreVar.calculate().value).toBe('3');

  // Reveal the feedback via the "How Did I Do?" button.
  showBtn.click();
  await waitFor(() => expect(feedback.showStatus).toBe('on'));
  await waitFor(() => {
    expect(scoreVar.shadowRoot?.textContent?.trim()).toBe(expectedTotal);
    expect(maxScoreVar.shadowRoot?.textContent?.trim()).toBe('3');
  });

  // The feedback host renders its slot when showStatus is 'on' — the candidate
  // actually sees e.g. "Total: 2/3 correct" on screen.
  const totalText = await canvas.findByShadowText(/Total:/);
  expect(totalText.assignedSlot).toBeVisible();
  expect(deepTextContent(feedback)).toContain(`Total: ${expectedTotal}/3 correct`);
};

/** Walk the rendered tree (including shadow roots) and return its visible text. */
function deepTextContent(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof Element)) return '';
  let text = '';
  if (node.shadowRoot) {
    for (const child of node.shadowRoot.childNodes) text += deepTextContent(child);
  }
  for (const child of node.childNodes) text += deepTextContent(child);
  return text;
}

// Q1 correct (1) + Q2 correct (2) = 3
export const OutcomeProcessing: Story = {
  render: linearSumTemplate,
  play: ({ canvasElement }) =>
    playLinearSum({ canvasElement, q1Choice: 'Correct', q2Choice: 'Correct', expectedTotal: '3' })
};

// Q1 wrong (0) + Q2 correct (2) = 2
export const OutcomeProcessing2: Story = {
  render: linearSumTemplate,
  play: ({ canvasElement }) =>
    playLinearSum({ canvasElement, q1Choice: 'Wrong', q2Choice: 'Correct', expectedTotal: '2' })
};

/**
 * QTI 3 lets qti-test-feedback live inside a qti-test-part. Its `access="atEnd"`
 * then means "shown at the end of that test-part" — not at the end of the
 * whole test. Both signals fire automatically: when every scorable item in a
 * test-part has been answered the part-end outcome processing runs, and once
 * every test-part has fired its part-end the test-end fires too. The
 * part-scoped feedback is offered (via test-show-feedback) once available and
 * disappears once the candidate navigates into a different test-part.
 */
export const AtPartEnd: Story = {
  parameters: { testTimeout: 30000 },
  render: () => html`
    <qti-test navigate="item">
      <test-navigation>
        <test-container test-url="/assets/qti-test-feedback/parts.xml"></test-container>
        <test-end-attempt id="end-attempt-btn">End Attempt</test-end-attempt>
        <test-show-feedback>How Did I Do?</test-show-feedback>
        <test-item-link item-id="P2Q1" id="go-to-part-2">Go to Part 2</test-item-link>
      </test-navigation>
    </qti-test>
  `,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const assessmentTest = await getAssessmentTest(canvasElement);
    await getAssessmentItemsFromTestContainer(canvasElement);

    const endAttemptBtn = await canvas.findByShadowText('End Attempt');
    const goToPart2Btn = await canvas.findByShadowText('Go to Part 2');
    const showBtn = showFeedbackButton(canvasElement);

    const partFeedback = assessmentTest.querySelector<QtiTestFeedback>(
      'qti-test-part[identifier="TP1"] qti-test-feedback'
    );
    const testFeedback = assessmentTest.querySelector<QtiTestFeedback>(':scope > qti-test-feedback');
    expect(partFeedback).toBeTruthy();
    expect(testFeedback).toBeTruthy();

    // Initially both feedbacks are hidden and nothing is offered.
    expect(partFeedback.showStatus).not.toBe('on');
    expect(testFeedback.showStatus).not.toBe('on');
    expect(showBtn.hasAttribute('disabled')).toBe(true);

    // Answer Part 1's question by selecting a choice — but don't end the
    // attempt yet. The part must not yet be considered complete.
    const p1q1 = await getAssessmentItemFromTestContainerByItemRefId(canvasElement, 'P1Q1');
    within(p1q1.querySelector<QtiChoiceInteraction>('qti-choice-interaction'))
      .getByText<QtiSimpleChoice>('Correct')
      .click();
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(showBtn.hasAttribute('disabled')).toBe(true);

    // End the attempt → the part is fully attempted, part-end fires
    // automatically, and the part-scoped feedback becomes available. The test
    // is not over yet (TP2 untouched), so no test-root feedback is offered.
    endAttemptBtn.click();
    await waitFor(() => expect(showBtn.hasAttribute('disabled')).toBe(false));
    expect(partFeedback.showStatus).not.toBe('on');
    expect(testFeedback.showStatus).not.toBe('on');

    // Reveal the part feedback.
    showBtn.click();
    await waitFor(() => expect(partFeedback.showStatus).toBe('on'));
    const partText = await canvas.findByShadowText('Part 1 complete.');
    expect(partText.assignedSlot).toBeVisible();
    const testText = await canvas.findByShadowText('Test complete.');
    expect(testText.assignedSlot).not.toBeVisible();

    // Navigate into TP2 via <test-item-link> — moving on hides the TP1-scoped
    // feedback and the button stops offering it.
    goToPart2Btn.click();
    const p2q1 = await getAssessmentItemFromTestContainerByItemRefId(canvasElement, 'P2Q1');
    await waitFor(() => expect(partFeedback.showStatus).not.toBe('on'));
    expect(partText.assignedSlot).not.toBeVisible();
    await waitFor(() => expect(showBtn.hasAttribute('disabled')).toBe(true));

    within(p2q1.querySelector<QtiChoiceInteraction>('qti-choice-interaction'))
      .getByText<QtiSimpleChoice>('Correct')
      .click();
    endAttemptBtn.click();

    // Both parts now ended → end-of-test fires automatically. The test-root
    // atEnd feedback becomes available; reveal it via the button. The
    // part-scoped feedback stays hidden (we've moved on from TP1).
    await waitFor(() => expect(showBtn.hasAttribute('disabled')).toBe(false));
    showBtn.click();
    await waitFor(() => expect(testFeedback.showStatus).toBe('on'));
    expect(partFeedback.showStatus).not.toBe('on');
    await waitFor(() => expect(testText.assignedSlot).toBeVisible());
    expect(partText.assignedSlot).not.toBeVisible();
  }
};

const twoMaxAttemptsTemplate = () => html`
  <qti-test navigate="item">
    <test-navigation>
      <test-container test-url="/assets/qti-test-feedback/maxattempts.xml"></test-container>
      <test-end-attempt>End Attempt</test-end-attempt>
      <test-show-feedback>How Did I Do?</test-show-feedback>
    </test-navigation>
  </qti-test>
`;

/**
 * Drive a single-question maxAttempts=2 test through the supplied attempt
 * sequence and assert whether the part feedback is *offered* (the
 * test-show-feedback button is enabled) after each submission.
 */
const playMaxAttempts = async ({
  canvasElement,
  attempts,
  partFeedbackExpected
}: {
  canvasElement: HTMLElement;
  attempts: string[];
  partFeedbackExpected: boolean[];
}) => {
  const canvas = within(canvasElement);
  const assessmentTest = await getAssessmentTest(canvasElement);
  await getAssessmentItemsFromTestContainer(canvasElement);

  const endAttemptBtn = await canvas.findByShadowText('End Attempt');
  const showBtn = showFeedbackButton(canvasElement);
  const feedback = assessmentTest.querySelector<QtiTestFeedback>('qti-test-part[identifier="TP1"] qti-test-feedback');
  expect(feedback).toBeTruthy();
  expect(feedback.showStatus).not.toBe('on');
  expect(showBtn.hasAttribute('disabled')).toBe(true);

  const q = await waitFor(async () => {
    const item = await getAssessmentItemFromTestContainerByDataTitle(canvasElement, 'Question (1 pt)');
    if (!item) throw new Error('Q1 not loaded yet');
    return item;
  });
  const interaction = q.querySelector<QtiChoiceInteraction>('qti-choice-interaction');

  for (let i = 0; i < attempts.length; i++) {
    within(interaction).getByText<QtiSimpleChoice>(attempts[i]).click();
    endAttemptBtn.click();
    // Let the part-completion check run.
    await new Promise(resolve => setTimeout(resolve, 50));
    if (partFeedbackExpected[i]) {
      await waitFor(() => expect(showBtn.hasAttribute('disabled')).toBe(false));
      // Feedback is offered but not shown until requested.
      expect(feedback.showStatus).not.toBe('on');
    } else {
      expect(showBtn.hasAttribute('disabled')).toBe(true);
      expect(feedback.showStatus).not.toBe('on');
    }
  }

  // Once offered, the button reveals the feedback.
  if (partFeedbackExpected[partFeedbackExpected.length - 1]) {
    showBtn.click();
    await waitFor(() => expect(feedback.showStatus).toBe('on'));
  }
};

// Wrong, then wrong again → part feedback only offered after the second submit
// (maxAttempts reached).
export const OutOfAttempts: Story = {
  parameters: { testTimeout: 30000 },
  render: twoMaxAttemptsTemplate,
  play: ({ canvasElement }) =>
    playMaxAttempts({
      canvasElement,
      attempts: ['Wrong', 'Wrong'],
      partFeedbackExpected: [false, true]
    })
};

// Right on the first try → part feedback offered immediately after that submit.
export const CorrectAttempt: Story = {
  parameters: { testTimeout: 30000 },
  render: twoMaxAttemptsTemplate,
  play: ({ canvasElement }) =>
    playMaxAttempts({
      canvasElement,
      attempts: ['Correct'],
      partFeedbackExpected: [true]
    })
};
