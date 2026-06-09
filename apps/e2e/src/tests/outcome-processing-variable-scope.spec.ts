import '@citolab/qti-components';

import { html, render } from 'lit';
import { describe, beforeEach, test, expect } from 'vitest';

import type { QtiTest } from '@qti-components/test';

/**
 * Regression test for test-level variable scope.
 *
 * An assessmentTest's outcome processing must be able to read a test-level
 * outcome it just set, via the `variable` expression — this is how the QTI
 * spec's own feedback examples work (set a SCORE summed from testVariables,
 * then branch on it in an outcomeCondition). Previously `qti-variable` only
 * consulted item scope, so `<qti-variable identifier="TEST_SCORE"/>` inside the
 * condition resolved to undefined and threw ("reading 'baseType'").
 */
const assessmentTest = html`
  <qti-test navigate="item">
    <test-container>
      <qti-assessment-test
        xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
        identifier="T1"
        title="Variable scope test"
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
              <!-- reads test-level outcomes set above: (MAX - SCORE) <= 1 -->
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

const setItemScores = (qtiTest: QtiTest, scores: Record<string, string>): void => {
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
};

const resultOf = (qtiTest: QtiTest) =>
  qtiTest.testContext.testOutcomeVariables?.find(v => v.identifier === 'TEST_RESULT')?.value ?? null;

describe('outcome processing can read test-level outcomes via qti-variable', () => {
  let qtiTest: QtiTest;

  beforeEach(async () => {
    render(assessmentTest, document.body);
    qtiTest = document.body.querySelector('qti-test') as QtiTest;
    await qtiTest.updateComplete;
  });

  test('missed at most one (2/2) → reads TEST_SCORE and sets ENCOURAGE', () => {
    setItemScores(qtiTest, { 'ITM-1': '1', 'ITM-2': '1' });
    qtiTest.outcomeProcessing();
    expect(resultOf(qtiTest)).toBe('ENCOURAGE');
  });

  test('missed more than one (0/2) → sets REMEDIATE', () => {
    setItemScores(qtiTest, { 'ITM-1': '0', 'ITM-2': '0' });
    qtiTest.outcomeProcessing();
    expect(resultOf(qtiTest)).toBe('REMEDIATE');
  });
});
