const xml = String.raw;

import { afterEach, expect, vi } from 'vitest';

import { qtiTransformManifest } from '../src/qti-transform-manifest';
import { qtiTransformTest } from '../src/qti-transform-test';

const manifest = xml`
  <manifest>
    <resource type="imsqti_test_xmlv3p0" identifier="TST-1" href="test/test.xml" />
  </manifest>`;

const test = xml`
  <qti-assessment-test identifier="TST-1">
    <qti-test-part identifier="PART-1" />
  </qti-assessment-test>`;

const mockFetch = (response: () => Response) => {
  const fetchMock = vi.fn(async () => response());
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const loaders = [
  ['qtiTransformManifest', () => qtiTransformManifest(), manifest],
  ['qtiTransformTest', () => qtiTransformTest(), test]
] as const;

describe.each(loaders)('%s load()', (_name, create, body) => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves with the api when the document loads', async () => {
    mockFetch(() => new Response(body, { status: 200 }));

    await expect(create().load('/package/imsmanifest.xml', undefined)).resolves.toBeDefined();
  });

  // A load that 404s used to resolve nothing and reject nothing: the wrapper
  // promise only ever called resolve, so a caller awaiting it waited forever
  // while loadXML's rejection escaped as an unhandled rejection. Consumers
  // showed a spinner that never resolved into an error state.
  it('rejects when the document is missing', async () => {
    mockFetch(() => new Response('', { status: 404 }));

    await expect(create().load('/package/missing.xml', undefined)).rejects.toThrow('Failed to load XML');
  });

  it('rejects when the fetch itself fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      })
    );

    await expect(create().load('/package/imsmanifest.xml', undefined)).rejects.toThrow('Failed to load XML');
  });
});
