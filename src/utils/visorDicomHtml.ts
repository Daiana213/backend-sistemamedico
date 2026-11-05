export interface DatosVisorDicom {
  idEstudio: number | null;
  codigo: string;
  nombre: string;
  observacion: string | null;
  fechaCarga: Date | string;
  modalidad: string;
  numeroAcceso: string;
  paciente: {
    nombreCompleto: string;
    dni: string;
    sexo?: string | null;
    fechaNacimiento?: Date | string | null;
    obraSocial?: string | null;
  };
  profesional?: {
    nombreCompleto: string;
    matricula?: string | null;
  } | null;
}

export function generarHtmlVisorDicom(datos: DatosVisorDicom): string {
  const payloadSeguro = JSON.stringify(datos).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Visor DICOM PACS - ${datos.nombre} | Sanatorio Antonia</title>
  <style>
    * { box-sizing: border-box; }
    body, html {
      margin: 0;
      padding: 0;
      width: 100vw;
      height: 100vh;
      background-color: #090d16;
      color: #e2e8f0;
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
      user-select: none;
    }
    .visor-layout {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
    }
    .visor-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      height: 58px;
      background: #0f172a;
      border-bottom: 1px solid #1e293b;
      gap: 12px;
      flex-shrink: 0;
    }
    .visor-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .visor-back-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 6px 11px;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .visor-back-btn:hover {
      background: #334155;
      color: #ffffff;
    }
    .visor-brand-title {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .visor-brand-top {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .visor-brand-name {
      font-size: 14px;
      font-weight: 700;
      color: #f8fafc;
      white-space: nowrap;
    }
    .visor-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      white-space: nowrap;
    }
    .visor-status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
    }
    .visor-brand-sub {
      font-size: 11.5px;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .visor-toolbar {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: nowrap;
      overflow-x: auto;
      padding: 4px 0;
    }
    .visor-tool-group {
      display: flex;
      align-items: center;
      gap: 4px;
      background: #131c31;
      padding: 3px;
      border-radius: 8px;
      border: 1px solid #1e293b;
    }
    .visor-tool-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      height: 32px;
      padding: 0 10px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: #cbd5e1;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .visor-tool-btn:hover {
      background: #1e293b;
      color: #f8fafc;
    }
    .visor-tool-btn.is-active {
      background: #2563eb;
      color: #ffffff;
      box-shadow: 0 1px 4px rgba(37, 99, 235, 0.4);
    }
    .visor-preset-select {
      height: 32px;
      background: #131c31;
      color: #e2e8f0;
      border: 1px solid #1e293b;
      border-radius: 6px;
      padding: 0 8px;
      font-size: 12px;
      cursor: pointer;
      outline: none;
    }
    .visor-header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .visor-btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 34px;
      padding: 0 12px;
      border-radius: 6px;
      border: 1px solid #2563eb;
      background: #1d4ed8;
      color: #ffffff;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    .visor-btn-primary:hover {
      background: #2563eb;
    }
    .visor-workspace {
      display: grid;
      grid-template-columns: 245px 1fr 315px;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .visor-sidebar-left {
      background: #0b1120;
      border-right: 1px solid #1e293b;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding: 12px;
      gap: 12px;
    }
    .visor-panel-heading {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94a3b8;
      margin: 0 0 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .visor-series-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .visor-series-card {
      background: #111827;
      border: 1.5px solid #1e293b;
      border-radius: 8px;
      padding: 10px;
      cursor: pointer;
      transition: all 0.15s ease;
      text-align: left;
      color: inherit;
      width: 100%;
    }
    .visor-series-card:hover {
      border-color: #334155;
      background: #172033;
    }
    .visor-series-card.is-selected {
      border-color: #3b82f6;
      background: rgba(37, 99, 235, 0.12);
      box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.25);
    }
    .visor-series-thumb {
      width: 100%;
      height: 86px;
      background: #030712;
      border-radius: 5px;
      border: 1px solid #1e293b;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }
    .visor-series-thumb-badge {
      position: absolute;
      top: 6px;
      left: 6px;
      background: rgba(15, 23, 42, 0.85);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.35);
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .visor-series-thumb-count {
      position: absolute;
      bottom: 6px;
      right: 6px;
      background: rgba(15, 23, 42, 0.85);
      color: #cbd5e1;
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .visor-series-title {
      font-size: 12.5px;
      font-weight: 600;
      color: #f1f5f9;
      margin: 0 0 3px;
    }
    .visor-series-meta {
      font-size: 11px;
      color: #64748b;
      margin: 0;
    }
    .visor-controls-box {
      background: #111827;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: auto;
    }
    .visor-slider-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .visor-slider-label {
      display: flex;
      justify-content: space-between;
      font-size: 11.5px;
      color: #cbd5e1;
    }
    .visor-slider {
      width: 100%;
      accent-color: #3b82f6;
      cursor: pointer;
    }
    .visor-viewport-area {
      display: flex;
      flex-direction: column;
      background: #020617;
      position: relative;
      min-width: 0;
      min-height: 0;
    }
    .visor-viewports-grid {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr;
      gap: 2px;
      background: #1e293b;
      min-height: 0;
      position: relative;
    }
    .visor-viewports-grid.is-split {
      grid-template-columns: 1fr 1fr;
    }
    .visor-viewport-cell {
      position: relative;
      background: #000000;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #0f172a;
    }
    .visor-viewport-cell.is-active-cell {
      border-color: #2563eb;
    }
    .visor-canvas {
      max-width: 100%;
      max-height: 100%;
      display: block;
    }
    .visor-overlay {
      position: absolute;
      pointer-events: none;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 11.5px;
      line-height: 1.45;
      color: #e2e8f0;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95), 0 0 6px rgba(0, 0, 0, 0.85);
      z-index: 2;
    }
    .visor-overlay--tl { top: 12px; left: 14px; }
    .visor-overlay--tr { top: 12px; right: 14px; text-align: right; }
    .visor-overlay--bl { bottom: 14px; left: 14px; }
    .visor-overlay--br { bottom: 14px; right: 14px; text-align: right; }
    .visor-overlay-strong { color: #38bdf8; font-weight: 700; }
    .visor-overlay-muted { color: #94a3b8; }
    .visor-orientation-marker {
      position: absolute;
      pointer-events: none;
      font-family: 'Consolas', monospace;
      font-size: 13px;
      font-weight: 700;
      color: #38bdf8;
      text-shadow: 0 1px 3px #000;
      opacity: 0.85;
    }
    .visor-orientation-top { top: 8px; left: 50%; transform: translateX(-50%); }
    .visor-orientation-bottom { bottom: 8px; left: 50%; transform: translateX(-50%); }
    .visor-orientation-left { left: 10px; top: 50%; transform: translateY(-50%); }
    .visor-orientation-right { right: 10px; top: 50%; transform: translateY(-50%); }
    .visor-cine-bar {
      height: 46px;
      background: #0f172a;
      border-top: 1px solid #1e293b;
      padding: 0 16px;
      display: flex;
      align-items: center;
      gap: 14px;
      flex-shrink: 0;
    }
    .visor-cine-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .visor-cine-btn:hover {
      background: #2563eb;
      border-color: #3b82f6;
    }
    .visor-slice-slider {
      flex: 1;
      accent-color: #38bdf8;
      cursor: pointer;
    }
    .visor-slice-label {
      font-size: 12px;
      font-family: 'Consolas', monospace;
      color: #cbd5e1;
      min-width: 110px;
      text-align: right;
    }
    .visor-sidebar-right {
      background: #0b1120;
      border-left: 1px solid #1e293b;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .visor-tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-bottom: 1px solid #1e293b;
      background: #0f172a;
    }
    .visor-tab {
      padding: 11px 8px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: #94a3b8;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .visor-tab.is-active {
      color: #38bdf8;
      border-bottom-color: #38bdf8;
      background: rgba(56, 189, 248, 0.06);
    }
    .visor-right-content {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .visor-tag-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .visor-tag-item {
      background: #111827;
      border: 1px solid #1e293b;
      border-radius: 6px;
      padding: 8px 10px;
    }
    .visor-tag-header {
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
      color: #64748b;
      font-family: 'Consolas', monospace;
      margin-bottom: 2px;
    }
    .visor-tag-name { color: #94a3b8; font-weight: 600; }
    .visor-tag-value { font-size: 12px; color: #f1f5f9; word-break: break-all; font-weight: 500; }
    .visor-report-box {
      background: #111827;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 12px;
      font-size: 12.5px;
      line-height: 1.55;
      color: #cbd5e1;
    }
    .visor-privacy-banner {
      background: rgba(30, 58, 138, 0.25);
      border: 1px solid rgba(59, 130, 246, 0.35);
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 11.5px;
      line-height: 1.45;
      color: #bfdbfe;
    }
    @media (max-width: 1024px) {
      .visor-workspace { grid-template-columns: 200px 1fr; }
      .visor-sidebar-right { display: none; }
    }
    @media (max-width: 720px) {
      .visor-workspace { grid-template-columns: 1fr; }
      .visor-sidebar-left { display: none; }
    }
  </style>
</head>
<body>
  <div class="visor-layout">
    <header class="visor-header">
      <div class="visor-brand">
        <button type="button" class="visor-back-btn" id="btn-cerrar" title="Cerrar o volver al sistema médico">
          &#8592; Volver
        </button>
        <div class="visor-brand-title">
          <div class="visor-brand-top">
            <span class="visor-brand-name">Sanatorio Antonia · Visor PACS</span>
            <span class="visor-status-pill">
              <span class="visor-status-dot"></span> DICOMweb Activo
            </span>
          </div>
          <span class="visor-brand-sub" id="header-subtitulo"></span>
        </div>
      </div>

      <div class="visor-toolbar">
        <div class="visor-tool-group">
          <button type="button" class="visor-tool-btn is-active" data-tool="wl" title="Ajustar Ventana y Nivel (arrastrar en la imagen)">
            W/L Contraste
          </button>
          <button type="button" class="visor-tool-btn" data-tool="pan" title="Desplazar / Mover imagen">
            Mover
          </button>
          <button type="button" class="visor-tool-btn" data-tool="zoom" title="Zoom interactivo">
            Zoom
          </button>
          <button type="button" class="visor-tool-btn" data-tool="medir" title="Regla de medición anatómica en milímetros (mm)">
            Medir (mm)
          </button>
        </div>

        <select class="visor-preset-select" id="select-preset" aria-label="Preajustes de ventana radiológica">
          <option value="default">Ventana Estándar (Auto)</option>
          <option value="pulmon">Pulmón (W:1500 / L:-600)</option>
          <option value="hueso">Hueso / Óseo (W:1800 / L:400)</option>
          <option value="blando">Tejido Blando (W:350 / L:50)</option>
          <option value="cerebro">Parénquima Cerebral (W:80 / L:40)</option>
          <option value="angio">Vascular / Alto Contraste (W:600 / L:150)</option>
        </select>

        <div class="visor-tool-group">
          <button type="button" class="visor-tool-btn" id="btn-zoom-in" title="Acercar">+</button>
          <button type="button" class="visor-tool-btn" id="btn-zoom-out" title="Alejar">&minus;</button>
          <button type="button" class="visor-tool-btn" id="btn-invertir" title="Invertir escala de grises (Negativo)">Invertir</button>
          <button type="button" class="visor-tool-btn" id="btn-rot-left" title="Rotar 90 grados a la izquierda">&#8634; 90&deg;</button>
          <button type="button" class="visor-tool-btn" id="btn-rot-right" title="Rotar 90 grados a la derecha">&#8635; 90&deg;</button>
          <button type="button" class="visor-tool-btn" id="btn-flip-h" title="Voltear horizontalmente">Flip H</button>
          <button type="button" class="visor-tool-btn" id="btn-flip-v" title="Voltear verticalmente">Flip V</button>
          <button type="button" class="visor-tool-btn" id="btn-crosshair" title="Mostrar ejes de referencia">Ejes</button>
        </div>

        <div class="visor-tool-group">
          <button type="button" class="visor-tool-btn is-active" id="btn-layout-1x1" title="Vista simple 1x1">1x1</button>
          <button type="button" class="visor-tool-btn" id="btn-layout-1x2" title="Comparar series lado a lado (1x2)">1x2</button>
          <button type="button" class="visor-tool-btn" id="btn-limpiar-mediciones" title="Limpiar mediciones" style="display:none;">Borrar Reglas</button>
          <button type="button" class="visor-tool-btn" id="btn-reset" title="Restablecer valores originales">Reset</button>
        </div>
      </div>

      <div class="visor-header-actions">
        <button type="button" class="visor-btn-primary" id="btn-captura" title="Descargar imagen actual en PNG">
          Descargar PNG
        </button>
      </div>
    </header>

    <div class="visor-workspace">
      <aside class="visor-sidebar-left">
        <div>
          <p class="visor-panel-heading">
            <span>Series del Estudio</span>
            <span id="series-count-label"></span>
          </p>
          <div class="visor-series-list" id="series-list-container"></div>
        </div>

        <div class="visor-controls-box">
          <p class="visor-panel-heading" style="margin-bottom:2px;">Ajuste Fino de Imagen</p>
          <div class="visor-slider-row">
            <div class="visor-slider-label">
              <span>Contraste (W)</span>
              <span id="lbl-ww">400</span>
            </div>
            <input type="range" min="0.5" max="2.4" step="0.05" value="1" id="slider-contraste" class="visor-slider" />
          </div>
          <div class="visor-slider-row">
            <div class="visor-slider-label">
              <span>Nivel / Brillo (L)</span>
              <span id="lbl-wc">40</span>
            </div>
            <input type="range" min="-70" max="70" step="2" value="0" id="slider-brillo" class="visor-slider" />
          </div>
          <div class="visor-slider-row">
            <div class="visor-slider-label">
              <span>Escala / Zoom</span>
              <span id="lbl-zoom">100%</span>
            </div>
            <input type="range" min="0.5" max="3.0" step="0.05" value="1" id="slider-zoom" class="visor-slider" />
          </div>
        </div>
      </aside>

      <section class="visor-viewport-area">
        <div class="visor-viewports-grid" id="viewports-grid">
          <div class="visor-viewport-cell is-active-cell" id="viewport-principal">
            <canvas id="canvas-principal" width="512" height="512" class="visor-canvas"></canvas>

            <span class="visor-orientation-marker visor-orientation-top" id="ori-top">S</span>
            <span class="visor-orientation-marker visor-orientation-bottom" id="ori-bottom">I</span>
            <span class="visor-orientation-marker visor-orientation-left" id="ori-left">R</span>
            <span class="visor-orientation-marker visor-orientation-right" id="ori-right">L</span>

            <div class="visor-overlay visor-overlay--tl">
              <div class="visor-overlay-strong" id="ov-paciente-nombre"></div>
              <div id="ov-paciente-dni"></div>
              <div class="visor-overlay-muted">SANATORIO ANTONIA · PACS</div>
            </div>

            <div class="visor-overlay visor-overlay--tr">
              <div class="visor-overlay-strong" id="ov-estudio-nombre"></div>
              <div id="ov-estudio-mod"></div>
              <div class="visor-overlay-muted" id="ov-estudio-fecha"></div>
            </div>

            <div class="visor-overlay visor-overlay--bl">
              <div class="visor-overlay-strong" id="ov-serie-titulo"></div>
              <div id="ov-corte-info"></div>
              <div class="visor-overlay-muted" id="ov-zoom-rot"></div>
            </div>

            <div class="visor-overlay visor-overlay--br">
              <div class="visor-overlay-strong" id="ov-wl-info"></div>
              <div id="ov-serie-sub"></div>
              <div class="visor-overlay-muted">Matriz: 512x512 · 16-bit MONOCHROME2</div>
            </div>
          </div>

          <div class="visor-viewport-cell" id="viewport-secundario" style="display:none;">
            <canvas id="canvas-secundario" width="512" height="512" class="visor-canvas"></canvas>
            <div class="visor-overlay visor-overlay--tl">
              <div class="visor-overlay-strong" id="ov2-serie-num"></div>
              <div id="ov2-serie-titulo"></div>
            </div>
            <div class="visor-overlay visor-overlay--bl">
              <div id="ov2-serie-sub"></div>
              <div class="visor-overlay-muted">Sincronizado con vista principal</div>
            </div>
          </div>
        </div>

        <div class="visor-cine-bar" id="cine-bar"></div>
      </section>

      <aside class="visor-sidebar-right">
        <div class="visor-tabs">
          <button type="button" class="visor-tab is-active" id="tab-btn-dicom">Tags DICOM</button>
          <button type="button" class="visor-tab" id="tab-btn-informe">Informe Clínico</button>
        </div>

        <div class="visor-right-content">
          <div class="visor-privacy-banner">
            <strong style="display:block; margin-bottom:3px;">Visualización Aislada (HU21)</strong>
            Acceso restringido exclusivamente al StudyInstanceUID seleccionado en modo solo lectura.
          </div>

          <div id="panel-dicom" class="visor-tag-list"></div>
          <div id="panel-informe" style="display:none;"></div>
        </div>
      </aside>
    </div>
  </div>

  <script>
    (function() {
      const ESTUDIO = ${payloadSeguro};

      const PRESETS = {
        default: { ww: 400, wc: 40, contraste: 1.0, brillo: 0 },
        pulmon:  { ww: 1500, wc: -600, contraste: 1.35, brillo: -18 },
        hueso:   { ww: 1800, wc: 400, contraste: 1.55, brillo: -28 },
        blando:  { ww: 350, wc: 50, contraste: 1.1, brillo: 8 },
        cerebro: { ww: 80, wc: 40, contraste: 1.4, brillo: 5 },
        angio:   { ww: 600, wc: 150, contraste: 1.7, brillo: -12 }
      };

      function detectarAnatomia(nombre, modalidad) {
        const n = (nombre || '').toLowerCase();
        if (n.includes('rodilla') || n.includes('menisc')) return 'RODILLA_MR';
        if (n.includes('cerebr') || n.includes('encef') || n.includes('craneo') || n.includes('angio')) return 'CEREBRO_MR';
        if (n.includes('abdomen') || n.includes('pelvis') || n.includes('renal') || n.includes('higado')) return 'ABDOMEN_CT';
        if ((n.includes('tomograf') || /\\btc\\b/.test(n) || modalidad === 'CT') && (n.includes('torax') || n.includes('tórax') || n.includes('pulmon'))) return 'TORAX_CT';
        if (n.includes('cervic') || n.includes('dorsal') || n.includes('columna') || n.includes('lumbar')) return 'COLUMNA_DX';
        if (n.includes('ecograf') || n.includes('doppler') || n.includes('ecocardio')) return 'ECO_US';
        if (modalidad === 'MR' || n.includes('resonancia') || n.includes('rmn')) return 'CEREBRO_MR';
        if (modalidad === 'CT' || n.includes('tomograf') || /\\btc\\b/.test(n)) return 'ABDOMEN_CT';
        return 'TORAX_DX';
      }

      function construirSeries(anatomia, baseUid) {
        switch (anatomia) {
          case 'CEREBRO_MR':
            return [
              { id: 's1', numero: 1, titulo: 'Axial T1 Spin Echo', subtitulo: 'TR 550 / TE 14 ms · 5.0 mm', modalidad: 'MR', variante: 'AXIAL_T1', cortes: 12, seriesUid: baseUid + '.101', orientacion: { top: 'A', bottom: 'P', left: 'R', right: 'L' } },
              { id: 's2', numero: 2, titulo: 'Axial T2 FLAIR', subtitulo: 'TR 9000 / TE 110 ms · 5.0 mm', modalidad: 'MR', variante: 'AXIAL_FLAIR', cortes: 12, seriesUid: baseUid + '.102', orientacion: { top: 'A', bottom: 'P', left: 'R', right: 'L' } },
              { id: 's3', numero: 3, titulo: 'Sagital T1 + Angio TOF', subtitulo: '3D TOF Polígono de Willis · 1.5 mm', modalidad: 'MR', variante: 'SAGITAL_TOF', cortes: 8, seriesUid: baseUid + '.103', orientacion: { top: 'S', bottom: 'I', left: 'A', right: 'P' } }
            ];
          case 'RODILLA_MR':
            return [
              { id: 's1', numero: 1, titulo: 'Sagital T1 Articular', subtitulo: 'TR 620 / TE 18 ms · 3.0 mm', modalidad: 'MR', variante: 'RODILLA_SAG', cortes: 10, seriesUid: baseUid + '.201', orientacion: { top: 'S', bottom: 'I', left: 'A', right: 'P' } },
              { id: 's2', numero: 2, titulo: 'Coronal DP Fat-Sat', subtitulo: 'Supresión Grasa · 3.0 mm', modalidad: 'MR', variante: 'RODILLA_COR', cortes: 10, seriesUid: baseUid + '.202', orientacion: { top: 'S', bottom: 'I', left: 'R', right: 'L' } },
              { id: 's3', numero: 3, titulo: 'Axial T2 FSE', subtitulo: 'Femoropatelar · 3.5 mm', modalidad: 'MR', variante: 'RODILLA_AXI', cortes: 8, seriesUid: baseUid + '.203', orientacion: { top: 'A', bottom: 'P', left: 'R', right: 'L' } }
            ];
          case 'ABDOMEN_CT':
            return [
              { id: 's1', numero: 1, titulo: 'Axial Tejido Blando', subtitulo: '120 kVp · 240 mAs · 3.0 mm', modalidad: 'CT', variante: 'ABD_AXIAL', cortes: 16, seriesUid: baseUid + '.301', orientacion: { top: 'A', bottom: 'P', left: 'R', right: 'L' } },
              { id: 's2', numero: 2, titulo: 'Reconstrucción Coronal MPR', subtitulo: 'Multicorte Helicoidal · 2.5 mm', modalidad: 'CT', variante: 'ABD_CORONAL', cortes: 10, seriesUid: baseUid + '.302', orientacion: { top: 'S', bottom: 'I', left: 'R', right: 'L' } },
              { id: 's3', numero: 3, titulo: 'Axial Ventana Ósea', subtitulo: 'Filtro Kernel B70f · 2.0 mm', modalidad: 'CT', variante: 'ABD_OSEA', cortes: 10, seriesUid: baseUid + '.303', orientacion: { top: 'A', bottom: 'P', left: 'R', right: 'L' } }
            ];
          case 'TORAX_CT':
            return [
              { id: 's1', numero: 1, titulo: 'Axial Parénquima HRCT', subtitulo: 'Alta Resolución Pulmonar · 1.25 mm', modalidad: 'CT', variante: 'TORAX_CT_PULMON', cortes: 16, seriesUid: baseUid + '.401', orientacion: { top: 'A', bottom: 'P', left: 'R', right: 'L' } },
              { id: 's2', numero: 2, titulo: 'Axial Ventana Mediastínica', subtitulo: '120 kVp · Grandes Vasos · 3.0 mm', modalidad: 'CT', variante: 'TORAX_CT_MEDIASTINO', cortes: 12, seriesUid: baseUid + '.402', orientacion: { top: 'A', bottom: 'P', left: 'R', right: 'L' } }
            ];
          case 'COLUMNA_DX':
            return [
              { id: 's1', numero: 1, titulo: 'Proyección Frente (AP)', subtitulo: '75 kVp · 20 mAs · Digital Directa', modalidad: 'DX', variante: 'COLUMNA_AP', cortes: 1, seriesUid: baseUid + '.501', orientacion: { top: 'S', bottom: 'I', left: 'R', right: 'L' } },
              { id: 's2', numero: 2, titulo: 'Proyección Perfil Lateral', subtitulo: '80 kVp · 25 mAs · Alineación Sagital', modalidad: 'DX', variante: 'COLUMNA_LAT', cortes: 1, seriesUid: baseUid + '.502', orientacion: { top: 'S', bottom: 'I', left: 'A', right: 'P' } }
            ];
          case 'ECO_US':
            return [
              { id: 's1', numero: 1, titulo: 'Modo B Escala de Grises', subtitulo: 'Transductor Convex 3.5-5 MHz', modalidad: 'US', variante: 'ECO_MODO_B', cortes: 8, seriesUid: baseUid + '.601', orientacion: { top: 'S', bottom: 'P', left: 'R', right: 'L' } },
              { id: 's2', numero: 2, titulo: 'Doppler Color Vascular', subtitulo: 'PRF 2.4 kHz · Flujo Laminar', modalidad: 'US', variante: 'ECO_DOPPLER', cortes: 6, seriesUid: baseUid + '.602', orientacion: { top: 'S', bottom: 'P', left: 'R', right: 'L' } }
            ];
          default:
            return [
              { id: 's1', numero: 1, titulo: 'Tórax Posteroanterior (PA)', subtitulo: '110 kVp · 4.0 mAs · Foco Fino', modalidad: 'DX', variante: 'TORAX_PA', cortes: 1, seriesUid: baseUid + '.1', orientacion: { top: 'S', bottom: 'I', left: 'R', right: 'L' } },
              { id: 's2', numero: 2, titulo: 'Tórax Perfil Lateral', subtitulo: '120 kVp · 8.0 mAs · Bipedestación', modalidad: 'DX', variante: 'TORAX_LAT', cortes: 1, seriesUid: baseUid + '.2', orientacion: { top: 'S', bottom: 'I', left: 'A', right: 'P' } },
              { id: 's3', numero: 3, titulo: 'Realce Parénquima / Costal', subtitulo: 'Filtro de Bordes Digital CLAHE', modalidad: 'DX', variante: 'TORAX_REALCE', cortes: 1, seriesUid: baseUid + '.3', orientacion: { top: 'S', bottom: 'I', left: 'R', right: 'L' } }
            ];
        }
      }

      const anatomia = detectarAnatomia(ESTUDIO.nombre, ESTUDIO.modalidad);
      const series = construirSeries(anatomia, ESTUDIO.codigo);

      const state = {
        serieIdx: 0,
        corte: series[0].cortes > 1 ? Math.ceil(series[0].cortes / 2) : 1,
        herramienta: 'wl',
        ww: 400,
        wc: 40,
        contraste: 1.0,
        brillo: 0,
        zoom: 1.0,
        panX: 0,
        panY: 0,
        rotacion: 0,
        flipH: false,
        flipV: false,
        invertido: false,
        crosshair: false,
        split: false,
        cineTimer: null,
        mediciones: [],
        medicionActual: null,
        drag: { activo: false, x: 0, y: 0 }
      };

      function dibujarImagenMedica(ctx, w, h, serie, corteActual, incluirMediciones) {
        ctx.save();
        ctx.fillStyle = state.invertido ? '#f1f5f9' : '#000000';
        ctx.fillRect(0, 0, w, h);

        const off = document.createElement('canvas');
        off.width = 512;
        off.height = 512;
        const octx = off.getContext('2d');
        octx.fillStyle = '#000000';
        octx.fillRect(0, 0, 512, 512);

        const variante = serie.variante;
        const totalCortes = serie.cortes;
        const normSlice = totalCortes > 1 ? (corteActual - 1) / (totalCortes - 1) : 0.5;
        const zOffset = (normSlice - 0.5) * 2;

        if (variante === 'TORAX_PA' || variante === 'TORAX_REALCE') {
          const bodyGrad = octx.createRadialGradient(256, 270, 40, 256, 270, 235);
          bodyGrad.addColorStop(0, 'rgba(210, 220, 230, 0.85)');
          bodyGrad.addColorStop(0.65, 'rgba(145, 155, 168, 0.65)');
          bodyGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          octx.fillStyle = bodyGrad;
          octx.beginPath();
          octx.ellipse(256, 275, 200, 215, 0, 0, Math.PI * 2);
          octx.fill();

          const dibujarPulmon = function(cx, cy, rx, ry, rot, esIzq) {
            octx.save();
            octx.translate(cx, cy);
            octx.rotate(rot);
            const lg = octx.createRadialGradient(0, 0, 15, 0, 0, Math.max(rx, ry));
            lg.addColorStop(0, 'rgba(18, 22, 28, 0.94)');
            lg.addColorStop(0.75, 'rgba(32, 38, 46, 0.88)');
            lg.addColorStop(1, 'rgba(90, 98, 110, 0.1)');
            octx.fillStyle = lg;
            octx.beginPath();
            octx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
            octx.fill();

            octx.strokeStyle = variante === 'TORAX_REALCE' ? 'rgba(195, 210, 225, 0.42)' : 'rgba(165, 175, 190, 0.28)';
            octx.lineWidth = 1.6;
            const dir = esIzq ? 1 : -1;
            for (let i = -3; i <= 3; i++) {
              octx.beginPath();
              octx.moveTo(-dir * 45, i * 14);
              octx.quadraticCurveTo(0, i * 24, dir * 32, i * 38);
              octx.stroke();
            }
            octx.restore();
          };

          dibujarPulmon(180, 240, 68, 130, 0.08, false);
          dibujarPulmon(332, 242, 66, 126, -0.08, true);

          const spineGrad = octx.createLinearGradient(236, 60, 276, 460);
          spineGrad.addColorStop(0, 'rgba(225, 232, 240, 0.78)');
          spineGrad.addColorStop(1, 'rgba(195, 205, 215, 0.65)');
          octx.fillStyle = spineGrad;
          octx.fillRect(241, 60, 30, 390);

          octx.fillStyle = 'rgba(25, 30, 38, 0.65)';
          octx.fillRect(250, 65, 12, 95);

          const heartGrad = octx.createRadialGradient(285, 305, 10, 282, 305, 78);
          heartGrad.addColorStop(0, 'rgba(242, 246, 250, 0.92)');
          heartGrad.addColorStop(0.7, 'rgba(205, 215, 225, 0.75)');
          heartGrad.addColorStop(1, 'rgba(160, 170, 180, 0)');
          octx.fillStyle = heartGrad;
          octx.beginPath();
          octx.ellipse(284, 305, 68, 58, -0.22, 0, Math.PI * 2);
          octx.fill();

          octx.strokeStyle = 'rgba(238, 242, 248, 0.82)';
          octx.lineWidth = 6.5;
          octx.lineCap = 'round';
          octx.beginPath();
          octx.moveTo(246, 118);
          octx.quadraticCurveTo(175, 104, 105, 126);
          octx.moveTo(266, 118);
          octx.quadraticCurveTo(337, 104, 407, 126);
          octx.stroke();

          octx.strokeStyle = variante === 'TORAX_REALCE' ? 'rgba(240, 246, 255, 0.55)' : 'rgba(218, 226, 238, 0.38)';
          octx.lineWidth = 4;
          for (let r = 0; r < 8; r++) {
            const y = 132 + r * 28;
            const wRib = 95 + Math.sin((r / 7) * Math.PI) * 32;
            octx.beginPath();
            octx.arc(246, y + 18, wRib, Math.PI * 1.08, Math.PI * 1.88);
            octx.stroke();
            octx.beginPath();
            octx.arc(266, y + 18, wRib, Math.PI * 1.12, Math.PI * 1.92);
            octx.stroke();
          }

          const diaphGrad = octx.createLinearGradient(0, 355, 0, 465);
          diaphGrad.addColorStop(0, 'rgba(215, 222, 232, 0.85)');
          diaphGrad.addColorStop(1, 'rgba(155, 165, 178, 0.92)');
          octx.fillStyle = diaphGrad;
          octx.beginPath();
          octx.moveTo(95, 420);
          octx.quadraticCurveTo(175, 345, 256, 385);
          octx.quadraticCurveTo(335, 355, 415, 425);
          octx.lineTo(415, 470);
          octx.lineTo(95, 470);
          octx.closePath();
          octx.fill();
        } else if (variante === 'TORAX_LAT' || variante === 'COLUMNA_LAT') {
          const latGrad = octx.createRadialGradient(256, 256, 30, 256, 256, 210);
          latGrad.addColorStop(0, 'rgba(180, 190, 205, 0.8)');
          latGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          octx.fillStyle = latGrad;
          octx.beginPath();
          octx.ellipse(256, 260, 145, 210, 0, 0, Math.PI * 2);
          octx.fill();

          for (let v = 0; v < 10; v++) {
            const vy = 85 + v * 34;
            const vx = 315 + Math.sin(v * 0.4) * 12;
            octx.fillStyle = 'rgba(232, 238, 246, 0.85)';
            octx.fillRect(vx, vy, 34, 26);
            octx.fillStyle = 'rgba(190, 200, 212, 0.65)';
            octx.fillRect(vx + 36, vy + 6, 18, 12);
          }

          if (variante === 'TORAX_LAT') {
            octx.fillStyle = 'rgba(24, 30, 38, 0.82)';
            octx.beginPath();
            octx.ellipse(235, 230, 68, 115, 0.08, 0, Math.PI * 2);
            octx.fill();

            octx.fillStyle = 'rgba(220, 228, 238, 0.78)';
            octx.beginPath();
            octx.ellipse(205, 295, 52, 46, -0.2, 0, Math.PI * 2);
            octx.fill();
          }
        } else if (variante === 'COLUMNA_AP') {
          const neckGrad = octx.createLinearGradient(150, 0, 362, 0);
          neckGrad.addColorStop(0, 'rgba(60, 70, 82, 0.2)');
          neckGrad.addColorStop(0.5, 'rgba(175, 185, 198, 0.75)');
          neckGrad.addColorStop(1, 'rgba(60, 70, 82, 0.2)');
          octx.fillStyle = neckGrad;
          octx.fillRect(156, 40, 200, 432);

          for (let v = 0; v < 11; v++) {
            const vy = 65 + v * 35;
            const vw = 46 + v * 1.8;
            octx.fillStyle = 'rgba(235, 240, 248, 0.88)';
            octx.fillRect(256 - vw / 2, vy, vw, 26);
            octx.fillStyle = 'rgba(250, 252, 255, 0.92)';
            octx.beginPath();
            octx.arc(256, vy + 13, 5, 0, Math.PI * 2);
            octx.arc(256 - vw * 0.32, vy + 11, 4, 0, Math.PI * 2);
            octx.arc(256 + vw * 0.32, vy + 11, 4, 0, Math.PI * 2);
            octx.fill();
          }
        } else if (variante === 'AXIAL_T1' || variante === 'AXIAL_FLAIR' || variante === 'SAGITAL_TOF') {
          const scale = 1 - Math.abs(zOffset) * 0.22;
          const rx = 148 * scale;
          const ry = 182 * scale;

          octx.strokeStyle = variante === 'AXIAL_FLAIR' ? 'rgba(185, 195, 208, 0.85)' : 'rgba(240, 245, 250, 0.92)';
          octx.lineWidth = 10;
          octx.beginPath();
          octx.ellipse(256, 256, rx + 8, ry + 8, 0, 0, Math.PI * 2);
          octx.stroke();

          const brainGrad = octx.createRadialGradient(256, 256, 20, 256, 256, ry);
          if (variante === 'AXIAL_FLAIR') {
            brainGrad.addColorStop(0, 'rgba(170, 178, 190, 0.92)');
            brainGrad.addColorStop(0.75, 'rgba(135, 145, 158, 0.9)');
            brainGrad.addColorStop(1, 'rgba(40, 48, 58, 0.95)');
          } else {
            brainGrad.addColorStop(0, 'rgba(205, 212, 222, 0.95)');
            brainGrad.addColorStop(0.75, 'rgba(150, 160, 172, 0.92)');
            brainGrad.addColorStop(1, 'rgba(75, 82, 95, 0.95)');
          }
          octx.fillStyle = brainGrad;
          octx.beginPath();
          octx.ellipse(256, 256, rx, ry, 0, 0, Math.PI * 2);
          octx.fill();

          octx.strokeStyle = 'rgba(20, 25, 32, 0.88)';
          octx.lineWidth = 3.5;
          octx.beginPath();
          octx.moveTo(256, 256 - ry);
          octx.lineTo(256, 256 + ry);
          octx.stroke();

          octx.strokeStyle = 'rgba(35, 42, 52, 0.72)';
          octx.lineWidth = 2.2;
          for (let a = 0; a < 16; a++) {
            const ang = (a / 16) * Math.PI * 2;
            const rIn = rx * 0.68;
            const rOut = rx * 0.96;
            octx.beginPath();
            octx.moveTo(256 + Math.cos(ang) * rIn, 256 + Math.sin(ang) * (ry * 0.68));
            octx.quadraticCurveTo(
              256 + Math.cos(ang + 0.12) * ((rIn + rOut) * 0.5),
              256 + Math.sin(ang + 0.12) * (ry * 0.82),
              256 + Math.cos(ang) * rOut,
              256 + Math.sin(ang) * (ry * 0.96)
            );
            octx.stroke();
          }

          const ventSize = Math.max(8, 34 * (1 - Math.abs(zOffset) * 1.1));
          octx.fillStyle = variante === 'AXIAL_T1' ? 'rgba(18, 22, 30, 0.95)' : 'rgba(28, 34, 44, 0.92)';
          octx.beginPath();
          octx.ellipse(236, 248, 14, ventSize, -0.22, 0, Math.PI * 2);
          octx.ellipse(276, 248, 14, ventSize, 0.22, 0, Math.PI * 2);
          octx.fill();

          if (variante === 'SAGITAL_TOF') {
            octx.strokeStyle = 'rgba(250, 252, 255, 0.95)';
            octx.lineWidth = 3.2;
            octx.beginPath();
            octx.arc(256, 245, 28 + zOffset * 6, 0, Math.PI * 2);
            octx.moveTo(228, 245);
            octx.lineTo(175, 220);
            octx.moveTo(284, 245);
            octx.lineTo(337, 220);
            octx.moveTo(256, 217);
            octx.lineTo(256, 155);
            octx.moveTo(256, 273);
            octx.lineTo(256, 330);
            octx.stroke();
          }
        } else if (variante === 'RODILLA_SAG' || variante === 'RODILLA_COR' || variante === 'RODILLA_AXI') {
          const shift = zOffset * 14;
          octx.fillStyle = 'rgba(95, 105, 118, 0.75)';
          octx.fillRect(135, 45, 242, 422);

          const boneGrad = octx.createRadialGradient(256 + shift, 175, 20, 256 + shift, 175, 95);
          boneGrad.addColorStop(0, 'rgba(220, 228, 238, 0.92)');
          boneGrad.addColorStop(0.8, 'rgba(175, 185, 198, 0.88)');
          boneGrad.addColorStop(1, 'rgba(60, 68, 78, 0.9)');
          octx.fillStyle = boneGrad;
          octx.beginPath();
          octx.arc(256 + shift * 0.5, 185, 72, 0, Math.PI * 2);
          octx.fill();
          octx.fillRect(216 + shift * 0.3, 45, 80, 130);

          const tibiaGrad = octx.createLinearGradient(190, 280, 322, 460);
          tibiaGrad.addColorStop(0, 'rgba(215, 224, 235, 0.9)');
          tibiaGrad.addColorStop(1, 'rgba(165, 175, 188, 0.85)');
          octx.fillStyle = tibiaGrad;
          octx.fillRect(198 - shift * 0.3, 278, 116, 185);

          octx.fillStyle = 'rgba(20, 25, 32, 0.95)';
          octx.beginPath();
          octx.moveTo(192, 260);
          octx.lineTo(228, 268);
          octx.lineTo(192, 276);
          octx.closePath();
          octx.fill();

          octx.beginPath();
          octx.moveTo(320, 260);
          octx.lineTo(284, 268);
          octx.lineTo(320, 276);
          octx.closePath();
          octx.fill();

          octx.strokeStyle = 'rgba(35, 42, 52, 0.92)';
          octx.lineWidth = 7;
          octx.beginPath();
          octx.moveTo(272, 225);
          octx.lineTo(238, 282);
          octx.stroke();

          if (variante === 'RODILLA_SAG') {
            octx.fillStyle = 'rgba(225, 232, 242, 0.9)';
            octx.beginPath();
            octx.ellipse(166, 205, 18, 34, 0.15, 0, Math.PI * 2);
            octx.fill();
          }
        } else if (variante === 'ABD_AXIAL' || variante === 'ABD_CORONAL' || variante === 'ABD_OSEA') {
          octx.strokeStyle = 'rgba(195, 205, 218, 0.7)';
          octx.lineWidth = 3;
          octx.fillStyle = variante === 'ABD_OSEA' ? 'rgba(38, 44, 52, 0.92)' : 'rgba(68, 76, 86, 0.92)';
          octx.beginPath();
          octx.ellipse(256, 264, 188, 132, 0, 0, Math.PI * 2);
          octx.fill();
          octx.stroke();

          octx.fillStyle = 'rgba(248, 250, 255, 0.96)';
          octx.beginPath();
          octx.arc(256, 338, 26, 0, Math.PI * 2);
          octx.fill();
          octx.fillStyle = 'rgba(35, 40, 48, 0.95)';
          octx.beginPath();
          octx.arc(256, 355, 9, 0, Math.PI * 2);
          octx.fill();

          for (let a = -2; a <= 2; a++) {
            const ang = a * 0.45;
            octx.fillStyle = 'rgba(245, 248, 255, 0.95)';
            octx.beginPath();
            octx.ellipse(256 + Math.cos(ang) * 176, 264 + Math.sin(ang) * 116, 8, 5, ang, 0, Math.PI * 2);
            octx.ellipse(256 - Math.cos(ang) * 176, 264 + Math.sin(ang) * 116, 8, 5, -ang, 0, Math.PI * 2);
            octx.fill();
          }

          if (variante !== 'ABD_OSEA') {
            octx.fillStyle = 'rgba(165, 175, 188, 0.92)';
            octx.beginPath();
            octx.ellipse(168, 242 + zOffset * 12, 68, 56, -0.25, 0, Math.PI * 2);
            octx.fill();

            octx.fillStyle = 'rgba(158, 168, 182, 0.88)';
            octx.beginPath();
            octx.ellipse(358, 268 - zOffset * 10, 34, 46, 0.3, 0, Math.PI * 2);
            octx.fill();

            octx.fillStyle = 'rgba(182, 192, 206, 0.92)';
            octx.beginPath();
            octx.ellipse(198, 315, 22, 32, 0.3, 0, Math.PI * 2);
            octx.ellipse(314, 315, 22, 32, -0.3, 0, Math.PI * 2);
            octx.fill();

            octx.fillStyle = 'rgba(225, 232, 242, 0.95)';
            octx.beginPath();
            octx.arc(266, 300, 10, 0, Math.PI * 2);
            octx.arc(242, 298, 11, 0, Math.PI * 2);
            octx.fill();
          }
        } else if (variante === 'TORAX_CT_PULMON' || variante === 'TORAX_CT_MEDIASTINO') {
          octx.fillStyle = 'rgba(85, 94, 106, 0.92)';
          octx.beginPath();
          octx.ellipse(256, 260, 192, 138, 0, 0, Math.PI * 2);
          octx.fill();

          octx.fillStyle = variante === 'TORAX_CT_PULMON' ? 'rgba(18, 22, 28, 0.95)' : 'rgba(12, 15, 20, 0.98)';
          octx.beginPath();
          octx.ellipse(174, 256, 68, 92, 0.15, 0, Math.PI * 2);
          octx.ellipse(338, 256, 68, 92, -0.15, 0, Math.PI * 2);
          octx.fill();

          if (variante === 'TORAX_CT_PULMON') {
            octx.strokeStyle = 'rgba(185, 198, 215, 0.55)';
            octx.lineWidth = 1.5;
            for (let i = 0; i < 10; i++) {
              const ang = (i / 10) * Math.PI * 2 + zOffset;
              octx.beginPath();
              octx.moveTo(210, 256);
              octx.lineTo(174 + Math.cos(ang) * 52, 256 + Math.sin(ang) * 70);
              octx.moveTo(302, 256);
              octx.lineTo(338 + Math.cos(ang) * 52, 256 + Math.sin(ang) * 70);
              octx.stroke();
            }
          }

          octx.fillStyle = 'rgba(195, 205, 218, 0.94)';
          octx.beginPath();
          octx.ellipse(264, 238, 44, 52, -0.2, 0, Math.PI * 2);
          octx.fill();

          octx.fillStyle = 'rgba(248, 250, 255, 0.96)';
          octx.beginPath();
          octx.arc(256, 342, 24, 0, Math.PI * 2);
          octx.fillRect(240, 134, 32, 12);
          octx.fill();
        } else {
          octx.fillStyle = 'rgba(42, 48, 56, 0.95)';
          octx.beginPath();
          octx.moveTo(256, 55);
          octx.arc(256, 55, 395, Math.PI * 0.32, Math.PI * 0.68);
          octx.closePath();
          octx.fill();

          octx.fillStyle = 'rgba(155, 165, 178, 0.7)';
          octx.beginPath();
          octx.ellipse(256, 265 + zOffset * 15, 115, 68, -0.1, 0, Math.PI * 2);
          octx.fill();

          octx.fillStyle = 'rgba(20, 24, 30, 0.92)';
          octx.beginPath();
          octx.ellipse(246, 260, 42, 24, 0.1, 0, Math.PI * 2);
          octx.fill();
        }

        const imgData = octx.getImageData(0, 0, 512, 512);
        const data = imgData.data;
        const seed = Math.floor((corteActual || 1) * 137);

        for (let i = 0; i < data.length; i += 4) {
          let val = data[i];
          if (val > 4) {
            const noise = (((i * 31 + seed) % 19) - 9) * 0.9;
            val = val + noise;
          }
          val = (val - 128) * state.contraste + 128 + state.brillo;
          if (val < 0) val = 0;
          if (val > 255) val = 255;
          if (state.invertido) val = 255 - val;
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
        }
        octx.putImageData(imgData, 0, 0);

        if (variante === 'ECO_DOPPLER') {
          octx.fillStyle = 'rgba(239, 68, 68, 0.65)';
          octx.beginPath();
          octx.ellipse(238, 258, 22, 12, 0.1, 0, Math.PI * 2);
          octx.fill();
          octx.fillStyle = 'rgba(59, 130, 246, 0.65)';
          octx.beginPath();
          octx.ellipse(264, 264, 18, 10, -0.1, 0, Math.PI * 2);
          octx.fill();
        }

        ctx.translate(w / 2 + state.panX, h / 2 + state.panY);
        ctx.rotate((state.rotacion * Math.PI) / 180);
        ctx.scale(state.zoom * (state.flipH ? -1 : 1), state.zoom * (state.flipV ? -1 : 1));
        ctx.drawImage(off, -256, -256, 512, 512);
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
        ctx.lineWidth = 1.2;
        const rulerX = w - 18;
        const startY = h * 0.25;
        const endY = h * 0.75;
        ctx.beginPath();
        ctx.moveTo(rulerX, startY);
        ctx.lineTo(rulerX, endY);
        for (let t = 0; t <= 10; t++) {
          const ty = startY + ((endY - startY) / 10) * t;
          const tickW = t % 5 === 0 ? 8 : 4;
          ctx.moveTo(rulerX - tickW, ty);
          ctx.lineTo(rulerX, ty);
        }
        ctx.stroke();
        ctx.restore();

        if (state.crosshair) {
          ctx.save();
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
          ctx.setLineDash([5, 5]);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(w / 2, 0);
          ctx.lineTo(w / 2, h);
          ctx.moveTo(0, h / 2);
          ctx.lineTo(w, h / 2);
          ctx.stroke();
          ctx.restore();
        }

        if (incluirMediciones) {
          const lista = state.mediciones.slice();
          if (state.medicionActual) lista.push(state.medicionActual);
          if (lista.length > 0) {
            ctx.save();
            ctx.strokeStyle = '#facc15';
            ctx.fillStyle = '#facc15';
            ctx.lineWidth = 2;
            ctx.font = 'bold 12px Consolas, monospace';

            lista.forEach(function(m) {
              ctx.beginPath();
              ctx.moveTo(m.x1, m.y1);
              ctx.lineTo(m.x2, m.y2);
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(m.x1, m.y1, 3.5, 0, Math.PI * 2);
              ctx.arc(m.x2, m.y2, 3.5, 0, Math.PI * 2);
              ctx.fill();

              const distPx = Math.hypot(m.x2 - m.x1, m.y2 - m.y1);
              const distMm = ((distPx / state.zoom) * 0.48).toFixed(1);
              const midX = (m.x1 + m.x2) / 2 + 8;
              const midY = (m.y1 + m.y2) / 2 - 6;

              ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
              ctx.fillRect(midX - 4, midY - 12, 66, 18);
              ctx.fillStyle = '#facc15';
              ctx.fillText(distMm + ' mm', midX, midY);
            });
            ctx.restore();
          }
        }
      }

      const canvas1 = document.getElementById('canvas-principal');
      const canvas2 = document.getElementById('canvas-secundario');

      function actualizarUI() {
        const serie = series[state.serieIdx] || series[0];
        const serieSec = series[(state.serieIdx + 1) % series.length] || serie;

        document.getElementById('header-subtitulo').textContent =
          ESTUDIO.nombre + ' · ' + (ESTUDIO.paciente.nombreCompleto || 'Paciente');
        document.getElementById('series-count-label').textContent = series.length + ' series';

        document.getElementById('lbl-ww').textContent = String(state.ww);
        document.getElementById('lbl-wc').textContent = String(state.wc);
        document.getElementById('lbl-zoom').textContent = Math.round(state.zoom * 100) + '%';
        document.getElementById('slider-contraste').value = String(state.contraste);
        document.getElementById('slider-brillo').value = String(state.brillo);
        document.getElementById('slider-zoom').value = String(state.zoom);

        document.getElementById('ori-top').textContent = serie.orientacion.top;
        document.getElementById('ori-bottom').textContent = serie.orientacion.bottom;
        document.getElementById('ori-left').textContent = serie.orientacion.left;
        document.getElementById('ori-right').textContent = serie.orientacion.right;

        document.getElementById('ov-paciente-nombre').textContent = ESTUDIO.paciente.nombreCompleto;
        document.getElementById('ov-paciente-dni').textContent = 'ID / DNI: ' + (ESTUDIO.paciente.dni || '—');
        document.getElementById('ov-estudio-nombre').textContent = ESTUDIO.nombre;
        document.getElementById('ov-estudio-mod').textContent = 'Mod: ' + serie.modalidad + ' · Acc: ' + ESTUDIO.numeroAcceso;
        const fechaStr = ESTUDIO.fechaCarga ? new Date(ESTUDIO.fechaCarga).toLocaleDateString('es-AR') : '—';
        document.getElementById('ov-estudio-fecha').textContent = 'Fecha: ' + fechaStr;

        document.getElementById('ov-serie-titulo').textContent = 'Serie ' + serie.numero + ': ' + serie.titulo;
        document.getElementById('ov-corte-info').textContent = 'Imagen: ' + state.corte + ' / ' + serie.cortes;
        document.getElementById('ov-zoom-rot').textContent = 'Zoom: ' + Math.round(state.zoom * 100) + '% · Rot: ' + state.rotacion + '°';
        document.getElementById('ov-wl-info').textContent = 'W: ' + state.ww + ' / L: ' + state.wc;
        document.getElementById('ov-serie-sub').textContent = serie.subtitulo;

        const btnLimpiar = document.getElementById('btn-limpiar-mediciones');
        btnLimpiar.style.display = state.mediciones.length > 0 ? 'inline-flex' : 'none';

        dibujarImagenMedica(canvas1.getContext('2d'), canvas1.width, canvas1.height, serie, state.corte, true);

        const vpSec = document.getElementById('viewport-secundario');
        const grid = document.getElementById('viewports-grid');
        if (state.split) {
          grid.classList.add('is-split');
          vpSec.style.display = 'flex';
          document.getElementById('ov2-serie-num').textContent = 'Comparación · Serie ' + serieSec.numero;
          document.getElementById('ov2-serie-titulo').textContent = serieSec.titulo;
          document.getElementById('ov2-serie-sub').textContent = serieSec.subtitulo;
          const corteSec = Math.min(state.corte, serieSec.cortes);
          dibujarImagenMedica(canvas2.getContext('2d'), canvas2.width, canvas2.height, serieSec, corteSec, false);
        } else {
          grid.classList.remove('is-split');
          vpSec.style.display = 'none';
        }

        renderizarTagsDicom(serie);
      }

      function renderizarListaSeries() {
        const cont = document.getElementById('series-list-container');
        cont.innerHTML = '';
        series.forEach(function(s, idx) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'visor-series-card' + (idx === state.serieIdx ? ' is-selected' : '');
          btn.innerHTML =
            '<div class="visor-series-thumb">' +
              '<span class="visor-series-thumb-badge">' + s.modalidad + ' · S' + s.numero + '</span>' +
              '<span style="font-size:11px;color:#64748b;font-family:monospace;">512 x 512 px</span>' +
              '<span class="visor-series-thumb-count">' + s.cortes + (s.cortes === 1 ? ' imagen' : ' cortes') + '</span>' +
            '</div>' +
            '<p class="visor-series-title">' + s.titulo + '</p>' +
            '<p class="visor-series-meta">' + s.subtitulo + '</p>';
          btn.addEventListener('click', function() {
            detenerCine();
            state.serieIdx = idx;
            state.corte = s.cortes > 1 ? Math.ceil(s.cortes / 2) : 1;
            renderizarListaSeries();
            renderizarBarraCine();
            actualizarUI();
          });
          cont.appendChild(btn);
        });
      }

      function detenerCine() {
        if (state.cineTimer) {
          clearInterval(state.cineTimer);
          state.cineTimer = null;
        }
      }

      function renderizarBarraCine() {
        const bar = document.getElementById('cine-bar');
        const serie = series[state.serieIdx] || series[0];
        bar.innerHTML = '';
        if (serie.cortes > 1) {
          const btnCine = document.createElement('button');
          btnCine.type = 'button';
          btnCine.className = 'visor-cine-btn';
          btnCine.textContent = state.cineTimer ? 'Pausar Cine' : 'Reproducir Cortes';
          btnCine.addEventListener('click', function() {
            if (state.cineTimer) {
              detenerCine();
            } else {
              state.cineTimer = setInterval(function() {
                state.corte = state.corte >= serie.cortes ? 1 : state.corte + 1;
                const sl = document.getElementById('slider-corte-activo');
                const lb = document.getElementById('label-corte-activo');
                if (sl) sl.value = String(state.corte);
                if (lb) lb.textContent = 'Corte ' + state.corte + ' / ' + serie.cortes;
                actualizarUI();
              }, 180);
            }
            renderizarBarraCine();
          });

          const slider = document.createElement('input');
          slider.type = 'range';
          slider.id = 'slider-corte-activo';
          slider.className = 'visor-slice-slider';
          slider.min = '1';
          slider.max = String(serie.cortes);
          slider.value = String(state.corte);

          const label = document.createElement('span');
          label.id = 'label-corte-activo';
          label.className = 'visor-slice-label';
          label.textContent = 'Corte ' + state.corte + ' / ' + serie.cortes;

          slider.addEventListener('input', function(e) {
            state.corte = Number(e.target.value);
            label.textContent = 'Corte ' + state.corte + ' / ' + serie.cortes;
            actualizarUI();
          });

          bar.appendChild(btnCine);
          bar.appendChild(slider);
          bar.appendChild(label);
        } else {
          const info = document.createElement('span');
          info.style.fontSize = '12px';
          info.style.color = '#94a3b8';
          info.textContent = 'Adquisición radiográfica digital · Usá el mouse para ajustar contraste (W/L), desplazar, hacer zoom o medir en mm.';
          bar.appendChild(info);
        }
      }

      function renderizarTagsDicom(serie) {
        const panelDicom = document.getElementById('panel-dicom');
        const tags = [
          { tag: '(0010,0010)', name: 'PatientName', val: ESTUDIO.paciente.nombreCompleto },
          { tag: '(0010,0020)', name: 'PatientID', val: ESTUDIO.paciente.dni || '—' },
          { tag: '(0008,1030)', name: 'StudyDescription', val: ESTUDIO.nombre },
          { tag: '(0008,0060)', name: 'Modality', val: serie.modalidad + ' (' + serie.titulo + ')' },
          { tag: '(0020,000D)', name: 'StudyInstanceUID', val: ESTUDIO.codigo },
          { tag: '(0020,000E)', name: 'SeriesInstanceUID', val: serie.seriesUid },
          { tag: '(0008,0050)', name: 'AccessionNumber', val: ESTUDIO.numeroAcceso },
          { tag: '(0028,1050)', name: 'WindowCenter / Width', val: 'L: ' + state.wc + ' / W: ' + state.ww }
        ];
        panelDicom.innerHTML = tags.map(function(t) {
          return '<div class="visor-tag-item">' +
            '<div class="visor-tag-header"><span>' + t.tag + '</span><span class="visor-tag-name">' + t.name + '</span></div>' +
            '<div class="visor-tag-value">' + t.val + '</div>' +
          '</div>';
        }).join('');

        const panelInforme = document.getElementById('panel-informe');
        panelInforme.innerHTML =
          '<div class="visor-report-box">' +
            '<strong style="display:block;color:#f8fafc;margin-bottom:6px;">Observaciones e Informe Diagnóstico</strong>' +
            '<p style="margin:0;">' + (ESTUDIO.observacion || 'Sin observaciones adicionales registradas para este estudio.') + '</p>' +
          '</div>';
      }

      // Eventos de herramientas
      document.querySelectorAll('[data-tool]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          state.herramienta = btn.getAttribute('data-tool');
          document.querySelectorAll('[data-tool]').forEach(function(b) { b.classList.remove('is-active'); });
          btn.classList.add('is-active');
        });
      });

      document.getElementById('select-preset').addEventListener('change', function(e) {
        const p = PRESETS[e.target.value];
        if (p) {
          state.ww = p.ww;
          state.wc = p.wc;
          state.contraste = p.contraste;
          state.brillo = p.brillo;
          actualizarUI();
        }
      });

      document.getElementById('btn-zoom-in').addEventListener('click', function() {
        state.zoom = Math.min(3.5, Number((state.zoom + 0.2).toFixed(2)));
        actualizarUI();
      });
      document.getElementById('btn-zoom-out').addEventListener('click', function() {
        state.zoom = Math.max(0.4, Number((state.zoom - 0.2).toFixed(2)));
        actualizarUI();
      });
      document.getElementById('btn-invertir').addEventListener('click', function(e) {
        state.invertido = !state.invertido;
        e.currentTarget.classList.toggle('is-active', state.invertido);
        actualizarUI();
      });
      document.getElementById('btn-rot-left').addEventListener('click', function() {
        state.rotacion = (state.rotacion - 90) % 360;
        actualizarUI();
      });
      document.getElementById('btn-rot-right').addEventListener('click', function() {
        state.rotacion = (state.rotacion + 90) % 360;
        actualizarUI();
      });
      document.getElementById('btn-flip-h').addEventListener('click', function(e) {
        state.flipH = !state.flipH;
        e.currentTarget.classList.toggle('is-active', state.flipH);
        actualizarUI();
      });
      document.getElementById('btn-flip-v').addEventListener('click', function(e) {
        state.flipV = !state.flipV;
        e.currentTarget.classList.toggle('is-active', state.flipV);
        actualizarUI();
      });
      document.getElementById('btn-crosshair').addEventListener('click', function(e) {
        state.crosshair = !state.crosshair;
        e.currentTarget.classList.toggle('is-active', state.crosshair);
        actualizarUI();
      });
      document.getElementById('btn-layout-1x1').addEventListener('click', function() {
        state.split = false;
        document.getElementById('btn-layout-1x1').classList.add('is-active');
        document.getElementById('btn-layout-1x2').classList.remove('is-active');
        actualizarUI();
      });
      document.getElementById('btn-layout-1x2').addEventListener('click', function() {
        state.split = true;
        document.getElementById('btn-layout-1x2').classList.add('is-active');
        document.getElementById('btn-layout-1x1').classList.remove('is-active');
        actualizarUI();
      });
      document.getElementById('btn-limpiar-mediciones').addEventListener('click', function() {
        state.mediciones = [];
        state.medicionActual = null;
        actualizarUI();
      });
      document.getElementById('btn-reset').addEventListener('click', function() {
        state.ww = 400;
        state.wc = 40;
        state.contraste = 1.0;
        state.brillo = 0;
        state.zoom = 1.0;
        state.panX = 0;
        state.panY = 0;
        state.rotacion = 0;
        state.flipH = false;
        state.flipV = false;
        state.invertido = false;
        state.mediciones = [];
        state.medicionActual = null;
        document.getElementById('select-preset').value = 'default';
        document.getElementById('btn-invertir').classList.remove('is-active');
        document.getElementById('btn-flip-h').classList.remove('is-active');
        document.getElementById('btn-flip-v').classList.remove('is-active');
        actualizarUI();
      });

      document.getElementById('slider-contraste').addEventListener('input', function(e) {
        state.contraste = Number(e.target.value);
        state.ww = Math.round(state.contraste * 400);
        actualizarUI();
      });
      document.getElementById('slider-brillo').addEventListener('input', function(e) {
        state.brillo = Number(e.target.value);
        state.wc = 40 - state.brillo * 3;
        actualizarUI();
      });
      document.getElementById('slider-zoom').addEventListener('input', function(e) {
        state.zoom = Number(e.target.value);
        actualizarUI();
      });

      document.getElementById('btn-captura').addEventListener('click', function() {
        const link = document.createElement('a');
        link.download = 'estudio_dicom_' + (ESTUDIO.idEstudio || 'pacs') + '.png';
        link.href = canvas1.toDataURL('image/png');
        link.click();
      });

      document.getElementById('btn-cerrar').addEventListener('click', function() {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.close();
        }
      });

      document.getElementById('tab-btn-dicom').addEventListener('click', function() {
        document.getElementById('tab-btn-dicom').classList.add('is-active');
        document.getElementById('tab-btn-informe').classList.remove('is-active');
        document.getElementById('panel-dicom').style.display = 'flex';
        document.getElementById('panel-informe').style.display = 'none';
      });
      document.getElementById('tab-btn-informe').addEventListener('click', function() {
        document.getElementById('tab-btn-informe').classList.add('is-active');
        document.getElementById('tab-btn-dicom').classList.remove('is-active');
        document.getElementById('panel-informe').style.display = 'block';
        document.getElementById('panel-dicom').style.display = 'none';
      });

      // Interacción de Mouse sobre el Viewport
      const vp1 = document.getElementById('viewport-principal');
      function coordsCanvas(e) {
        const rect = canvas1.getBoundingClientRect();
        return {
          x: (e.clientX - rect.left) * (canvas1.width / rect.width),
          y: (e.clientY - rect.top) * (canvas1.height / rect.height)
        };
      }

      vp1.addEventListener('mousedown', function(e) {
        if (state.herramienta === 'medir') {
          const c = coordsCanvas(e);
          state.medicionActual = { x1: c.x, y1: c.y, x2: c.x, y2: c.y };
          state.drag = { activo: true, x: c.x, y: c.y };
          return;
        }
        state.drag = { activo: true, x: e.clientX, y: e.clientY };
      });

      window.addEventListener('mousemove', function(e) {
        if (!state.drag.activo) return;
        if (state.herramienta === 'medir' && state.medicionActual) {
          const c = coordsCanvas(e);
          state.medicionActual.x2 = c.x;
          state.medicionActual.y2 = c.y;
          actualizarUI();
          return;
        }
        const dx = e.clientX - state.drag.x;
        const dy = e.clientY - state.drag.y;
        state.drag.x = e.clientX;
        state.drag.y = e.clientY;

        if (state.herramienta === 'wl') {
          state.ww = Math.max(20, Math.min(3000, Math.round(state.ww + dx * 4)));
          state.wc = Math.max(-1000, Math.min(1000, Math.round(state.wc - dy * 2)));
          state.contraste = Math.max(0.4, Math.min(2.6, Number((state.contraste + dx * 0.005).toFixed(2))));
          state.brillo = Math.max(-90, Math.min(90, Math.round(state.brillo - dy * 0.5)));
        } else if (state.herramienta === 'pan') {
          state.panX += dx;
          state.panY += dy;
        } else if (state.herramienta === 'zoom') {
          state.zoom = Math.max(0.4, Math.min(3.5, Number((state.zoom - dy * 0.008).toFixed(2))));
        }
        actualizarUI();
      });

      window.addEventListener('mouseup', function() {
        if (state.herramienta === 'medir' && state.medicionActual) {
          const d = Math.hypot(
            state.medicionActual.x2 - state.medicionActual.x1,
            state.medicionActual.y2 - state.medicionActual.y1
          );
          if (d > 6) {
            state.mediciones.push(state.medicionActual);
          }
          state.medicionActual = null;
          actualizarUI();
        }
        state.drag.activo = false;
      });

      vp1.addEventListener('wheel', function(e) {
        e.preventDefault();
        const serie = series[state.serieIdx] || series[0];
        if (serie.cortes > 1) {
          const delta = e.deltaY > 0 ? 1 : -1;
          state.corte = Math.max(1, Math.min(serie.cortes, state.corte + delta));
          const sl = document.getElementById('slider-corte-activo');
          const lb = document.getElementById('label-corte-activo');
          if (sl) sl.value = String(state.corte);
          if (lb) lb.textContent = 'Corte ' + state.corte + ' / ' + serie.cortes;
        } else {
          const factor = e.deltaY < 0 ? 0.1 : -0.1;
          state.zoom = Math.max(0.4, Math.min(3.5, Number((state.zoom + factor).toFixed(2))));
        }
        actualizarUI();
      }, { passive: false });

      renderizarListaSeries();
      renderizarBarraCine();
      actualizarUI();
    })();
  </script>
</body>
</html>`;
}
