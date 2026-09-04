---
'@qti-components/corrections': minor
'@citolab/qti-components': minor
---

Make the correction elements reachable from the published package.

Correction elements register under the standard QTI tag names — the standard packages' own
constructors stay correction-free — so they are opted into through a scoped custom-element
registry. Assembling that registry needed the tag lists from seven packages, and those are
devDependencies of the umbrella that a consumer never receives, so correction behaviour could not
be switched on outside this repo at all.

`createCorrectionRegistry()` now builds it, and is exported through
`@citolab/qti-components/corrections`:

```ts
import { createCorrectionRegistry } from '@citolab/qti-components/corrections';

const registry = createCorrectionRegistry();
host.attachShadow({ mode: 'open', customElementRegistry: registry });
container.customElementRegistry = registry;
```

Every QTI tag in it resolves to its correction variant where one exists and to the standard element
otherwise. A factory rather than a shared instance, because `new CustomElementRegistry()` throws in
a browser without scoped-registry support and that has to stay the caller's decision rather than a
side effect of importing the package.

`qtiCorrectionElements` — the tag-to-constructor list — is exported alongside it, for a consumer
that would rather register the variants globally. That has to run before anything imports the
standard elements, whose registration is guarded on the tag being free and so wins whichever side
gets there first.
