import { waitFor } from 'storybook/test';

export async function getAssessmentItemFromItemContainer(canvasElement: HTMLElement): Promise<HTMLElement | null> {
  const assessmentItem = await waitFor(() => {
    const itemContainer = canvasElement.querySelector('item-container');
    if (!itemContainer || !itemContainer.shadowRoot) {
      throw new Error('item-container or its shadowRoot not ready yet');
    }
    const qtiAssessmentItem = itemContainer.shadowRoot.querySelector('qti-assessment-item');
    if (!qtiAssessmentItem || !qtiAssessmentItem.shadowRoot) {
      throw new Error('qti-assessment-item or its shadowRoot not ready yet');
    }
    return qtiAssessmentItem;
  });
  return assessmentItem;
}

export const getTestContainer = async (canvasElement: HTMLElement): Promise<HTMLElement | null> => {
  const testContainer = await waitFor(() => {
    const testContainer = canvasElement.querySelector('test-container');
    if (!testContainer || !testContainer.shadowRoot) {
      throw new Error('test-container or its shadowRoot not ready yet');
    }
    return testContainer;
  });
  return testContainer;
};

export async function getAssessmentTest(canvasElement: HTMLElement): Promise<HTMLElement | null> {
  const qtiAssessmentTest = await waitFor(() => {
    const testContainer = canvasElement.querySelector('test-container');
    if (!testContainer || !testContainer.shadowRoot) {
      throw new Error('test-container or its shadowRoot not ready yet');
    }
    const qtiAssessmentTest = testContainer.shadowRoot.querySelector('qti-assessment-test');
    if (!qtiAssessmentTest) {
      throw new Error('qti-assessment-item or its shadowRoot not ready yet');
    }
    return qtiAssessmentTest;
  });
  return qtiAssessmentTest;
}

export async function getAssessmentItemsFromTestContainer(canvasElement: HTMLElement): Promise<HTMLElement[] | null> {
  const assessmentItems = await waitFor(() => {
    const testContainer = canvasElement.querySelector('test-container');
    if (!testContainer || !testContainer.shadowRoot) {
      throw new Error('test-container or its shadowRoot not ready yet');
    }
    const qtiAssessmentItems = testContainer.shadowRoot.querySelectorAll('qti-assessment-item');
    if (!qtiAssessmentItems || !qtiAssessmentItems.length) {
      throw new Error('qti-assessment-item or its shadowRoot not ready yet');
    }
    return Array.from(qtiAssessmentItems);
  });
  return assessmentItems;
}

export async function getAssessmentItemFromTestContainerByDataTitle(
  canvasElement: HTMLElement,
  title: string
): Promise<HTMLElement | null> {
  const assessmentItems = await getAssessmentItemsFromTestContainer(canvasElement);
  for (const item of assessmentItems) {
    const dataTitle = item.getAttribute('data-title');
    if (dataTitle === title) {
      return item;
    }
  }
  return null;
}

/**
 * Resolve the loaded qti-assessment-item for a given qti-assessment-item-ref
 * identifier. Use this (instead of by data-title) when several item-refs may
 * point at the same item file and share a title.
 */
export async function getAssessmentItemFromTestContainerByItemRefId(
  canvasElement: HTMLElement,
  itemRefId: string
): Promise<HTMLElement | null> {
  return waitFor(() => {
    const testContainer = canvasElement.querySelector('test-container');
    const itemRef = testContainer?.shadowRoot?.querySelector(`qti-assessment-item-ref[identifier="${itemRefId}"]`);
    const item = itemRef?.querySelector('qti-assessment-item');
    if (!item)
      throw new Error(`qti-assessment-item under qti-assessment-item-ref[identifier="${itemRefId}"] not ready`);
    return item as HTMLElement;
  });
}
