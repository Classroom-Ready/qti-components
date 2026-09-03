import { qtiBaseElements } from '@qti-components/base/elements';
import { qtiContentElements } from '@qti-components/elements/elements';
import { qtiInteractionElements } from '@qti-components/interactions/elements';
import { qtiItemElements } from '@qti-components/item/elements';
import { qtiProcessingElements } from '@qti-components/processing/elements';
import { qtiTestElements } from '@qti-components/test/elements';

import { qtiCorrectionElements } from './elements.js';

/**
 * Build a scoped custom-element registry in which every QTI tag resolves to its
 * correction variant where one exists, and to the standard element otherwise.
 *
 * The correction elements deliberately register under the standard QTI tag
 * names, so they cannot be defined globally alongside the standard ones — the
 * standard packages' constructors stay correction-free. A scoped registry is
 * how correction behaviour is opted into:
 *
 * ```ts
 * const registry = createCorrectionRegistry();
 * // for a whole subtree:
 * host.attachShadow({ mode: 'open', customElementRegistry: registry });
 * // and for the items a container loads:
 * container.customElementRegistry = registry;
 * ```
 *
 * Both `item-container` and `test-container` accept the registry through their
 * `customElementRegistry` property.
 *
 * This is a factory rather than a shared instance on purpose:
 * `new CustomElementRegistry()` throws in a browser without scoped-registry
 * support, so constructing one has to be the caller's decision rather than a
 * side effect of importing this package.
 *
 * A consumer that would rather register the correction variants globally can
 * loop `qtiCorrectionElements` itself — but it has to run before anything
 * imports the standard elements, whose registration is guarded on the tag being
 * free and therefore wins whichever side gets there first.
 */
export function createCorrectionRegistry(): CustomElementRegistry {
  const registry = new CustomElementRegistry();
  const overrides = new Map<string, CustomElementConstructor>(
    qtiCorrectionElements.map(({ tag, ctor }) => [tag, ctor])
  );

  const everyElement = [
    ...qtiBaseElements,
    ...qtiProcessingElements,
    ...qtiContentElements,
    ...qtiItemElements,
    ...qtiTestElements,
    ...qtiInteractionElements,
    ...qtiCorrectionElements
  ];

  for (const { tag, ctor } of everyElement) {
    if (!registry.get(tag)) registry.define(tag, overrides.get(tag) ?? ctor);
  }

  return registry;
}
