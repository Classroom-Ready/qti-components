/*
 * Compiled from OUTSIDE the workspace, against an npm install of the packed tarball.
 * That is the whole point: the `@qti-components/*` packages are devDependencies of
 * @citolab/qti-components, so a real consumer never receives them, and any declaration
 * that imports one is unresolvable there while resolving fine in the monorepo.
 *
 * Keep this exercising the PUBLIC surface a consumer actually touches, not obscure corners.
 */
import {
  createCorrectionRegistry,
  qtiCorrectionElements,
  QtiChoiceInteractionCorrection
} from '@citolab/qti-components/corrections';
import { QtiChoiceInteraction, QtiHotspotInteraction } from '@citolab/qti-components';
import type { QtiTest, TestContainer } from '@citolab/qti-components/qti-test';
import type { LitElement } from 'lit';

// Correction elements take the standard tag names, so they are opted into through
// a scoped registry — handed to a shadow root, and to each container.
declare const host: HTMLElement;
declare const testContainer: TestContainer & { customElementRegistry: CustomElementRegistry };
const correctionRegistry = createCorrectionRegistry();
host.attachShadow({ mode: 'open', customElementRegistry: correctionRegistry });
testContainer.customElementRegistry = correctionRegistry;

// The tag→constructor list is reachable too, for a consumer that would rather
// register the variants itself (before anything claims the standard tags).
const correctionTags: readonly string[] = qtiCorrectionElements.map(({ tag }) => tag);
const correction: CustomElementConstructor = QtiChoiceInteractionCorrection;
const plain: CustomElementConstructor = QtiChoiceInteraction;

// Interactions must satisfy the standard Lit mixin constraint.
type Constructor<T = object> = new (...args: never[]) => T;
declare function SomeMixin<T extends Constructor<LitElement>>(Base: T): T;
SomeMixin(QtiHotspotInteraction);

// A URL-bearing attribute has to accept `null` — React drops the attribute for it.
declare const maybeUrl: string | null;
const container: Partial<TestContainer> = { testURL: maybeUrl };

// The element type must carry what its mixins add.
declare const test: QtiTest;
const cb = test.postLoadTransformCallback;

void plain;
void correction;
void correctionTags;
void container;
void cb;
