import { action } from 'storybook/actions';
import { expect } from 'storybook/test';
import { html } from 'lit';

import type { QtiAssessmentItem } from '@qti-components/elements';
import type { QtiTest } from '@qti-components/test';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

type Story = StoryObj;

const meta: Meta<QtiAssessmentItem> = {
  title: 'qti-outcome-condition'
};
export default meta;

/**
 * Renders an item whose response processing routes a single RESPONSE through an
 * `qti-outcome-condition`:
 *   - RESPONSE == "B"  -> outcome-if      -> GRADE = "pass"
 *   - RESPONSE == "A"  -> outcome-else-if -> GRADE = "partial"
 *   - anything else    -> outcome-else    -> GRADE = "fail"
 */
const render = () => {
  const onOutcomeChanged = action('qti-outcome-changed');

  return html`
    <div class="item" @qti-outcome-changed=${onOutcomeChanged}>
      <qti-assessment-item identifier="OUTCOME_CONDITION_ITEM">
        <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
          <qti-correct-response>
            <qti-value>B</qti-value>
          </qti-correct-response>
        </qti-response-declaration>
        <qti-outcome-declaration identifier="GRADE" cardinality="single" base-type="identifier"></qti-outcome-declaration>
        <qti-item-body>
          <qti-choice-interaction max-choices="1" response-identifier="RESPONSE">
            <qti-simple-choice identifier="A">A</qti-simple-choice>
            <qti-simple-choice identifier="B">B</qti-simple-choice>
            <qti-simple-choice identifier="C">C</qti-simple-choice>
          </qti-choice-interaction>
        </qti-item-body>
        <qti-response-processing>
          <qti-outcome-condition>
            <qti-outcome-if>
              <qti-match>
                <qti-variable identifier="RESPONSE"></qti-variable>
                <qti-base-value base-type="identifier">B</qti-base-value>
              </qti-match>
              <qti-set-outcome-value identifier="GRADE">
                <qti-base-value base-type="identifier">pass</qti-base-value>
              </qti-set-outcome-value>
            </qti-outcome-if>
            <qti-outcome-else-if>
              <qti-match>
                <qti-variable identifier="RESPONSE"></qti-variable>
                <qti-base-value base-type="identifier">A</qti-base-value>
              </qti-match>
              <qti-set-outcome-value identifier="GRADE">
                <qti-base-value base-type="identifier">partial</qti-base-value>
              </qti-set-outcome-value>
            </qti-outcome-else-if>
            <qti-outcome-else>
              <qti-set-outcome-value identifier="GRADE">
                <qti-base-value base-type="identifier">fail</qti-base-value>
              </qti-set-outcome-value>
            </qti-outcome-else>
          </qti-outcome-condition>
        </qti-response-processing>
      </qti-assessment-item>
    </div>
  `;
};

const gradeFor = async (canvasElement: HTMLElement, response: string) => {
  const assessmentItem = canvasElement.querySelector<QtiAssessmentItem>('qti-assessment-item')!;
  await assessmentItem.updateComplete;
  assessmentItem.updateResponseVariable('RESPONSE', response);
  assessmentItem.processResponse();
  return assessmentItem.variables.find(v => v.identifier === 'GRADE')?.value;
};

/** outcome-if branch: its boolean expression is true, so the rest are skipped. */
export const IfBranch: Story = {
  name: 'outcome-if (true)',
  render,
  play: async ({ canvasElement }) => {
    const grade = await gradeFor(canvasElement, 'B');
    expect(grade, 'RESPONSE=B -> GRADE=pass').toBe('pass');
  }
};

/** outcome-else-if branch: outcome-if false, this one's expression true. */
export const ElseIfBranch: Story = {
  name: 'outcome-else-if (true)',
  render,
  play: async ({ canvasElement }) => {
    const grade = await gradeFor(canvasElement, 'A');
    expect(grade, 'RESPONSE=A -> GRADE=partial').toBe('partial');
  }
};

/** outcome-else branch: no preceding expression is true. */
export const ElseBranch: Story = {
  name: 'outcome-else (fallthrough)',
  render,
  play: async ({ canvasElement }) => {
    const grade = await gradeFor(canvasElement, 'C');
    expect(grade, 'RESPONSE=C -> GRADE=fail').toBe('fail');
  }
};

/**
 * Test-level scope: an `qti-outcome-condition` inside an assessmentTest's
 * outcome processing reads a TEST-LEVEL outcome (set earlier in the same pass
 * from `qti-test-variables`) through the `variable` expression — the pattern
 * the QTI spec's own feedback examples use (e.g. the 1EdTech basicFeedbackTest:
 * set SECTION_1_total via testVariables, then branch on `<qti-variable>` in an
 * outcomeCondition). Here `(TEST_MAX_SCORE - TEST_SCORE) <= 1` selects an
 * ENCOURAGE / REMEDIATE result.
 */
