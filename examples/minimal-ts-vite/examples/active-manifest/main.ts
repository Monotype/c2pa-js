import { createC2pa, selectProducer } from 'c2pa';
import wasmSrc from 'c2pa/dist/assets/wasm/toolkit_bg.wasm?url';
import workerSrc from 'c2pa/dist/c2pa.worker.js?url';
import { parseISO } from 'date-fns';

const sampleImage =
  // The following can be used with `npx serve --cors -l tcp://0.0.0.0:8000` to serve the image locally
  // for this website to be able to load the font.
  'http://localhost:8000/response.otf';
//  'https://raw.githubusercontent.com/contentauth/c2pa-js/main/tools/testing/fixtures/images/CAICAI.jpg';

(async () => {
  let output: string[] = [];

  const c2pa = await createC2pa({
    wasmSrc,
    workerSrc,
  });

  const { manifestStore, source } = await c2pa.read(sampleImage);
  const activeManifest = manifestStore?.activeManifest;
  const validationStatus = manifestStore?.validationStatus;
  if (activeManifest) {
    // Get thumbnail
    // Note: You would normally call `dispose()` when working with a
    // component-based UI library (e.g. on component un-mount)
    // @ts-expect-error noUnusedLocals
    const { url, dispose } = source.thumbnail.getUrl();

    // Get properties
    const properties: Record<string, string | undefined> = {
      title: activeManifest.title,
      format: activeManifest.format,
      claimGenerator: activeManifest.claimGenerator.split('(')[0]?.trim(),
      producer: selectProducer(activeManifest)?.name ?? 'Unknown',
      thumbnail: `<img src="${url}" class="thumbnail" />`,
      ingredients: (activeManifest.ingredients ?? [])
        .map((i) => i.title)
        .join(', '),
      signatureIssuer: activeManifest.signatureInfo?.issuer,
      signatureDate: activeManifest.signatureInfo?.time
        ? parseISO(activeManifest.signatureInfo.time).toString()
        : 'No date available',
    };

    output = Object.keys(properties).map((key) => {
      return `
        <tr>
          <td>${key}</td>
          <td>${properties[key]}</td>
        </tr>
      `;
    });
    if (validationStatus) {
      validationStatus.forEach((status) => {
        const validation_properties: Record<string, string | undefined> = {
          code: status.code,
          explanation: status.explanation,
          url: status.url,
        };
        Object.keys(validation_properties).map((key) => {
          output.push(`
            <tr>
              <td>${key}</td>
              <td>${validation_properties[key]}</td>
            </tr>
          `);
        });
      });
    }
  } else {
    output.push(`
      <tr>
        <td colspan="2">No provenance data found</td>
      </tr>
    `);
  }

  document.querySelector('#results tbody')!.innerHTML = output.join('');
})();
