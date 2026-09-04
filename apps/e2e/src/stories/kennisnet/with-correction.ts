import { nothing, render } from 'lit';

import { createCorrectionRegistry } from '@qti-components/corrections';

// eslint-disable-next-line import/no-relative-packages
import itemCss from '../../../../../packages/qti-theme/src/item.css?inline';
import kennisnetCss from './kennisnet.css?inline';

import type { Decorator } from '@storybook/web-components-vite';

export const correctionRegistry = createCorrectionRegistry();

const itemSheet = new CSSStyleSheet();
itemSheet.replaceSync(itemCss);

const kennisnetSheet = new CSSStyleSheet();
kennisnetSheet.replaceSync(kennisnetCss);

type BoundContainerState = {
  itemXML?: string;
  testXML?: string;
};

const collectBoundContainerState = (root: ParentNode): BoundContainerState[] =>
  Array.from(root.querySelectorAll<HTMLElement & BoundContainerState>('item-container, test-container')).map(
    container => ({
      itemXML: container.itemXML,
      testXML: container.testXML
    })
  );

const applyContainerRegistry = (root: ParentNode): void => {
  for (const container of root.querySelectorAll<HTMLElement & { customElementRegistry: CustomElementRegistry }>(
    'item-container, test-container'
  )) {
    container.customElementRegistry = correctionRegistry;
  }
};

export const withCorrection: Decorator = story => {
  const scratch = document.createElement('div');
  render(story() as Parameters<typeof render>[0], scratch);

  // For container-driven stories, preserve live DOM so lit event listeners keep working.
  const hasContainerStory = !!scratch.querySelector('item-container, test-container');

  if (hasContainerStory) {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open', customElementRegistry: correctionRegistry });
    shadow.adoptedStyleSheets = [itemSheet, kennisnetSheet];

    const wrapper = document.createElement('div');
    while (scratch.firstChild) {
      wrapper.appendChild(scratch.firstChild);
    }
    shadow.appendChild(wrapper);

    applyContainerRegistry(shadow);
    return host;
  }

  const sourceContainerState = collectBoundContainerState(scratch);
  const markup = scratch.innerHTML;
  render(nothing, scratch);

  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'open', customElementRegistry: correctionRegistry });
  shadow.adoptedStyleSheets = [itemSheet, kennisnetSheet];

  // Keep a wrapper so correction clones can be inserted via interaction.parentElement.
  shadow.innerHTML = `<div>${markup}</div>`;
  applyContainerRegistry(shadow);

  // Rehydrate lit property bindings (e.g. .testXML/.itemXML) that are not preserved by innerHTML.
  const mountedContainers = Array.from(
    shadow.querySelectorAll<HTMLElement & { customElementRegistry: CustomElementRegistry } & BoundContainerState>(
      'item-container, test-container'
    )
  );

  mountedContainers.forEach((container, index) => {
    const sourceState = sourceContainerState[index];
    if (!sourceState) {
      return;
    }

    if (typeof sourceState.itemXML === 'string') {
      container.itemXML = sourceState.itemXML;
    }

    if (typeof sourceState.testXML === 'string') {
      container.testXML = sourceState.testXML;
    }
  });

  return host;
};