const renderTest = () => html`
  <qti-test navigate="item">
    <test-container>
      <qti-assessment-test
        xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
        identifier="OUTCOME_CONDITION_TEST"
        title="Outcome condition over a test-level variable"
      >
        <qti-outcome-declaration identifier="TEST_SCORE" cardinality="single" base-type="float">
          <qti-default-value><qti-value>0</qti-value></qti-default-value>
        </qti-outcome-declaration>
        <qti-outcome-declaration identifier="TEST_MAX_SCORE" cardinality="single" base-type="float">
          <qti-default-value><qti-value>0</qti-value></qti-default-value>
        </qti-outcome-declaration>
        <qti-outcome-declaration identifier="TEST_RESULT" cardinality="single" base-type="identifier"></qti-outcome-declaration>
        <qti-test-part identifier="P1" navigation-mode="nonlinear" submission-mode="simultaneous">
          <qti-assessment-section identifier="S1" title="S1" visible="true">
            <qti-assessment-item-ref identifier="ITM-1" href="1.xml" category=""></qti-assessment-item-ref>
            <qti-assessment-item-ref identifier="ITM-2" href="2.xml" category=""></qti-assessment-item-ref>
          </qti-assessment-section>
        </qti-test-part>
        <qti-outcome-processing>
          <qti-set-outcome-value identifier="TEST_SCORE">
            <qti-sum><qti-test-variables variable-identifier="SCORE"></qti-test-variables></qti-sum>
          </qti-set-outcome-value>
          <qti-set-outcome-value identifier="TEST_MAX_SCORE">
            <qti-sum><qti-test-variables variable-identifier="MAXSCORE"></qti-test-variables></qti-sum>
          </qti-set-outcome-value>
          <qti-outcome-condition>
            <qti-outcome-if>
              <qti-lte>
                <qti-subtract>
                  <qti-variable identifier="TEST_MAX_SCORE"></qti-variable>
                  <qti-variable identifier="TEST_SCORE"></qti-variable>
                </qti-subtract>
                <qti-base-value base-type="float">1</qti-base-value>
              </qti-lte>
              <qti-set-outcome-value identifier="TEST_RESULT">
                <qti-base-value base-type="identifier">ENCOURAGE</qti-base-value>
              </qti-set-outcome-value>
            </qti-outcome-if>
            <qti-outcome-else>
              <qti-set-outcome-value identifier="TEST_RESULT">
                <qti-base-value base-type="identifier">REMEDIATE</qti-base-value>
              </qti-set-outcome-value>
            </qti-outcome-else>
          </qti-outcome-condition>
        </qti-outcome-processing>
      </qti-assessment-test>
    </test-container>
  </qti-test>
`;

const testResultFor = async (canvasElement: HTMLElement, scores: Record<string, string>) => {
  const qtiTest = canvasElement.querySelector<QtiTest>('qti-test')!;
  await qtiTest.updateComplete;

  // Stand in for response processing: give each item a SCORE/MAXSCORE.
  qtiTest.testContext = {
    ...qtiTest.testContext,
    items: qtiTest.testContext.items.map(item => ({
      ...item,
      variables: item.variables
        .filter(v => v.identifier !== 'SCORE' && v.identifier !== 'MAXSCORE')
        .concat([
          { type: 'outcome', identifier: 'SCORE', value: scores[item.identifier] ?? '0' },
          { type: 'outcome', identifier: 'MAXSCORE', value: '1' }
        ] as any)
    }))
  };

  qtiTest.outcomeProcessing();
  return qtiTest.testContext.testOutcomeVariables?.find(v => v.identifier === 'TEST_RESULT')?.value;
};

/** 2/2 correct: missed 0 (<= 1) -> the outcome-if reads TEST_* and sets ENCOURAGE. */
export const TestVariableEncourage: Story = {
  name: 'reads a test-level outcome (encourage)',
  render: renderTest,
  play: async ({ canvasElement }) => {
    const result = await testResultFor(canvasElement, { 'ITM-1': '1', 'ITM-2': '1' });
    expect(result, '2/2 -> ENCOURAGE').toBe('ENCOURAGE');
  }
};

/** 0/2 correct: missed 2 (> 1) -> falls through to outcome-else and sets REMEDIATE. */
export const TestVariableRemediate: Story = {
  name: 'reads a test-level outcome (remediate)',
  render: renderTest,
  play: async ({ canvasElement }) => {
    const result = await testResultFor(canvasElement, { 'ITM-1': '0', 'ITM-2': '0' });
    expect(result, '0/2 -> REMEDIATE').toBe('REMEDIATE');
  }
};
