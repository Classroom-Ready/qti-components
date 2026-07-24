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

// The player only sets the :state() custom states; the visible feedback is drawn
// by the qti-theme these stories load. These helpers read that rendered result
// (rather than the internal state flags) so the stories validate what a
// candidate actually sees:
//  - a wrong pick gets the theme's "incorrect" fill (background-color);
//  - the revealed correct answer gets a ✔ from the theme's ::after.
const fillOf = (choice: QtiSimpleChoice): string => getComputedStyle(choice).backgroundColor;

// The reveal glyph the theme prints on the correct answer — '' when none.
const revealMarkOf = (choice: QtiSimpleChoice): string =>
  getComputedStyle(choice, '::after').content.replace(/["']/g, '').replace(/^none$/, '');

const CHECK = '✔'; // ✔ — the theme's correct-response mark (content: '\02714')

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

    // First wrong attempt: the pick takes on the theme's "incorrect" fill (a
    // visible change from its plain picked look), and the correct answer is not
    // revealed yet (attempts remain).
    await pick(CHOICE_B, 'ChoiceB');
    const pickedFill = fillOf(choice('ChoiceB'));
    endAttemptBtn.click();
    await waitFor(() => expect(fillOf(choice('ChoiceB'))).not.toBe(pickedFill));
    const incorrectFill = fillOf(choice('ChoiceB'));
    expect(revealMarkOf(choice('ChoiceA'))).toBe('');

    // Re-selecting another answer keeps the earlier mark (persisted, not cleared).
    await pick(CHOICE_C, 'ChoiceC');
    expect(fillOf(choice('ChoiceB'))).toBe(incorrectFill);

    // Second wrong attempt exhausts max-attempts: both wrong picks carry the same
    // incorrect fill (accumulated) and the correct answer is now revealed with a ✔.
    endAttemptBtn.click();
    await waitFor(() => expect(revealMarkOf(choice('ChoiceA'))).toBe(CHECK));
    expect(fillOf(choice('ChoiceB'))).toBe(incorrectFill);
    expect(fillOf(choice('ChoiceC'))).toBe(incorrectFill);
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
    const pickedFill = fillOf(choice('ChoiceB'));

    endAttemptBtn.click();
    // Let the ended attempt propagate, then confirm the candidate sees no feedback —
    // without the show-solution opt-in the pick keeps its plain look and the
    // correct answer is never revealed.
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(fillOf(choice('ChoiceB'))).toBe(pickedFill);
    expect(revealMarkOf(choice('ChoiceA'))).toBe('');
  }
};
