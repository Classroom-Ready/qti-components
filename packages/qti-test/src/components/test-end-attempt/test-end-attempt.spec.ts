import { expect, describe, it, beforeEach, afterEach } from 'vitest';

import type { TestEndAttempt } from './test-end-attempt';
import './test-end-attempt';
import type { ComputedContext } from '@qti-components/base';

describe('TestEndAttempt', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should be disabled when allowSkipping is false and isDefault is true', async () => {
    const el = document.createElement('test-end-attempt') as TestEndAttempt;
    container.appendChild(el);

    const context: ComputedContext = {
      view: 'candidate',
      identifier: 'test',
      title: 'Test',
      testParts: [
        {
          active: true,
          identifier: 'part1',
          navigationMode: 'nonlinear',
          submissionMode: 'individual',
          sections: [
            {
              active: true,
              identifier: 'section1',
              title: 'Section 1',
              navigationMode: 'nonlinear',
              submissionMode: 'individual',
              items: [
                {
                  identifier: 'item1',
                  active: true,
                  allowSkipping: false,
                  valid: true,
                  isDefaultResponse: true
                }
              ]
            }
          ]
        }
      ]
    } as any;

    (el as any).computedContext = context;
    await el.updateComplete;

    expect(el).toBeDisabled();
  });

  it('should be enabled when allowSkipping is false and isDefault is false', async () => {
    const el = document.createElement('test-end-attempt') as TestEndAttempt;
    container.appendChild(el);

    const context: ComputedContext = {
      view: 'candidate',
      identifier: 'test',
      title: 'Test',
      testParts: [
        {
          active: true,
          identifier: 'part1',
          navigationMode: 'nonlinear',
          submissionMode: 'individual',
          sections: [
            {
              active: true,
              identifier: 'section1',
              title: 'Section 1',
              navigationMode: 'nonlinear',
              submissionMode: 'individual',
              items: [
                {
                  identifier: 'item1',
                  active: true,
                  allowSkipping: false,
                  valid: true,
                  isDefaultResponse: false
                }
              ]
            }
          ]
        }
      ]
    } as any;

    (el as any).computedContext = context;
    await el.updateComplete;

    expect(el).toBeEnabled();
  });

  it('should be disabled when allowSkipping is false and valid is false', async () => {
    const el = document.createElement('test-end-attempt') as TestEndAttempt;
    container.appendChild(el);

    const context: ComputedContext = {
      view: 'candidate',
      identifier: 'test',
      title: 'Test',
      testParts: [
        {
          active: true,
          identifier: 'part1',
          navigationMode: 'nonlinear',
          submissionMode: 'individual',
          sections: [
            {
              active: true,
              identifier: 'section1',
              title: 'Section 1',
              navigationMode: 'nonlinear',
              submissionMode: 'individual',
              items: [
                {
                  identifier: 'item1',
                  active: true,
                  allowSkipping: false,
                  valid: false,
                  isDefaultResponse: false
                }
              ]
            }
          ]
        }
      ]
    } as any;

    (el as any).computedContext = context;
    await el.updateComplete;

    expect(el).toBeDisabled();
  });

  it('should be enabled when allowSkipping is true even if isDefault is true', async () => {
    const el = document.createElement('test-end-attempt') as TestEndAttempt;
    container.appendChild(el);

    const context: ComputedContext = {
      view: 'candidate',
      identifier: 'test',
      title: 'Test',
      testParts: [
        {
          active: true,
          identifier: 'part1',
          navigationMode: 'nonlinear',
          submissionMode: 'individual',
          sections: [
            {
              active: true,
              identifier: 'section1',
              title: 'Section 1',
              navigationMode: 'nonlinear',
              submissionMode: 'individual',
              items: [
                {
                  identifier: 'item1',
                  active: true,
                  allowSkipping: true,
                  valid: true,
                  isDefaultResponse: true
                }
              ]
            }
          ]
        }
      ]
    } as any;

    (el as any).computedContext = context;
    await el.updateComplete;

    expect(el).toBeEnabled();
  });
});
