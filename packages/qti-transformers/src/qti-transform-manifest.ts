import { loadXML, parseXML } from './shared/xml';

export const qtiTransformManifest = (): {
  load: (uri: string, signal?: AbortSignal) => Promise<typeof api>;
  assessmentTest: () => { href: string; identifier: string };
} => {
  let xmlFragment: XMLDocument;

  const api = {
    async load(uri: string, signal: AbortSignal) {
      xmlFragment = await loadXML(uri, signal);
      return api;
    },
    parse(xmlString: string) {
      xmlFragment = parseXML(xmlString);
    },
    assessmentTest() {
      const el = xmlFragment.querySelector('resource[type="imsqti_test_xmlv3p0"]');
      return { href: el.getAttribute('href'), identifier: el.getAttribute('identifier') };
    }
  };
  return api;
};
