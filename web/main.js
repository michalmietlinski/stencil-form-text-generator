import { generateFontToSTL } from '../src/core/textPlate.web.js';
import JSZip from 'jszip';

/** Must match allowlist in src/core/textPlate.web.js / build_web.js */
const STENCIL_FONT_NAMES = new Set([
  'StardosStencil-Bold',
  'StardosStencil-Regular',
  'AllertaStencil-Regular',
  'SairaStencilOne-Regular',
  'BlackOpsOne-Regular',
]);

const DEFAULT_FONTS = [{ name: 'StardosStencil-Bold', url: 'fonts/StardosStencil-Bold.ttf', stencil: true }];

let allFontsFromManifest = [];

function setStatus(message, isError = false) {
  const body = document.querySelector('#status .status-body');
  if (!body) return;
  body.textContent = String(message);
  body.className = isError ? 'status-body status-error' : 'status-body';
}

async function loadFontManifest() {
  const res = await fetch('fonts/manifest.json');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function isStencilFontEntry(font) {
  if (!font || !font.name) return false;
  if (font.stencil === true) return true;
  return STENCIL_FONT_NAMES.has(font.name);
}

function populateFontSelect(selectEl, fonts) {
  selectEl.innerHTML = '';
  if (!Array.isArray(fonts) || fonts.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '(no fonts found)';
    opt.disabled = true;
    selectEl.appendChild(opt);
    return;
  }

  for (const font of fonts) {
    if (!font || !font.url || !font.name) continue;
    const opt = document.createElement('option');
    opt.value = font.url;
    opt.textContent = font.name;
    selectEl.appendChild(opt);
  }
}

function applyProductModeUI() {
  const productModeEl = document.getElementById('productMode');
  const pocketField = document.getElementById('pocketDepthField');
  if (!productModeEl || !pocketField) return;
  const productMode = productModeEl.value;
  pocketField.style.display = productMode === 'form' ? 'block' : 'none';
  const fontSelectEl = document.getElementById('fontName');
  if (!fontSelectEl) return;
  const list =
    productMode === 'stencil'
      ? allFontsFromManifest.filter(isStencilFontEntry)
      : allFontsFromManifest;
  const prevUrl = fontSelectEl.value;
  populateFontSelect(fontSelectEl, list);
  if (prevUrl && list.some((f) => f.url === prevUrl)) {
    fontSelectEl.value = prevUrl;
  } else if (list.length > 0) {
    fontSelectEl.selectedIndex = 0;
  }
}

function downloadSTL(filename, content) {
  const blob = new Blob([content], { type: 'model/stl' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Sanitize for use in filenames (STL and ZIP). */
function safeFileName(char) {
  return String(char).replace(/[<>:"/\\|?*\s]/g, '_') || 'letter';
}

function selectedFontName() {
  if (fontUploadInput?.files?.[0]?.name) {
    return fontUploadInput.files[0].name.replace(/\.[^.]+$/, '');
  }
  const option = fontSelect?.selectedOptions?.[0];
  if (option?.textContent) return option.textContent;
  const value = fontSelect?.value || '';
  const tail = String(value).split('/').pop()?.split('?')[0] || '';
  return tail.replace(/\.[^.]+$/, '') || 'font';
}

function productDownloadTag(productMode) {
  return String(productMode || 'form').toLowerCase() === 'stencil' ? 'stencil' : 'Form';
}

function buildCombinedStlName(text, fontName, productMode) {
  const textPart = safeFileName(text || 'text');
  const fontPart = safeFileName(fontName || 'font');
  const tag = safeFileName(productDownloadTag(productMode));
  return `${textPart}_${fontPart}_combined_${tag}.stl`;
}

function buildZipName(text, fontName, productMode) {
  const textPart = safeFileName(text || 'letters');
  const fontPart = safeFileName(fontName || 'font');
  const tag = safeFileName(productDownloadTag(productMode));
  return `${textPart}_${fontPart}_separate_${tag}.zip`;
}

/** Unique STL filename per letter; includes Form or stencil in the name. */
function letterStlName(char, fontName, countByChar, productMode) {
  const tag = safeFileName(productDownloadTag(productMode));
  const base = `${safeFileName(char)}_${safeFileName(fontName || 'font')}_${tag}`;
  const n = countByChar.get(base) ?? 0;
  countByChar.set(base, n + 1);
  return n === 0 ? `${base}.stl` : `${base}_${n + 1}.stl`;
}

function downloadZip(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

document.getElementById('mode')?.addEventListener('change', (e) => {
  document.getElementById('spacingField').style.display =
    e.target.value === 'combined' ? 'block' : 'none';
});

document.getElementById('productMode')?.addEventListener('change', () => applyProductModeUI());

// Font dropdown init (sync via tools/build_web.js)
const fontSelect = document.getElementById('fontName');
const generateBtn = document.getElementById('generateBtn');
const fontUploadInput = document.getElementById('fontUpload');
const fontUploadName = document.getElementById('fontUploadName');
const fontUploadClear = document.getElementById('fontUploadClear');

let customFontBlobUrl = null;

function revokeCustomFont() {
  if (customFontBlobUrl) {
    URL.revokeObjectURL(customFontBlobUrl);
    customFontBlobUrl = null;
  }
}

if (fontUploadInput) {
  fontUploadInput.addEventListener('change', () => {
    revokeCustomFont();
    const file = fontUploadInput.files && fontUploadInput.files[0];
    if (file) {
      customFontBlobUrl = URL.createObjectURL(file);
      fontUploadName.textContent = file.name;
      if (fontUploadClear) fontUploadClear.style.display = 'inline-block';
    } else {
      fontUploadName.textContent = '';
      if (fontUploadClear) fontUploadClear.style.display = 'none';
    }
  });
}

if (fontUploadClear) {
  fontUploadClear.addEventListener('click', () => {
    revokeCustomFont();
    if (fontUploadInput) fontUploadInput.value = '';
    fontUploadName.textContent = '';
    fontUploadClear.style.display = 'none';
  });
}

if (generateBtn) generateBtn.disabled = true;

(async () => {
  try {
    setStatus('Loading fonts...');
    const manifest = await loadFontManifest();
    allFontsFromManifest = manifest?.fonts || [];
    applyProductModeUI();
    setStatus('Ready to generate. Choose your font and settings');
  } catch (e) {
    allFontsFromManifest = DEFAULT_FONTS;
    populateFontSelect(fontSelect, DEFAULT_FONTS);
    setStatus('Ready to generate. Choose your font and settings');
  } finally {
    if (generateBtn) generateBtn.disabled = false;
  }
})();

// Handle form submission
document.getElementById('generator-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const btn = document.getElementById('generateBtn');
  btn.disabled = true;
  setStatus('Generating...');
  
  try {
    const text = form.text.value || 'HELLO';
    const mode = form.mode.value;
    const productMode = form.productMode?.value || 'stencil';
    const characterHeight = Number(form.characterHeight.value);
    const spacing = Number(form.spacing.value);
    const plateThickness = Number(form.plateThickness.value);
    const platePadding = Number(form.platePadding.value);
    const fontUrl = customFontBlobUrl || (fontSelect && fontSelect.value) || '';

    if (!fontUrl) {
      throw new Error('Please select a font from the list or upload your own (TTF/OTF).');
    }

    const params = {
      text,
      mode,
      productMode,
      characterHeight,
      spacing,
      plateThickness,
      platePadding,
      fontUrl,
    };
    if (productMode === 'form') {
      params.pocketDepth = Number(form.pocketDepth?.value ?? 1);
    }
    
    const result = await generateFontToSTL(params);
    const fontName = selectedFontName();
    
    if (result.mode === 'separate') {
      // Pack all letter STLs into one ZIP and download
      const zip = new JSZip();
      const countByChar = new Map();
      for (let i = 0; i < result.letters.length; i++) {
        const letter = result.letters[i];
        const name = letterStlName(letter.char, fontName, countByChar, productMode);
        zip.file(name, letter.stl, { binary: true });
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipName = buildZipName(text, fontName, productMode);
      downloadZip(zipName, zipBlob);
      setStatus(`✅ Downloaded ${zipName} (${result.letters.length} letter STLs)`);
    } else {
      // Download single file
      const filename = buildCombinedStlName(text, fontName, productMode);
      downloadSTL(filename, result.stl);
      setStatus(`✅ Downloaded ${filename} successfully!`);
    }
  } catch (error) {
    console.error(error);
    setStatus(`❌ Error: ${error.message}`, true);
  } finally {
    btn.disabled = false;
  }
});

// Status is set by the fonts init above.
