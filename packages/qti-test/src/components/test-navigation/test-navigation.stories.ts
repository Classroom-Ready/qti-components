import { getStorybookHelpers } from '@wc-toolkit/storybook-helpers';
import { expect, waitFor } from 'storybook/test';
import { within } from 'shadow-dom-testing-library';
import { html } from 'lit';

import {
  getAssessmentItemFromTestContainerByItemRefId,
  getAssessmentItemsFromTestContainer
} from '../../../../../tools/testing/test-utils';

import type { Meta, StoryObj } from '@storybook/web-components-vite';
import type { TestNavigation } from './test-navigation';
import type { QtiChoiceInteraction } from '@qti-components/choice-interaction';
import type { QtiSimpleChoice } from '@qti-components/interactions-core';

const { events, args, argTypes, template } = getStorybookHelpers('test-navigation');

type Story = StoryObj<TestNavigation & typeof args>;

const meta: Meta<TestNavigation> = {
  component: 'test-navigation',
  args,
  argTypes,
  parameters: {
    actions: {
      handles: events
    }
  }
};
export default meta;

export const Default: Story = {
  render: args =>
    html` <qti-test navigate="item">
      ${template(args, html` <test-container test-url="/assets/qti-test-package/assessment.xml"></test-container>`)}
    </qti-test>`
};

// items/choice.xml — "Unattended Luggage", correct answer is ChoiceA.
const CHOICE_B = 'Do not let someone else look after your luggage.';
const CHOICE_C = 'Remember your luggage when you leave.';

/**
 * Opting an item into the QTI-standard `qti-item-session-control show-solution`
 * makes the player reflect correctness back to the candidate after each ended
 * attempt: the wrong pick is marked, the mark **persists** when they re-select,
 * marks **accumulate** across attempts, and the correct answer is revealed once
 * the item is done (correct, or out of attempts). The fixture declares
 * `show-solution="true" max-attempts="2"`.
 */
export const ShowSolutionPersists: Story = {
  parameters: {
    testTimeout: 60000
  },
  render: () => html`
    <qti-test navigate="item">
      <test-navigation>
        <test-container test-url="/assets/qti-test-package/assessment-show-solution.xml"></test-container>
        <test-end-attempt>End Attempt</test-end-attempt>
      </test-navigation>
    </qti-test>
  `,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const endAttemptBtn = await canvas.findByShadowText('End Attempt');
    await getAssessmentItemsFromTestContainer(canvasElement);

    const item = await getAssessmentItemFromTestContainerByItemRefId(canvasElement, 'ITM-choice-solution');
    const interaction = item.querySelector<QtiChoiceInteraction>('qti-choice-interaction');
    const choice = (id: string) => item.querySelector<QtiSimpleChoice>(`qti-simple-choice[identifier="${id}"]`);

    const pick = async (text: string, id: string) => {
      within(interaction).getByText<QtiSimpleChoice>(text).click();
      await waitFor(() => expect(choice(id).internals.states.has('--checked')).toBe(true));
    };

    // First wrong attempt: the pick is marked incorrect, correct answer stays hidden.
    await pick(CHOICE_B, 'ChoiceB');
    endAttemptBtn.click();
    await waitFor(() => expect(choice('ChoiceB').internals.states.has('candidate-incorrect')).toBe(true));
    expect(choice('ChoiceA').internals.states.has('correct-response')).toBe(false);

    // Re-selecting another answer keeps the earlier ✘ (persisted, not cleared).
    await pick(CHOICE_C, 'ChoiceC');
    expect(choice('ChoiceB').internals.states.has('candidate-incorrect')).toBe(true);

    // Second wrong attempt exhausts max-attempts: both wrong picks stay marked
    // (accumulated → two ✘) and the correct answer is now revealed.
    endAttemptBtn.click();
    await waitFor(() => expect(choice('ChoiceA').internals.states.has('correct-response')).toBe(true));
    expect(choice('ChoiceB').internals.states.has('candidate-incorrect')).toBe(true);
    expect(choice('ChoiceC').internals.states.has('candidate-incorrect')).toBe(true);
  }
};

/**
 * The mirror case: an item with **no** show-solution opt-in behaves exactly as
 * the library always has — the player adds no candidate-correction marks and
 * never reveals the correct answer on its own. Uses the first (active) item of
 * the shared item-session-control fixture (section `section-max-attempts-default`).
 */
export const WithoutShowSolution: Story = {
  parameters: {
    testTimeout: 60000
  },
  render: () => html`
    <qti-test navigate="item">
      <test-navigation>
        <test-container test-url="/assets/qti-test-package/assessment-item-session-control.xml"></test-container>
        <test-end-attempt>End Attempt</test-end-attempt>
      </test-navigation>
    </qti-test>
  `,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const endAttemptBtn = await canvas.findByShadowText('End Attempt');
    await getAssessmentItemsFromTestContainer(canvasElement);

    const item = await getAssessmentItemFromTestContainerByItemRefId(canvasElement, 'ITM-choice-default');
    const interaction = item.querySelector<QtiChoiceInteraction>('qti-choice-interaction');
    const choice = (id: string) => item.querySelector<QtiSimpleChoice>(`qti-simple-choice[identifier="${id}"]`);

    within(interaction).getByText<QtiSimpleChoice>(CHOICE_B).click();
    await waitFor(() => expect(choice('ChoiceB').internals.states.has('--checked')).toBe(true));

    endAttemptBtn.click();
    // Let the ended attempt propagate, then confirm the player left correction alone.
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(choice('ChoiceB').internals.states.has('candidate-incorrect')).toBe(false);
    expect(choice('ChoiceA').internals.states.has('correct-response')).toBe(false);
  }
};
