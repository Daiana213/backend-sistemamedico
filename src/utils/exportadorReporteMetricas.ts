import type { obtenerPanelMetricas } from '../services/reporteService';

type PanelMetricas = Awaited<ReturnType<typeof obtenerPanelMetricas>>;

const OFFSET_MINUTOS_ARGENTINA = -3 * 60;

function redondear(valor: number, decimales = 2): number {
  const factor = Math.pow(10, decimales);
  return Math.round((valor + Number.EPSILON) * factor) / factor;
}

function escaparXml(texto: unknown): string {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function obtenerFechaEmisionLegible(): string {
  const ahoraArg = new Date(Date.now() + OFFSET_MINUTOS_ARGENTINA * 60000);
  const d = String(ahoraArg.getUTCDate()).padStart(2, '0');
  const m = String(ahoraArg.getUTCMonth() + 1).padStart(2, '0');
  const y = ahoraArg.getUTCFullYear();
  const hh = String(ahoraArg.getUTCHours()).padStart(2, '0');
  const mm = String(ahoraArg.getUTCMinutes()).padStart(2, '0');
  return `${d}/${m}/${y} ${hh}:${mm}`;
}

export function generarArchivoExcelReporte(panel: PanelMetricas): Buffer {
  const kpi = panel.indicadoresPrincipales;
  const comp = kpi.comparativaPeriodoAnterior;
  const cap = panel.metricasCapacidadOcupacion;
  const canc = panel.cancelacionesDetalle;
  const pac = panel.metricasPacientes;
  const aus = panel.ausentismoDetalle;
  const fechaEmision = obtenerFechaEmisionLegible();

  const estiloEfectividad = (pct: number, par: boolean) => {
    if (pct >= 75) return 'sBadgeGood';
    if (pct >= 50) return par ? 'sPctEven' : 'sPctOdd';
    return 'sBadgeWarn';
  };

  const estiloAusentismo = (pct: number, par: boolean) => {
    if (pct >= 20) return 'sBadgeDanger';
    if (pct >= 12) return 'sBadgeWarn';
    return par ? 'sPctEven' : 'sPctOdd';
  };

  let totalRealizadosEsp = 0;
  let totalCanceladosEsp = 0;
  let totalAusentesEsp = 0;
  let totalReprogEsp = 0;
  let totalTurnosEsp = 0;
  for (const e of panel.graficos.distribucionPorEspecialidad) {
    totalRealizadosEsp += e.realizados;
    totalCanceladosEsp += e.cancelados;
    totalAusentesEsp += e.ausentes;
    totalReprogEsp += e.reprogramados;
    totalTurnosEsp += e.totalTurnos;
  }

  const filasEspecialidades = panel.graficos.distribucionPorEspecialidad
    .map((e, idx) => {
      const par = idx % 2 === 0;
      const sTxt = par ? 'sRowEven' : 'sRowOdd';
      const sNum = par ? 'sNumEven' : 'sNumOdd';
      const sPct = par ? 'sPctEven' : 'sPctOdd';
      const tasaEfec = e.totalTurnos > 0 ? redondear((e.realizados / e.totalTurnos) * 100, 2) : 0;
      const tasaAus = e.totalTurnos > 0 ? redondear((e.ausentes / e.totalTurnos) * 100, 2) : 0;
      return `
      <Row ss:Height="20">
        <Cell ss:StyleID="${sTxt}"><Data ss:Type="String">${escaparXml(e.especialidad)}</Data></Cell>
        <Cell ss:StyleID="${sNum}"><Data ss:Type="Number">${e.totalTurnos}</Data></Cell>
        <Cell ss:StyleID="${sPct}"><Data ss:Type="Number">${e.porcentajeSobreTotal}</Data></Cell>
        <Cell ss:StyleID="${sNum}"><Data ss:Type="Number">${e.realizados}</Data></Cell>
        <Cell ss:StyleID="${sNum}"><Data ss:Type="Number">${e.cancelados}</Data></Cell>
        <Cell ss:StyleID="${sNum}"><Data ss:Type="Number">${e.ausentes}</Data></Cell>
        <Cell ss:StyleID="${sNum}"><Data ss:Type="Number">${e.reprogramados}</Data></Cell>
        <Cell ss:StyleID="${estiloEfectividad(tasaEfec, par)}"><Data ss:Type="Number">${tasaEfec}</Data></Cell>
        <Cell ss:StyleID="${estiloAusentismo(tasaAus, par)}"><Data ss:Type="Number">${tasaAus}</Data></Cell>
      </Row>`;
    })
    .join('');

  const filasDias = panel.graficos.evolucionPorDiaSemana
    .map((d, idx) => {
      const par = idx % 2 === 0;
      const sTxt = par ? 'sRowEven' : 'sRowOdd';
      const sNum = par ? 'sNumEven' : 'sNumOdd';
      const pctEfecDia = d.total > 0 ? redondear((d.realizados / d.total) * 100, 2) : 0;
      const pctAusDia = d.total > 0 ? redondear((d.ausentes / d.total) * 100, 2) : 0;
      return `
      <Row ss:Height="20">
        <Cell ss:StyleID="${sTxt}"><Data ss:Type="String">${escaparXml(d.nombreDia)}</Data></Cell>
        <Cell ss:StyleID="${sNum}"><Data ss:Type="Number">${d.total}</Data></Cell>
        <Cell ss:StyleID="${sNum}"><Data ss:Type="Number">${d.realizados}</Data></Cell>
        <Cell ss:StyleID="${sNum}"><Data ss:Type="Number">${d.cancelados}</Data></Cell>
        <Cell ss:StyleID="${sNum}"><Data ss:Type="Number">${d.ausentes}</Data></Cell>
        <Cell ss:StyleID="${sNum}"><Data ss:Type="Number">${d.reprogramados}</Data></Cell>
        <Cell ss:StyleID="${sNum}"><Data ss:Type="Number">${d.pendientes}</Data></Cell>
        <Cell ss:StyleID="${estiloEfectividad(pctEfecDia, par)}"><Data ss:Type="Number">${pctEfecDia}</Data></Cell>
        <Cell ss:StyleID="${estiloAusentismo(pctAusDia, par)}"><Data ss:Type="Number">${pctAusDia}</Data></Cell>
      </Row>`;
    })
    .join('');

  const filasFranjas = aus.porFranjaHoraria
    .map((f, idx) => {
      const par = idx % 2 === 0;
      const sTxt = par ? 'sRowEven' : 'sRowOdd';
      const sNum = par ? 'sNumEven' : 'sNumOdd';
      return `
      <Row ss:Height="20">
        <Cell ss:StyleID="${sTxt}"><Data ss:Type="String">${escaparXml(f.franja)}</Data></Cell>
        <Cell ss:StyleID="${sNum}"><Data ss:Type="Number">${f.totalTurnos}</Data></Cell>
        <Cell ss:StyleID="${sNum}"><Data ss:Type="Number">${(f as any).realizados ?? 0}</Data></Cell>
        <Cell ss:StyleID="${sNum}"><Data ss:Type="Number">${(f as any).cancelados ?? 0}</Data></Cell>
        <Cell ss:StyleID="${sNum}"><Data ss:Type="Number">${f.ausentes}</Data></Cell>
        <Cell ss:StyleID="${estiloAusentismo(f.porcentajeAusentismo, par)}"><Data ss:Type="Number">${f.porcentajeAusentismo}</Data></Cell>
      </Row>`;
    })
    .join('');

  const filasProfesionales = panel.rendimientoPorProfesional
    .map((p, idx) => {
      const par = idx % 2 === 0;
      const sTxt = par ? 'sRowEven' : 'sRowOdd';
      const sCtr = par ? 'sCenterEven' : 'sCenterOdd';
      const sNum = par ? 'sNumEven' : 'sNumOdd';
      return `
      <Row ss:Height="20">
        <Cell ss:StyleID="${sTxt}"><Data ss:Type="String">${escaparXml(p.nombreCompleto)}</Data></Cell>
        <Cell ss:StyleID="${sCtr}"><Data ss:Type="String">${escaparXml(p.matricula)}</Data></Cell>
        <Cell ss:StyleID="${sTxt}"><Data ss:Type="String">${escaparXml(p.especialidades.join(', '))}</Data></Cell>
        <Cell ss:StyleID="${sNum}"><Data ss:Type="Number">${p.totalTurnos}</Data></Cell>
        <Cell ss:StyleID="${sNum}"><Data ss:Type="Number">${p.realizados}</Data></Cell>
        <Cell ss:StyleID="${sNum}"><Data ss:Type="Number">${p.cancelados}</Data></Cell>
        <Cell ss:StyleID="${sNum}"><Data ss:Type="Number">${p.ausentes}</Data></Cell>
        <Cell ss:StyleID="${estiloEfectividad(p.tasaEfectividadPct, par)}"><Data ss:Type="Number">${p.tasaEfectividadPct}</Data></Cell>
        <Cell ss:StyleID="${estiloAusentismo(p.tasaAusentismoPct, par)}"><Data ss:Type="Number">${p.tasaAusentismoPct}</Data></Cell>
      </Row>`;
    })
    .join('');

  const filasCoberturas = pac.distribucionPorCobertura
    .map((c, idx) => {
      const par = idx % 2 === 0;
      const sTxt = par ? 'sRowEven' : 'sRowOdd';
      const sNum = par ? 'sNumEven' : 'sNumOdd';
      const sPct = par ? 'sPctEven' : 'sPctOdd';
      return `
      <Row ss:Height="20">
        <Cell ss:StyleID="${sTxt}"><Data ss:Type="String">${escaparXml(c.cobertura)}</Data></Cell>
        <Cell ss:StyleID="${sNum}"><Data ss:Type="Number">${c.cantidadTurnos}</Data></Cell>
        <Cell ss:StyleID="${sPct}"><Data ss:Type="Number">${c.porcentaje}</Data></Cell>
      </Row>`;
    })
    .join('');

  const filasReincidentes = aus.pacientesRecurrentesAusentismo.pacientes
    .map((p, idx) => {
      const par = idx % 2 === 0;
      const sTxt = par ? 'sRowEven' : 'sRowOdd';
      const sCtr = par ? 'sCenterEven' : 'sCenterOdd';
      return `
      <Row ss:Height="20">
        <Cell ss:StyleID="${sTxt}"><Data ss:Type="String">${escaparXml(p.nombreCompleto)}</Data></Cell>
        <Cell ss:StyleID="${sCtr}"><Data ss:Type="String">${escaparXml(p.dni)}</Data></Cell>
        <Cell ss:StyleID="sBadgeDangerInt"><Data ss:Type="Number">${p.cantidadAusencias}</Data></Cell>
      </Row>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1E293B"/>
    </Style>
    <Style ss:ID="sBannerTitle">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="14" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#0F296B" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="sBannerSub">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Color="#DBEAFE"/>
      <Interior ss:Color="#1E3A8A" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="sMetaLabel">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Bold="1" ss:Color="#1E40AF"/>
      <Interior ss:Color="#EFF6FF" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/>
      </Borders>
    </Style>
    <Style ss:ID="sMetaValue">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Bold="1" ss:Color="#0F172A"/>
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
      </Borders>
    </Style>
    <Style ss:ID="sSection">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="10.5" ss:Bold="1" ss:Color="#0F296B"/>
      <Interior ss:Color="#DBEAFE" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#1F4FE0"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#93C5FD"/>
      </Borders>
    </Style>
    <Style ss:ID="sHeaderLeft">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#1F4FE0" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F296B"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3B82F6"/>
      </Borders>
    </Style>
    <Style ss:ID="sHeaderCenter">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#1F4FE0" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F296B"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3B82F6"/>
      </Borders>
    </Style>
    <Style ss:ID="sHeaderRight">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#1F4FE0" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F296B"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3B82F6"/>
      </Borders>
    </Style>
    <Style ss:ID="sRowEven">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
    </Style>
    <Style ss:ID="sRowOdd">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
    </Style>
    <Style ss:ID="sCenterEven">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
    </Style>
    <Style ss:ID="sCenterOdd">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
    </Style>
    <Style ss:ID="sNumEven">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="#,##0"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
    </Style>
    <Style ss:ID="sNumOdd">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="#,##0"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
    </Style>
    <Style ss:ID="sPctEven">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="0.00&quot;%&quot;"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
    </Style>
    <Style ss:ID="sPctOdd">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="0.00&quot;%&quot;"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
    </Style>
    <Style ss:ID="sBadgeGood">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#166534"/>
      <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="0.00&quot;%&quot;"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BBF7D0"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BBF7D0"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BBF7D0"/>
      </Borders>
    </Style>
    <Style ss:ID="sBadgeWarn">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#92400E"/>
      <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="0.00&quot;%&quot;"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/>
      </Borders>
    </Style>
    <Style ss:ID="sBadgeDanger">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#991B1B"/>
      <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="0.00&quot;%&quot;"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/>
      </Borders>
    </Style>
    <Style ss:ID="sBadgeDangerInt">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#991B1B"/>
      <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="#,##0"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/>
      </Borders>
    </Style>
    <Style ss:ID="sTotalLabel">
      <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#0F296B"/>
      <Interior ss:Color="#EFF6FF" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#1E3A8A"/>
        <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#1E3A8A"/>
      </Borders>
    </Style>
    <Style ss:ID="sTotalNum">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#0F296B"/>
      <Interior ss:Color="#EFF6FF" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="#,##0"/>
      <Borders>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#1E3A8A"/>
        <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#1E3A8A"/>
      </Borders>
    </Style>
    <Style ss:ID="sTotalPct">
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#0F296B"/>
      <Interior ss:Color="#EFF6FF" ss:Pattern="Solid"/>
      <NumberFormat ss:Format="0.00&quot;%&quot;"/>
      <Borders>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#1E3A8A"/>
        <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#1E3A8A"/>
      </Borders>
    </Style>
  </Styles>

  <Worksheet ss:Name="Resumen Ejecutivo">
    <Table>
      <Column ss:Width="260"/>
      <Column ss:Width="135"/>
      <Column ss:Width="145"/>
      <Column ss:Width="210"/>
      <Row ss:Height="28">
        <Cell ss:MergeAcross="3" ss:StyleID="sBannerTitle"><Data ss:Type="String">SANATORIO ANTONIA — REPORTE EJECUTIVO DE MÉTRICAS Y GESTIÓN CLÍNICA</Data></Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:MergeAcross="3" ss:StyleID="sBannerSub"><Data ss:Type="String">Dirección Médica y Administración Operativa · Sistema Integral de Gestión de Turnos</Data></Cell>
      </Row>
      <Row ss:Height="8"/>
      <Row ss:Height="20">
        <Cell ss:StyleID="sMetaLabel"><Data ss:Type="String">Período Evaluado</Data></Cell>
        <Cell ss:StyleID="sMetaValue"><Data ss:Type="String">${escaparXml(panel.periodo.etiqueta)}</Data></Cell>
        <Cell ss:StyleID="sMetaLabel"><Data ss:Type="String">Fecha de Emisión</Data></Cell>
        <Cell ss:StyleID="sMetaValue"><Data ss:Type="String">${escaparXml(fechaEmision)}</Data></Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:StyleID="sMetaLabel"><Data ss:Type="String">Rango de Fechas</Data></Cell>
        <Cell ss:StyleID="sMetaValue"><Data ss:Type="String">${escaparXml(`${panel.periodo.fechaInicio} al ${panel.periodo.fechaFin}`)}</Data></Cell>
        <Cell ss:StyleID="sMetaLabel"><Data ss:Type="String">Especialidad Líder</Data></Cell>
        <Cell ss:StyleID="sMetaValue"><Data ss:Type="String">${escaparXml(kpi.especialidadMasDemandada ? `${kpi.especialidadMasDemandada.nombre} (${kpi.especialidadMasDemandada.cantidadTurnos} turnos · ${kpi.especialidadMasDemandada.porcentajeSobreTotal}%)` : 'Sin datos')}</Data></Cell>
      </Row>
      <Row ss:Height="10"/>

      <Row ss:Height="24">
        <Cell ss:MergeAcross="3" ss:StyleID="sSection"><Data ss:Type="String">1. INDICADORES PRINCIPALES DE DESEMPEÑO (KPIs)</Data></Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:StyleID="sHeaderLeft"><Data ss:Type="String">Indicador Clave</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Valor Actual</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Volumen / Tasa</Data></Cell>
        <Cell ss:StyleID="sHeaderLeft"><Data ss:Type="String">Comparativa vs. Período Anterior</Data></Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:StyleID="sRowEven"><Data ss:Type="String">Total de Turnos del Período</Data></Cell>
        <Cell ss:StyleID="sNumEven"><Data ss:Type="Number">${kpi.totalTurnos}</Data></Cell>
        <Cell ss:StyleID="sPctEven"><Data ss:Type="Number">100</Data></Cell>
        <Cell ss:StyleID="sRowEven"><Data ss:Type="String">${escaparXml(`Anterior: ${comp.totalTurnosAnterior} turnos (${(comp.variacionTotalTurnosPct ?? 0) >= 0 ? '+' : ''}${comp.variacionTotalTurnosPct ?? 0}%)`)}</Data></Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:StyleID="sRowOdd"><Data ss:Type="String">Turnos Atendidos (Efectividad Real)</Data></Cell>
        <Cell ss:StyleID="sNumOdd"><Data ss:Type="Number">${kpi.tasaEfectividadAtencion.cantidadRealizados}</Data></Cell>
        <Cell ss:StyleID="${estiloEfectividad(kpi.tasaEfectividadAtencion.porcentajeEfectividad, false)}"><Data ss:Type="Number">${kpi.tasaEfectividadAtencion.porcentajeEfectividad}</Data></Cell>
        <Cell ss:StyleID="sRowOdd"><Data ss:Type="String">${escaparXml(`Variación: ${comp.variacionEfectividadPuntos >= 0 ? '+' : ''}${comp.variacionEfectividadPuntos} puntos porcentuales`)}</Data></Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:StyleID="sRowEven"><Data ss:Type="String">Turnos con Ausentismo (Inasistencias)</Data></Cell>
        <Cell ss:StyleID="sNumEven"><Data ss:Type="Number">${kpi.cantidadAusentes}</Data></Cell>
        <Cell ss:StyleID="${estiloAusentismo(kpi.porcentajeAusentismo, true)}"><Data ss:Type="Number">${kpi.porcentajeAusentismo}</Data></Cell>
        <Cell ss:StyleID="sRowEven"><Data ss:Type="String">${escaparXml(`Variación: ${comp.variacionAusentismoPuntos >= 0 ? '+' : ''}${comp.variacionAusentismoPuntos} puntos porcentuales`)}</Data></Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:StyleID="sRowOdd"><Data ss:Type="String">Turnos Cancelados</Data></Cell>
        <Cell ss:StyleID="sNumOdd"><Data ss:Type="Number">${kpi.cantidadCancelados}</Data></Cell>
        <Cell ss:StyleID="${estiloAusentismo(kpi.porcentajeCancelaciones, false)}"><Data ss:Type="Number">${kpi.porcentajeCancelaciones}</Data></Cell>
        <Cell ss:StyleID="sRowOdd"><Data ss:Type="String">${escaparXml(`Variación: ${comp.variacionCancelacionesPuntos >= 0 ? '+' : ''}${comp.variacionCancelacionesPuntos} puntos porcentuales`)}</Data></Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:StyleID="sRowEven"><Data ss:Type="String">Turnos Reprogramados</Data></Cell>
        <Cell ss:StyleID="sNumEven"><Data ss:Type="Number">${kpi.tasaReprogramacion.cantidadReprogramados}</Data></Cell>
        <Cell ss:StyleID="sPctEven"><Data ss:Type="Number">${kpi.tasaReprogramacion.porcentajeReprogramados}</Data></Cell>
        <Cell ss:StyleID="sRowEven"><Data ss:Type="String">Reubicados dentro de la agenda activa</Data></Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:StyleID="sRowOdd"><Data ss:Type="String">Turnos Pendientes (Futuros en el período)</Data></Cell>
        <Cell ss:StyleID="sNumOdd"><Data ss:Type="Number">${kpi.turnosPendientes}</Data></Cell>
        <Cell ss:StyleID="sPctOdd"><Data ss:Type="Number">${kpi.totalTurnos > 0 ? redondear((kpi.turnosPendientes / kpi.totalTurnos) * 100, 2) : 0}</Data></Cell>
        <Cell ss:StyleID="sRowOdd"><Data ss:Type="String">Reservas confirmadas o solicitadas a futuro</Data></Cell>
      </Row>
      <Row ss:Height="10"/>

      <Row ss:Height="24">
        <Cell ss:MergeAcross="3" ss:StyleID="sSection"><Data ss:Type="String">2. CAPACIDAD OPERATIVA, ACCESIBILIDAD Y GESTIÓN DE PACIENTES</Data></Cell>
      </Row>
      <Row ss:Height="22">
        <Cell ss:StyleID="sHeaderLeft"><Data ss:Type="String">Dimensión Operativa</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Valor / Métrica</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Porcentaje / Ref.</Data></Cell>
        <Cell ss:StyleID="sHeaderLeft"><Data ss:Type="String">Detalle Operativo</Data></Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:StyleID="sRowEven"><Data ss:Type="String">Tasa de Ocupación de Agenda</Data></Cell>
        <Cell ss:StyleID="sNumEven"><Data ss:Type="Number">${cap.turnosOcupados}</Data></Cell>
        <Cell ss:StyleID="${estiloEfectividad(cap.tasaOcupacionAgendaPct, true)}"><Data ss:Type="Number">${cap.tasaOcupacionAgendaPct}</Data></Cell>
        <Cell ss:StyleID="sRowEven"><Data ss:Type="String">${escaparXml(`${cap.turnosOcupados} ocupados sobre ${cap.slotsDisponiblesTotales} slots configurados`)}</Data></Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:StyleID="sRowOdd"><Data ss:Type="String">Capacidad Ociosa Disponible (Slots Libres)</Data></Cell>
        <Cell ss:StyleID="sNumOdd"><Data ss:Type="Number">${cap.capacidadOciosaSlots}</Data></Cell>
        <Cell ss:StyleID="sPctOdd"><Data ss:Type="Number">${cap.slotsDisponiblesTotales > 0 ? redondear((cap.capacidadOciosaSlots / cap.slotsDisponiblesTotales) * 100, 2) : 0}</Data></Cell>
        <Cell ss:StyleID="sRowOdd"><Data ss:Type="String">${escaparXml(`${cap.profesionalesConAgendaActiva} profesionales con agenda activa en el período`)}</Data></Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:StyleID="sRowEven"><Data ss:Type="String">Antelación Promedio de Cancelación</Data></Cell>
        <Cell ss:StyleID="sCenterEven"><Data ss:Type="String">${escaparXml(canc.antelacionPromedioHoras !== null ? `${canc.antelacionPromedioHoras} hs` : 'Sin datos')}</Data></Cell>
        <Cell ss:StyleID="sPctEven"><Data ss:Type="Number">${canc.cancelacionesMenosDe24hs.porcentaje}</Data></Cell>
        <Cell ss:StyleID="sRowEven"><Data ss:Type="String">${escaparXml(`Cancelaciones críticas (<24 hs): ${canc.cancelacionesMenosDe24hs.cantidad} (${canc.cancelacionesMenosDe24hs.porcentaje}%)`)}</Data></Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:StyleID="sRowOdd"><Data ss:Type="String">Origen de Cancelaciones (Paciente vs. Centro)</Data></Cell>
        <Cell ss:StyleID="sNumOdd"><Data ss:Type="Number">${canc.origenCancelacion.paciente.cantidad}</Data></Cell>
        <Cell ss:StyleID="sPctOdd"><Data ss:Type="Number">${canc.origenCancelacion.paciente.porcentaje}</Data></Cell>
        <Cell ss:StyleID="sRowOdd"><Data ss:Type="String">${escaparXml(`Paciente: ${canc.origenCancelacion.paciente.cantidad} (${canc.origenCancelacion.paciente.porcentaje}%) · Centro: ${canc.origenCancelacion.administracionCentro.cantidad} (${canc.origenCancelacion.administracionCentro.porcentaje}%)`)}</Data></Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:StyleID="sRowEven"><Data ss:Type="String">Tiempo de Anticipación de Reserva (Lead Time)</Data></Cell>
        <Cell ss:StyleID="sCenterEven"><Data ss:Type="String">${escaparXml(panel.tiemposAccesibilidad.leadTimePromedioDias !== null ? `${panel.tiemposAccesibilidad.leadTimePromedioDias} días` : 'Sin datos')}</Data></Cell>
        <Cell ss:StyleID="sCenterEven"><Data ss:Type="String">${escaparXml(panel.tiemposAccesibilidad.leadTimePromedioHoras !== null ? `${panel.tiemposAccesibilidad.leadTimePromedioHoras} hs` : '—')}</Data></Cell>
        <Cell ss:StyleID="sRowEven"><Data ss:Type="String">Tiempo promedio entre solicitud y fecha efectiva del turno</Data></Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:StyleID="sRowOdd"><Data ss:Type="String">Pacientes Únicos Atendidos / Agendados</Data></Cell>
        <Cell ss:StyleID="sNumOdd"><Data ss:Type="Number">${pac.pacientesUnicosAtendidosOAgendados}</Data></Cell>
        <Cell ss:StyleID="sPctOdd"><Data ss:Type="Number">${pac.pacientesNuevos.porcentaje}</Data></Cell>
        <Cell ss:StyleID="sRowOdd"><Data ss:Type="String">${escaparXml(`Nuevos: ${pac.pacientesNuevos.cantidad} (${pac.pacientesNuevos.porcentaje}%) · Recurrentes: ${pac.pacientesRecurrentes.cantidad} (${pac.pacientesRecurrentes.porcentaje}%)`)}</Data></Cell>
      </Row>
    </Table>
  </Worksheet>

  <Worksheet ss:Name="Por Especialidad">
    <Table>
      <Column ss:Width="210"/>
      <Column ss:Width="95"/>
      <Column ss:Width="105"/>
      <Column ss:Width="95"/>
      <Column ss:Width="95"/>
      <Column ss:Width="95"/>
      <Column ss:Width="105"/>
      <Column ss:Width="105"/>
      <Column ss:Width="105"/>
      <Row ss:Height="26">
        <Cell ss:MergeAcross="8" ss:StyleID="sBannerTitle"><Data ss:Type="String">DISTRIBUCIÓN DE DEMANDA Y RENDIMIENTO POR ESPECIALIDAD MÉDICA</Data></Cell>
      </Row>
      <Row ss:Height="18">
        <Cell ss:MergeAcross="8" ss:StyleID="sBannerSub"><Data ss:Type="String">${escaparXml(`Período: ${panel.periodo.etiqueta} · Emitido: ${fechaEmision}`)}</Data></Cell>
      </Row>
      <Row ss:Height="8"/>
      <Row ss:Height="24">
        <Cell ss:StyleID="sHeaderLeft"><Data ss:Type="String">Especialidad Médica</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Total Turnos</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">% Participación</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Realizados</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Cancelados</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Ausentes</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Reprogramados</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">% Efectividad</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">% Ausentismo</Data></Cell>
      </Row>
      ${filasEspecialidades}
      <Row ss:Height="22">
        <Cell ss:StyleID="sTotalLabel"><Data ss:Type="String">TOTAL CONSOLIDADO</Data></Cell>
        <Cell ss:StyleID="sTotalNum"><Data ss:Type="Number">${totalTurnosEsp}</Data></Cell>
        <Cell ss:StyleID="sTotalPct"><Data ss:Type="Number">${totalTurnosEsp > 0 ? 100 : 0}</Data></Cell>
        <Cell ss:StyleID="sTotalNum"><Data ss:Type="Number">${totalRealizadosEsp}</Data></Cell>
        <Cell ss:StyleID="sTotalNum"><Data ss:Type="Number">${totalCanceladosEsp}</Data></Cell>
        <Cell ss:StyleID="sTotalNum"><Data ss:Type="Number">${totalAusentesEsp}</Data></Cell>
        <Cell ss:StyleID="sTotalNum"><Data ss:Type="Number">${totalReprogEsp}</Data></Cell>
        <Cell ss:StyleID="sTotalPct"><Data ss:Type="Number">${totalTurnosEsp > 0 ? redondear((totalRealizadosEsp / totalTurnosEsp) * 100, 2) : 0}</Data></Cell>
        <Cell ss:StyleID="sTotalPct"><Data ss:Type="Number">${totalTurnosEsp > 0 ? redondear((totalAusentesEsp / totalTurnosEsp) * 100, 2) : 0}</Data></Cell>
      </Row>
    </Table>
  </Worksheet>

  <Worksheet ss:Name="Por Día y Franja">
    <Table>
      <Column ss:Width="175"/>
      <Column ss:Width="95"/>
      <Column ss:Width="95"/>
      <Column ss:Width="95"/>
      <Column ss:Width="95"/>
      <Column ss:Width="105"/>
      <Column ss:Width="95"/>
      <Column ss:Width="105"/>
      <Column ss:Width="105"/>
      <Row ss:Height="26">
        <Cell ss:MergeAcross="8" ss:StyleID="sBannerTitle"><Data ss:Type="String">EVOLUCIÓN SEMANAL Y COMPORTAMIENTO POR FRANJA HORARIA</Data></Cell>
      </Row>
      <Row ss:Height="18">
        <Cell ss:MergeAcross="8" ss:StyleID="sBannerSub"><Data ss:Type="String">${escaparXml(`Período: ${panel.periodo.etiqueta}`)}</Data></Cell>
      </Row>
      <Row ss:Height="8"/>
      <Row ss:Height="22">
        <Cell ss:MergeAcross="8" ss:StyleID="sSection"><Data ss:Type="String">1. DISTRIBUCIÓN DE TURNOS POR DÍA DE LA SEMANA</Data></Cell>
      </Row>
      <Row ss:Height="24">
        <Cell ss:StyleID="sHeaderLeft"><Data ss:Type="String">Día de la Semana</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Total Turnos</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Realizados</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Cancelados</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Ausentes</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Reprogramados</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Pendientes</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">% Efectividad</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">% Ausentismo</Data></Cell>
      </Row>
      ${filasDias}
      <Row ss:Height="22">
        <Cell ss:StyleID="sTotalLabel"><Data ss:Type="String">TOTAL SEMANAL</Data></Cell>
        <Cell ss:StyleID="sTotalNum"><Data ss:Type="Number">${kpi.totalTurnos}</Data></Cell>
        <Cell ss:StyleID="sTotalNum"><Data ss:Type="Number">${kpi.tasaEfectividadAtencion.cantidadRealizados}</Data></Cell>
        <Cell ss:StyleID="sTotalNum"><Data ss:Type="Number">${kpi.cantidadCancelados}</Data></Cell>
        <Cell ss:StyleID="sTotalNum"><Data ss:Type="Number">${kpi.cantidadAusentes}</Data></Cell>
        <Cell ss:StyleID="sTotalNum"><Data ss:Type="Number">${kpi.tasaReprogramacion.cantidadReprogramados}</Data></Cell>
        <Cell ss:StyleID="sTotalNum"><Data ss:Type="Number">${kpi.turnosPendientes}</Data></Cell>
        <Cell ss:StyleID="sTotalPct"><Data ss:Type="Number">${kpi.tasaEfectividadAtencion.porcentajeEfectividad}</Data></Cell>
        <Cell ss:StyleID="sTotalPct"><Data ss:Type="Number">${kpi.porcentajeAusentismo}</Data></Cell>
      </Row>
      <Row ss:Height="14"/>
      <Row ss:Height="22">
        <Cell ss:MergeAcross="5" ss:StyleID="sSection"><Data ss:Type="String">2. ANÁLISIS DE ACTIVIDAD Y AUSENTISMO POR FRANJA HORARIA</Data></Cell>
      </Row>
      <Row ss:Height="24">
        <Cell ss:StyleID="sHeaderLeft"><Data ss:Type="String">Franja Horaria</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Total Turnos</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Realizados</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Cancelados</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Ausentes</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">% Ausentismo</Data></Cell>
      </Row>
      ${filasFranjas}
    </Table>
  </Worksheet>

  <Worksheet ss:Name="Por Profesional">
    <Table>
      <Column ss:Width="195"/>
      <Column ss:Width="95"/>
      <Column ss:Width="190"/>
      <Column ss:Width="95"/>
      <Column ss:Width="95"/>
      <Column ss:Width="95"/>
      <Column ss:Width="95"/>
      <Column ss:Width="105"/>
      <Column ss:Width="105"/>
      <Row ss:Height="26">
        <Cell ss:MergeAcross="8" ss:StyleID="sBannerTitle"><Data ss:Type="String">RENDIMIENTO OPERATIVO POR PROFESIONAL MÉDICO</Data></Cell>
      </Row>
      <Row ss:Height="18">
        <Cell ss:MergeAcross="8" ss:StyleID="sBannerSub"><Data ss:Type="String">${escaparXml(`Período: ${panel.periodo.etiqueta}`)}</Data></Cell>
      </Row>
      <Row ss:Height="8"/>
      <Row ss:Height="24">
        <Cell ss:StyleID="sHeaderLeft"><Data ss:Type="String">Profesional</Data></Cell>
        <Cell ss:StyleID="sHeaderCenter"><Data ss:Type="String">Matrícula</Data></Cell>
        <Cell ss:StyleID="sHeaderLeft"><Data ss:Type="String">Especialidades</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Total Turnos</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Realizados</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Cancelados</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Ausentes</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">% Efectividad</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">% Ausentismo</Data></Cell>
      </Row>
      ${filasProfesionales}
    </Table>
  </Worksheet>

  <Worksheet ss:Name="Pacientes y Coberturas">
    <Table>
      <Column ss:Width="230"/>
      <Column ss:Width="120"/>
      <Column ss:Width="130"/>
      <Row ss:Height="26">
        <Cell ss:MergeAcross="2" ss:StyleID="sBannerTitle"><Data ss:Type="String">COBERTURAS MÉDICAS Y SEGUIMIENTO DE AUSENTISMO RECURRENTE</Data></Cell>
      </Row>
      <Row ss:Height="18">
        <Cell ss:MergeAcross="2" ss:StyleID="sBannerSub"><Data ss:Type="String">${escaparXml(`Período: ${panel.periodo.etiqueta}`)}</Data></Cell>
      </Row>
      <Row ss:Height="8"/>
      <Row ss:Height="22">
        <Cell ss:MergeAcross="2" ss:StyleID="sSection"><Data ss:Type="String">1. DISTRIBUCIÓN DE TURNOS POR OBRA SOCIAL / COBERTURA</Data></Cell>
      </Row>
      <Row ss:Height="24">
        <Cell ss:StyleID="sHeaderLeft"><Data ss:Type="String">Obra Social / Cobertura</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Cantidad Turnos</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">% Participación</Data></Cell>
      </Row>
      ${filasCoberturas}
      <Row ss:Height="14"/>
      <Row ss:Height="22">
        <Cell ss:MergeAcross="2" ss:StyleID="sSection"><Data ss:Type="String">2. PACIENTES CON AUSENTISMO RECURRENTE (2 O MÁS INASISTENCIAS)</Data></Cell>
      </Row>
      <Row ss:Height="24">
        <Cell ss:StyleID="sHeaderLeft"><Data ss:Type="String">Paciente</Data></Cell>
        <Cell ss:StyleID="sHeaderCenter"><Data ss:Type="String">DNI</Data></Cell>
        <Cell ss:StyleID="sHeaderRight"><Data ss:Type="String">Inasistencias</Data></Cell>
      </Row>
      ${
        filasReincidentes ||
        `<Row ss:Height="20"><Cell ss:MergeAcross="2" ss:StyleID="sRowEven"><Data ss:Type="String">Sin pacientes reincidentes en el período seleccionado.</Data></Cell></Row>`
      }
    </Table>
  </Worksheet>
</Workbook>`;

  return Buffer.from(xml, 'utf-8');
}

function sanitizarTextoPdf(texto: string): string {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[()\\]/g, (m) => `\\${m}`);
}

function truncarTextoPdf(texto: string, maxLen: number): string {
  const limpio = (texto || '').trim();
  if (limpio.length <= maxLen) return limpio;
  return `${limpio.slice(0, Math.max(0, maxLen - 3))}...`;
}

function pdfTexto(
  x: number,
  y: number,
  texto: string,
  opciones: {
    fuente?: 'F1' | 'F2';
    tamano?: number;
    color?: [number, number, number];
  } = {}
): string {
  const fuente = opciones.fuente || 'F1';
  const tamano = opciones.tamano ?? 9;
  const [r, g, b] = opciones.color || [0.12, 0.16, 0.23];
  return `BT\n${r} ${g} ${b} rg\n/${fuente} ${tamano} Tf\n${x} ${y} Td\n(${sanitizarTextoPdf(texto)}) Tj\nET`;
}

function pdfRect(
  x: number,
  y: number,
  w: number,
  h: number,
  opciones: {
    fill?: [number, number, number];
    stroke?: [number, number, number];
    lineWidth?: number;
  }
): string {
  const cmds: string[] = [];
  if (opciones.lineWidth !== undefined) {
    cmds.push(`${opciones.lineWidth} w`);
  }
  if (opciones.fill && opciones.stroke) {
    const [fr, fg, fb] = opciones.fill;
    const [sr, sg, sb] = opciones.stroke;
    cmds.push(`${fr} ${fg} ${fb} rg`);
    cmds.push(`${sr} ${sg} ${sb} RG`);
    cmds.push(`${x} ${y} ${w} ${h} re B`);
  } else if (opciones.fill) {
    const [fr, fg, fb] = opciones.fill;
    cmds.push(`${fr} ${fg} ${fb} rg`);
    cmds.push(`${x} ${y} ${w} ${h} re f`);
  } else if (opciones.stroke) {
    const [sr, sg, sb] = opciones.stroke;
    cmds.push(`${sr} ${sg} ${sb} RG`);
    cmds.push(`${x} ${y} ${w} ${h} re S`);
  }
  return cmds.join('\n');
}

function pdfLinea(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: [number, number, number] = [0.85, 0.88, 0.93],
  ancho = 0.6
): string {
  const [r, g, b] = color;
  return `${ancho} w\n${r} ${g} ${b} RG\n${x1} ${y1} m ${x2} ${y2} l S`;
}

export function generarArchivoPdfReporte(panel: PanelMetricas): Buffer {
  const kpi = panel.indicadoresPrincipales;
  const comp = kpi.comparativaPeriodoAnterior;
  const cap = panel.metricasCapacidadOcupacion;
  const canc = panel.cancelacionesDetalle;
  const pac = panel.metricasPacientes;
  const aus = panel.ausentismoDetalle;
  const fechaEmision = obtenerFechaEmisionLegible();

  const p1: string[] = [];

  p1.push(pdfRect(0, 834, 595, 8, { fill: [0.06, 0.16, 0.42] }));
  p1.push(pdfRect(40, 778, 34, 34, { fill: [0.12, 0.31, 0.88] }));
  p1.push(pdfRect(54, 785, 6, 20, { fill: [1, 1, 1] }));
  p1.push(pdfRect(47, 792, 20, 6, { fill: [1, 1, 1] }));

  p1.push(
    pdfTexto(84, 798, 'SANATORIO ANTONIA', {
      fuente: 'F2',
      tamano: 15,
      color: [0.06, 0.16, 0.42],
    })
  );
  p1.push(
    pdfTexto(84, 785, 'DIRECCION MEDICA Y GESTION OPERATIVA - INTELIGENCIA CLINICA', {
      fuente: 'F1',
      tamano: 8,
      color: [0.35, 0.42, 0.52],
    })
  );

  p1.push(
    pdfRect(375, 774, 180, 42, {
      fill: [0.96, 0.98, 1.0],
      stroke: [0.78, 0.84, 0.95],
      lineWidth: 0.7,
    })
  );
  p1.push(
    pdfTexto(384, 803, 'REPORTE EJECUTIVO DE METRICAS', {
      fuente: 'F2',
      tamano: 7.5,
      color: [0.12, 0.31, 0.88],
    })
  );
  p1.push(
    pdfTexto(384, 791, `Periodo: ${truncarTextoPdf(panel.periodo.etiqueta, 30)}`, {
      fuente: 'F2',
      tamano: 7.2,
      color: [0.1, 0.15, 0.25],
    })
  );
  p1.push(
    pdfTexto(384, 780, `Emision: ${fechaEmision} hs`, {
      fuente: 'F1',
      tamano: 7,
      color: [0.4, 0.45, 0.54],
    })
  );

  p1.push(pdfLinea(40, 764, 555, 764, [0.12, 0.31, 0.88], 1.2));

  p1.push(pdfRect(40, 742, 4, 12, { fill: [0.12, 0.31, 0.88] }));
  p1.push(
    pdfTexto(49, 744, '1. INDICADORES PRINCIPALES DE DESEMPENO (KPIs)', {
      fuente: 'F2',
      tamano: 9.5,
      color: [0.06, 0.16, 0.42],
    })
  );

  const tarjetasKpi: Array<{
    titulo: string;
    valor: string;
    sub1: string;
    sub2: string;
    colorBanda: [number, number, number];
    colorValor: [number, number, number];
  }> = [
    {
      titulo: 'TOTAL TURNOS',
      valor: String(kpi.totalTurnos),
      sub1: `Pendientes: ${kpi.turnosPendientes} | Reprog: ${kpi.tasaReprogramacion.cantidadReprogramados}`,
      sub2: `vs. ant: ${(comp.variacionTotalTurnosPct ?? 0) >= 0 ? '+' : ''}${comp.variacionTotalTurnosPct ?? 0}% (${comp.totalTurnosAnterior})`,
      colorBanda: [0.12, 0.31, 0.88],
      colorValor: [0.06, 0.16, 0.42],
    },
    {
      titulo: 'ATENCION EFECTIVA',
      valor: `${kpi.tasaEfectividadAtencion.porcentajeEfectividad}%`,
      sub1: `${kpi.tasaEfectividadAtencion.cantidadRealizados} consultas realizadas`,
      sub2: `vs. ant: ${comp.variacionEfectividadPuntos >= 0 ? '+' : ''}${comp.variacionEfectividadPuntos} pp`,
      colorBanda: [0.06, 0.65, 0.42],
      colorValor: [0.04, 0.47, 0.3],
    },
    {
      titulo: 'TASA AUSENTISMO',
      valor: `${kpi.porcentajeAusentismo}%`,
      sub1: `${kpi.cantidadAusentes} turnos ausentes`,
      sub2: `vs. ant: ${comp.variacionAusentismoPuntos >= 0 ? '+' : ''}${comp.variacionAusentismoPuntos} pp`,
      colorBanda: [0.88, 0.22, 0.22],
      colorValor: [0.72, 0.11, 0.11],
    },
    {
      titulo: 'CANCELACIONES',
      valor: `${kpi.porcentajeCancelaciones}%`,
      sub1: `${kpi.cantidadCancelados} turnos cancelados`,
      sub2: `Criticas (<24h): ${canc.cancelacionesMenosDe24hs.cantidad} (${canc.cancelacionesMenosDe24hs.porcentaje}%)`,
      colorBanda: [0.92, 0.55, 0.05],
      colorValor: [0.7, 0.36, 0.04],
    },
  ];

  tarjetasKpi.forEach((card, idx) => {
    const x = 40 + idx * 130.5;
    const y = 668;
    const w = 123.5;
    const h = 66;
    p1.push(
      pdfRect(x, y, w, h, {
        fill: [0.98, 0.99, 1.0],
        stroke: [0.85, 0.89, 0.95],
        lineWidth: 0.7,
      })
    );
    p1.push(pdfRect(x, y + h - 4, w, 4, { fill: card.colorBanda }));
    p1.push(
      pdfTexto(x + 8, y + 48, card.titulo, {
        fuente: 'F2',
        tamano: 7.2,
        color: [0.4, 0.46, 0.55],
      })
    );
    p1.push(
      pdfTexto(x + 8, y + 29, card.valor, {
        fuente: 'F2',
        tamano: 15,
        color: card.colorValor,
      })
    );
    p1.push(
      pdfTexto(x + 8, y + 16, truncarTextoPdf(card.sub1, 28), {
        fuente: 'F1',
        tamano: 6.8,
        color: [0.25, 0.3, 0.38],
      })
    );
    p1.push(
      pdfTexto(x + 8, y + 6, truncarTextoPdf(card.sub2, 28), {
        fuente: 'F2',
        tamano: 6.6,
        color: [0.42, 0.48, 0.58],
      })
    );
  });

  p1.push(pdfRect(40, 646, 4, 12, { fill: [0.12, 0.31, 0.88] }));
  p1.push(
    pdfTexto(49, 648, '2. CAPACIDAD DE AGENDA, ACCESIBILIDAD Y PACIENTES', {
      fuente: 'F2',
      tamano: 9.5,
      color: [0.06, 0.16, 0.42],
    })
  );

  p1.push(
    pdfRect(40, 548, 252, 90, {
      fill: [0.98, 0.99, 1.0],
      stroke: [0.84, 0.88, 0.94],
      lineWidth: 0.7,
    })
  );
  p1.push(
    pdfTexto(50, 624, 'OCUPACION DE AGENDA Y CAPACIDAD OPERATIVA', {
      fuente: 'F2',
      tamano: 7.8,
      color: [0.12, 0.31, 0.88],
    })
  );
  p1.push(
    pdfTexto(245, 624, `${cap.tasaOcupacionAgendaPct}%`, {
      fuente: 'F2',
      tamano: 9,
      color: [0.06, 0.16, 0.42],
    })
  );
  p1.push(pdfRect(50, 612, 232, 7, { fill: [0.89, 0.92, 0.96] }));
  const anchoBarraOcup = Math.max(0, Math.min(232, (cap.tasaOcupacionAgendaPct / 100) * 232));
  if (anchoBarraOcup > 0) {
    p1.push(pdfRect(50, 612, redondear(anchoBarraOcup, 1), 7, { fill: [0.12, 0.31, 0.88] }));
  }

  p1.push(
    pdfTexto(50, 596, `Slots configurados totales: ${cap.slotsDisponiblesTotales}`, {
      fuente: 'F1',
      tamano: 7.8,
    })
  );
  p1.push(
    pdfTexto(50, 583, `Turnos que ocupan agenda: ${cap.turnosOcupados}`, {
      fuente: 'F1',
      tamano: 7.8,
    })
  );
  p1.push(
    pdfTexto(50, 570, `Capacidad ociosa disponible: ${cap.capacidadOciosaSlots} slots libres`, {
      fuente: 'F1',
      tamano: 7.8,
    })
  );
  p1.push(
    pdfTexto(
      50,
      557,
      `Profesionales con agenda activa: ${cap.profesionalesConAgendaActiva} | Perdidos: ${cap.turnosPerdidosPorInasistenciaOCancelacion}`,
      { fuente: 'F2', tamano: 7.5, color: [0.3, 0.36, 0.45] }
    )
  );

  p1.push(
    pdfRect(303, 548, 252, 90, {
      fill: [0.98, 0.99, 1.0],
      stroke: [0.84, 0.88, 0.94],
      lineWidth: 0.7,
    })
  );
  p1.push(
    pdfTexto(313, 624, 'FIDELIZACION DE PACIENTES Y ACCESIBILIDAD', {
      fuente: 'F2',
      tamano: 7.8,
      color: [0.12, 0.31, 0.88],
    })
  );

  p1.push(pdfRect(313, 612, 232, 7, { fill: [0.85, 0.92, 0.99] }));
  const anchoNuevos = Math.max(
    0,
    Math.min(232, (pac.pacientesNuevos.porcentaje / 100) * 232)
  );
  if (anchoNuevos > 0) {
    p1.push(pdfRect(313, 612, redondear(anchoNuevos, 1), 7, { fill: [0.06, 0.65, 0.42] }));
  }

  p1.push(
    pdfTexto(
      313,
      596,
      `Pacientes unicos: ${pac.pacientesUnicosAtendidosOAgendados} (Nuevos: ${pac.pacientesNuevos.porcentaje}% | Recurr: ${pac.pacientesRecurrentes.porcentaje}%)`,
      { fuente: 'F1', tamano: 7.6 }
    )
  );
  p1.push(
    pdfTexto(
      313,
      583,
      `Anticipacion de reserva (Lead Time): ${
        panel.tiemposAccesibilidad.leadTimePromedioDias !== null
          ? `${panel.tiemposAccesibilidad.leadTimePromedioDias} dias (${panel.tiemposAccesibilidad.leadTimePromedioHoras} hs)`
          : 'Sin datos'
      }`,
      { fuente: 'F1', tamano: 7.6 }
    )
  );
  p1.push(
    pdfTexto(
      313,
      570,
      `Antelacion prom. cancelacion: ${
        canc.antelacionPromedioHoras !== null
          ? `${canc.antelacionPromedioHoras} hs (${canc.antelacionPromedioDias} dias)`
          : 'Sin registros'
      }`,
      { fuente: 'F1', tamano: 7.6 }
    )
  );
  p1.push(
    pdfTexto(
      313,
      557,
      `Origen cancelacion: Paciente ${canc.origenCancelacion.paciente.porcentaje}% | Centro ${canc.origenCancelacion.administracionCentro.porcentaje}%`,
      { fuente: 'F2', tamano: 7.5, color: [0.3, 0.36, 0.45] }
    )
  );

  p1.push(pdfRect(40, 524, 4, 12, { fill: [0.12, 0.31, 0.88] }));
  p1.push(
    pdfTexto(49, 526, '3. DISTRIBUCION DE DEMANDA Y DESEMPENO POR ESPECIALIDAD', {
      fuente: 'F2',
      tamano: 9.5,
      color: [0.06, 0.16, 0.42],
    })
  );

  const yHeaderEsp = 498;
  p1.push(pdfRect(40, yHeaderEsp, 515, 18, { fill: [0.09, 0.22, 0.55] }));
  p1.push(pdfTexto(46, yHeaderEsp + 6, 'ESPECIALIDAD MEDICA', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));
  p1.push(pdfTexto(195, yHeaderEsp + 6, 'TURNOS', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));
  p1.push(pdfTexto(240, yHeaderEsp + 6, '% TOTAL', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));
  p1.push(pdfTexto(286, yHeaderEsp + 6, 'PARTICIPACION', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));
  p1.push(pdfTexto(368, yHeaderEsp + 6, 'ATEND.', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));
  p1.push(pdfTexto(412, yHeaderEsp + 6, 'CANC.', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));
  p1.push(pdfTexto(454, yHeaderEsp + 6, 'AUS.', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));
  p1.push(pdfTexto(495, yHeaderEsp + 6, '% EFECT.', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));

  const especialidadesMostrar = panel.graficos.distribucionPorEspecialidad.slice(0, 8);
  let yFilaEsp = yHeaderEsp - 18;

  if (especialidadesMostrar.length === 0) {
    p1.push(
      pdfRect(40, yFilaEsp, 515, 20, {
        fill: [0.98, 0.99, 1.0],
        stroke: [0.86, 0.89, 0.94],
        lineWidth: 0.5,
      })
    );
    p1.push(
      pdfTexto(48, yFilaEsp + 6, 'No se registran turnos por especialidad en el periodo filtrado.', {
        fuente: 'F1',
        tamano: 8,
        color: [0.45, 0.5, 0.58],
      })
    );
    yFilaEsp -= 20;
  } else {
    especialidadesMostrar.forEach((esp, idx) => {
      const bg: [number, number, number] = idx % 2 === 0 ? [1, 1, 1] : [0.965, 0.978, 0.996];
      p1.push(
        pdfRect(40, yFilaEsp, 515, 18, {
          fill: bg,
          stroke: [0.89, 0.92, 0.96],
          lineWidth: 0.4,
        })
      );
      const tasaEfec =
        esp.totalTurnos > 0 ? redondear((esp.realizados / esp.totalTurnos) * 100, 1) : 0;

      p1.push(
        pdfTexto(46, yFilaEsp + 5.5, truncarTextoPdf(esp.especialidad, 28), {
          fuente: 'F2',
          tamano: 7.6,
          color: [0.12, 0.18, 0.28],
        })
      );
      p1.push(pdfTexto(203, yFilaEsp + 5.5, String(esp.totalTurnos), { fuente: 'F2', tamano: 7.6 }));
      p1.push(pdfTexto(242, yFilaEsp + 5.5, `${esp.porcentajeSobreTotal}%`, { fuente: 'F1', tamano: 7.5 }));

      p1.push(pdfRect(286, yFilaEsp + 5.5, 68, 6, { fill: [0.88, 0.92, 0.97] }));
      const wBar = Math.max(2, Math.min(68, (esp.porcentajeSobreTotal / 100) * 68));
      p1.push(pdfRect(286, yFilaEsp + 5.5, redondear(wBar, 1), 6, { fill: [0.18, 0.42, 0.92] }));

      p1.push(
        pdfTexto(375, yFilaEsp + 5.5, String(esp.realizados), {
          fuente: 'F1',
          tamano: 7.5,
          color: [0.05, 0.5, 0.32],
        })
      );
      p1.push(
        pdfTexto(418, yFilaEsp + 5.5, String(esp.cancelados), {
          fuente: 'F1',
          tamano: 7.5,
          color: [0.72, 0.4, 0.05],
        })
      );
      p1.push(
        pdfTexto(458, yFilaEsp + 5.5, String(esp.ausentes), {
          fuente: 'F1',
          tamano: 7.5,
          color: [0.75, 0.15, 0.15],
        })
      );
      p1.push(
        pdfTexto(500, yFilaEsp + 5.5, `${tasaEfec}%`, {
          fuente: 'F2',
          tamano: 7.6,
          color: tasaEfec >= 70 ? [0.05, 0.5, 0.32] : [0.2, 0.25, 0.35],
        })
      );

      yFilaEsp -= 18;
    });
  }

  const ySecDia = 322;
  p1.push(pdfRect(40, ySecDia, 4, 12, { fill: [0.12, 0.31, 0.88] }));
  p1.push(
    pdfTexto(49, ySecDia + 2, '4. EVOLUCION SEMANAL DE TURNOS (DISTRIBUCION POR ESTADO)', {
      fuente: 'F2',
      tamano: 9.5,
      color: [0.06, 0.16, 0.42],
    })
  );

  p1.push(pdfRect(348, ySecDia + 3, 7, 7, { fill: [0.06, 0.65, 0.42] }));
  p1.push(pdfTexto(358, ySecDia + 3, 'Atendidos', { fuente: 'F1', tamano: 6.8 }));
  p1.push(pdfRect(402, ySecDia + 3, 7, 7, { fill: [0.92, 0.55, 0.05] }));
  p1.push(pdfTexto(412, ySecDia + 3, 'Cancelados', { fuente: 'F1', tamano: 6.8 }));
  p1.push(pdfRect(460, ySecDia + 3, 7, 7, { fill: [0.88, 0.22, 0.22] }));
  p1.push(pdfTexto(470, ySecDia + 3, 'Ausentes', { fuente: 'F1', tamano: 6.8 }));
  p1.push(pdfRect(510, ySecDia + 3, 7, 7, { fill: [0.23, 0.51, 0.96] }));
  p1.push(pdfTexto(520, ySecDia + 3, 'Pend.', { fuente: 'F1', tamano: 6.8 }));

  const yHeaderDia = 296;
  p1.push(pdfRect(40, yHeaderDia, 515, 18, { fill: [0.09, 0.22, 0.55] }));
  p1.push(pdfTexto(46, yHeaderDia + 6, 'DIA SEMANA', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));
  p1.push(pdfTexto(120, yHeaderDia + 6, 'TOTAL', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));
  p1.push(pdfTexto(162, yHeaderDia + 6, 'ATEND.', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));
  p1.push(pdfTexto(205, yHeaderDia + 6, 'CANC.', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));
  p1.push(pdfTexto(248, yHeaderDia + 6, 'AUS.', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));
  p1.push(pdfTexto(288, yHeaderDia + 6, 'PEND/REP', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));
  p1.push(pdfTexto(345, yHeaderDia + 6, 'COMPOSICION VISUAL DEL DIA', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));

  const maxDiaTotal = Math.max(1, ...panel.graficos.evolucionPorDiaSemana.map((d) => d.total));
  let yFilaDia = yHeaderDia - 17;

  panel.graficos.evolucionPorDiaSemana.forEach((d, idx) => {
    const bg: [number, number, number] = idx % 2 === 0 ? [1, 1, 1] : [0.965, 0.978, 0.996];
    p1.push(
      pdfRect(40, yFilaDia, 515, 17, {
        fill: bg,
        stroke: [0.89, 0.92, 0.96],
        lineWidth: 0.4,
      })
    );
    p1.push(pdfTexto(46, yFilaDia + 5, d.nombreDia, { fuente: 'F2', tamano: 7.5 }));
    p1.push(pdfTexto(125, yFilaDia + 5, String(d.total), { fuente: 'F2', tamano: 7.5 }));
    p1.push(
      pdfTexto(168, yFilaDia + 5, String(d.realizados), {
        fuente: 'F1',
        tamano: 7.5,
        color: [0.05, 0.5, 0.32],
      })
    );
    p1.push(
      pdfTexto(210, yFilaDia + 5, String(d.cancelados), {
        fuente: 'F1',
        tamano: 7.5,
        color: [0.72, 0.4, 0.05],
      })
    );
    p1.push(
      pdfTexto(252, yFilaDia + 5, String(d.ausentes), {
        fuente: 'F1',
        tamano: 7.5,
        color: [0.75, 0.15, 0.15],
      })
    );
    p1.push(
      pdfTexto(296, yFilaDia + 5, String(d.pendientes + d.reprogramados), {
        fuente: 'F1',
        tamano: 7.5,
        color: [0.2, 0.4, 0.8],
      })
    );

    p1.push(pdfRect(345, yFilaDia + 5, 195, 6.5, { fill: [0.91, 0.94, 0.98] }));
    if (d.total > 0) {
      const escala = 195 / maxDiaTotal;
      let cursorX = 345;
      const wReal = redondear(d.realizados * escala, 1);
      const wCanc = redondear(d.cancelados * escala, 1);
      const wAus = redondear(d.ausentes * escala, 1);
      const wOtros = redondear((d.pendientes + d.reprogramados) * escala, 1);

      if (wReal > 0) {
        p1.push(pdfRect(cursorX, yFilaDia + 5, wReal, 6.5, { fill: [0.06, 0.65, 0.42] }));
        cursorX += wReal;
      }
      if (wCanc > 0) {
        p1.push(pdfRect(cursorX, yFilaDia + 5, wCanc, 6.5, { fill: [0.92, 0.55, 0.05] }));
        cursorX += wCanc;
      }
      if (wAus > 0) {
        p1.push(pdfRect(cursorX, yFilaDia + 5, wAus, 6.5, { fill: [0.88, 0.22, 0.22] }));
        cursorX += wAus;
      }
      if (wOtros > 0) {
        p1.push(pdfRect(cursorX, yFilaDia + 5, wOtros, 6.5, { fill: [0.23, 0.51, 0.96] }));
      }
    }

    yFilaDia -= 17;
  });

  p1.push(pdfLinea(40, 56, 555, 56, [0.8, 0.85, 0.92], 0.7));
  p1.push(
    pdfTexto(
      40,
      43,
      'Sanatorio Antonia - Sistema de Gestion e Inteligencia Clinica - Documento Oficial de Uso Institucional',
      { fuente: 'F1', tamano: 7.2, color: [0.45, 0.5, 0.58] }
    )
  );
  p1.push(
    pdfTexto(495, 43, 'PAGINA 1 DE 2', {
      fuente: 'F2',
      tamano: 7.5,
      color: [0.12, 0.31, 0.88],
    })
  );

  const p2: string[] = [];

  p2.push(pdfRect(0, 834, 595, 8, { fill: [0.06, 0.16, 0.42] }));
  p2.push(
    pdfTexto(40, 798, 'SANATORIO ANTONIA - ANEXO DE RENDIMIENTO Y COBERTURAS', {
      fuente: 'F2',
      tamano: 12.5,
      color: [0.06, 0.16, 0.42],
    })
  );
  p2.push(
    pdfTexto(40, 785, `Periodo evaluado: ${panel.periodo.etiqueta} | Emision: ${fechaEmision} hs`, {
      fuente: 'F1',
      tamano: 8,
      color: [0.35, 0.42, 0.52],
    })
  );
  p2.push(pdfLinea(40, 774, 555, 774, [0.12, 0.31, 0.88], 1.0));

  p2.push(pdfRect(40, 750, 4, 12, { fill: [0.12, 0.31, 0.88] }));
  p2.push(
    pdfTexto(49, 752, '5. RENDIMIENTO OPERATIVO POR PROFESIONAL MEDICO', {
      fuente: 'F2',
      tamano: 9.5,
      color: [0.06, 0.16, 0.42],
    })
  );

  const yHeaderProf = 724;
  p2.push(pdfRect(40, yHeaderProf, 515, 18, { fill: [0.09, 0.22, 0.55] }));
  p2.push(pdfTexto(46, yHeaderProf + 6, 'PROFESIONAL', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));
  p2.push(pdfTexto(175, yHeaderProf + 6, 'MATRICULA', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));
  p2.push(pdfTexto(232, yHeaderProf + 6, 'ESPECIALIDAD', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));
  p2.push(pdfTexto(345, yHeaderProf + 6, 'TURNOS', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));
  p2.push(pdfTexto(386, yHeaderProf + 6, 'ATEND.', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));
  p2.push(pdfTexto(424, yHeaderProf + 6, 'CANC.', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));
  p2.push(pdfTexto(458, yHeaderProf + 6, 'AUS.', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));
  p2.push(pdfTexto(492, yHeaderProf + 6, '% EFECT.', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));

  const profsMostrar = panel.rendimientoPorProfesional.slice(0, 10);
  let yFilaProf = yHeaderProf - 18;

  if (profsMostrar.length === 0) {
    p2.push(
      pdfRect(40, yFilaProf, 515, 20, {
        fill: [0.98, 0.99, 1.0],
        stroke: [0.86, 0.89, 0.94],
        lineWidth: 0.5,
      })
    );
    p2.push(
      pdfTexto(48, yFilaProf + 6, 'Sin actividad de profesionales registrada para este periodo.', {
        fuente: 'F1',
        tamano: 8,
        color: [0.45, 0.5, 0.58],
      })
    );
    yFilaProf -= 20;
  } else {
    profsMostrar.forEach((prof, idx) => {
      const bg: [number, number, number] = idx % 2 === 0 ? [1, 1, 1] : [0.965, 0.978, 0.996];
      p2.push(
        pdfRect(40, yFilaProf, 515, 18, {
          fill: bg,
          stroke: [0.89, 0.92, 0.96],
          lineWidth: 0.4,
        })
      );
      p2.push(
        pdfTexto(46, yFilaProf + 5.5, truncarTextoPdf(prof.nombreCompleto, 24), {
          fuente: 'F2',
          tamano: 7.4,
        })
      );
      p2.push(
        pdfTexto(175, yFilaProf + 5.5, truncarTextoPdf(prof.matricula, 10), {
          fuente: 'F1',
          tamano: 7.3,
        })
      );
      p2.push(
        pdfTexto(232, yFilaProf + 5.5, truncarTextoPdf(prof.especialidades.join(', '), 20), {
          fuente: 'F1',
          tamano: 7.3,
        })
      );
      p2.push(pdfTexto(354, yFilaProf + 5.5, String(prof.totalTurnos), { fuente: 'F2', tamano: 7.5 }));
      p2.push(
        pdfTexto(392, yFilaProf + 5.5, String(prof.realizados), {
          fuente: 'F1',
          tamano: 7.4,
          color: [0.05, 0.5, 0.32],
        })
      );
      p2.push(
        pdfTexto(430, yFilaProf + 5.5, String(prof.cancelados), {
          fuente: 'F1',
          tamano: 7.4,
          color: [0.72, 0.4, 0.05],
        })
      );
      p2.push(
        pdfTexto(462, yFilaProf + 5.5, String(prof.ausentes), {
          fuente: 'F1',
          tamano: 7.4,
          color: [0.75, 0.15, 0.15],
        })
      );
      p2.push(
        pdfTexto(495, yFilaProf + 5.5, `${prof.tasaEfectividadPct}%`, {
          fuente: 'F2',
          tamano: 7.5,
          color: prof.tasaEfectividadPct >= 70 ? [0.05, 0.5, 0.32] : [0.2, 0.25, 0.35],
        })
      );
      yFilaProf -= 18;
    });
  }

  const ySecFranja = 505;
  p2.push(pdfRect(40, ySecFranja, 4, 12, { fill: [0.12, 0.31, 0.88] }));
  p2.push(
    pdfTexto(49, ySecFranja + 2, '6. COMPORTAMIENTO Y AUSENTISMO POR FRANJA HORARIA', {
      fuente: 'F2',
      tamano: 9.5,
      color: [0.06, 0.16, 0.42],
    })
  );

  aus.porFranjaHoraria.forEach((f, idx) => {
    const x = 40 + idx * 175;
    const y = 432;
    const w = 165;
    const h = 62;
    p2.push(
      pdfRect(x, y, w, h, {
        fill: [0.98, 0.99, 1.0],
        stroke: [0.84, 0.88, 0.94],
        lineWidth: 0.7,
      })
    );
    p2.push(
      pdfTexto(x + 10, y + 46, f.franja, {
        fuente: 'F2',
        tamano: 7.8,
        color: [0.09, 0.22, 0.55],
      })
    );
    p2.push(
      pdfTexto(x + 10, y + 31, `Total turnos: ${f.totalTurnos}`, {
        fuente: 'F2',
        tamano: 8.5,
      })
    );
    p2.push(
      pdfTexto(x + 10, y + 19, `Ausentes: ${f.ausentes} (${f.porcentajeAusentismo}%)`, {
        fuente: 'F1',
        tamano: 7.5,
        color: f.porcentajeAusentismo >= 15 ? [0.75, 0.15, 0.15] : [0.3, 0.35, 0.45],
      })
    );
    p2.push(pdfRect(x + 10, y + 8, 145, 5, { fill: [0.89, 0.92, 0.96] }));
    const wAusBar = Math.max(0, Math.min(145, (f.porcentajeAusentismo / 100) * 145));
    if (wAusBar > 0) {
      p2.push(pdfRect(x + 10, y + 8, redondear(wAusBar, 1), 5, { fill: [0.88, 0.22, 0.22] }));
    }
  });

  const ySecCob = 398;
  p2.push(pdfRect(40, ySecCob, 4, 12, { fill: [0.12, 0.31, 0.88] }));
  p2.push(
    pdfTexto(49, ySecCob + 2, '7. DISTRIBUCION POR COBERTURA Y REINCIDENCIA DE INASISTENCIAS', {
      fuente: 'F2',
      tamano: 9.5,
      color: [0.06, 0.16, 0.42],
    })
  );

  const yHeadCob = 372;
  p2.push(pdfRect(40, yHeadCob, 250, 18, { fill: [0.09, 0.22, 0.55] }));
  p2.push(pdfTexto(46, yHeadCob + 6, 'OBRA SOCIAL / COBERTURA', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));
  p2.push(pdfTexto(185, yHeadCob + 6, 'TURNOS', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));
  p2.push(pdfTexto(235, yHeadCob + 6, '% PART.', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));

  let yFilaCob = yHeadCob - 17;
  const coberturasMostrar = pac.distribucionPorCobertura.slice(0, 8);
  if (coberturasMostrar.length === 0) {
    p2.push(
      pdfRect(40, yFilaCob, 250, 18, {
        fill: [0.98, 0.99, 1.0],
        stroke: [0.86, 0.89, 0.94],
      })
    );
    p2.push(pdfTexto(46, yFilaCob + 5, 'Sin datos de cobertura.', { fuente: 'F1', tamano: 7.5 }));
  } else {
    coberturasMostrar.forEach((c, idx) => {
      const bg: [number, number, number] = idx % 2 === 0 ? [1, 1, 1] : [0.965, 0.978, 0.996];
      p2.push(
        pdfRect(40, yFilaCob, 250, 17, {
          fill: bg,
          stroke: [0.89, 0.92, 0.96],
          lineWidth: 0.4,
        })
      );
      p2.push(pdfTexto(46, yFilaCob + 5, truncarTextoPdf(c.cobertura, 24), { fuente: 'F2', tamano: 7.4 }));
      p2.push(pdfTexto(195, yFilaCob + 5, String(c.cantidadTurnos), { fuente: 'F1', tamano: 7.4 }));
      p2.push(pdfTexto(240, yFilaCob + 5, `${c.porcentaje}%`, { fuente: 'F2', tamano: 7.4 }));
      yFilaCob -= 17;
    });
  }

  p2.push(pdfRect(305, yHeadCob, 250, 18, { fill: [0.09, 0.22, 0.55] }));
  p2.push(pdfTexto(311, yHeadCob + 6, 'PACIENTE REINCIDENTE (>=2 AUS.)', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));
  p2.push(pdfTexto(455, yHeadCob + 6, 'DNI', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));
  p2.push(pdfTexto(512, yHeadCob + 6, 'AUS.', { fuente: 'F2', tamano: 7.2, color: [1, 1, 1] }));

  let yFilaReinc = yHeadCob - 17;
  const reincidentesMostrar = aus.pacientesRecurrentesAusentismo.pacientes.slice(0, 8);
  if (reincidentesMostrar.length === 0) {
    p2.push(
      pdfRect(305, yFilaReinc, 250, 18, {
        fill: [0.98, 0.99, 1.0],
        stroke: [0.86, 0.89, 0.94],
      })
    );
    p2.push(
      pdfTexto(311, yFilaReinc + 5, 'Sin pacientes con ausentismo recurrente.', {
        fuente: 'F1',
        tamano: 7.5,
        color: [0.05, 0.5, 0.32],
      })
    );
  } else {
    reincidentesMostrar.forEach((r, idx) => {
      const bg: [number, number, number] = idx % 2 === 0 ? [1, 1, 1] : [0.965, 0.978, 0.996];
      p2.push(
        pdfRect(305, yFilaReinc, 250, 17, {
          fill: bg,
          stroke: [0.89, 0.92, 0.96],
          lineWidth: 0.4,
        })
      );
      p2.push(
        pdfTexto(311, yFilaReinc + 5, truncarTextoPdf(r.nombreCompleto, 24), {
          fuente: 'F1',
          tamano: 7.4,
        })
      );
      p2.push(pdfTexto(450, yFilaReinc + 5, truncarTextoPdf(r.dni, 11), { fuente: 'F1', tamano: 7.3 }));
      p2.push(
        pdfTexto(520, yFilaReinc + 5, String(r.cantidadAusencias), {
          fuente: 'F2',
          tamano: 7.5,
          color: [0.75, 0.15, 0.15],
        })
      );
      yFilaReinc -= 17;
    });
  }

  p2.push(pdfLinea(40, 115, 555, 115, [0.8, 0.85, 0.92], 0.7));
  p2.push(
    pdfTexto(40, 98, 'CERTIFICACION DE TRAZABILIDAD Y AUDITORIA ESTADISTICA', {
      fuente: 'F2',
      tamano: 8.5,
      color: [0.12, 0.31, 0.88],
    })
  );
  p2.push(
    pdfTexto(
      40,
      84,
      'Reporte generado automaticamente a partir de los registros transaccionales y de auditoria del Sanatorio Antonia.',
      { fuente: 'F1', tamano: 7.5, color: [0.35, 0.4, 0.48] }
    )
  );
  p2.push(
    pdfTexto(
      40,
      72,
      `Fecha de impresion: ${fechaEmision} hs - Todos los indicadores cumplen con el protocolo de gestion clinica.`,
      { fuente: 'F1', tamano: 7.5, color: [0.35, 0.4, 0.48] }
    )
  );

  p2.push(
    pdfRect(370, 64, 185, 44, {
      fill: [0.95, 0.97, 1.0],
      stroke: [0.12, 0.31, 0.88],
      lineWidth: 0.8,
    })
  );
  p2.push(
    pdfTexto(380, 94, 'VALIDACION ELECTRONICA', {
      fuente: 'F2',
      tamano: 8,
      color: [0.12, 0.31, 0.88],
    })
  );
  p2.push(
    pdfTexto(380, 82, 'Direccion Medica y Gestion Operativa', {
      fuente: 'F1',
      tamano: 7.3,
      color: [0.25, 0.3, 0.38],
    })
  );
  p2.push(
    pdfTexto(380, 71, 'Sanatorio Antonia - Sello Institucional', {
      fuente: 'F1',
      tamano: 7.1,
      color: [0.4, 0.45, 0.54],
    })
  );

  p2.push(pdfLinea(40, 56, 555, 56, [0.8, 0.85, 0.92], 0.7));
  p2.push(
    pdfTexto(
      40,
      43,
      'Sanatorio Antonia - Sistema de Gestion e Inteligencia Clinica - Documento Oficial de Uso Institucional',
      { fuente: 'F1', tamano: 7.2, color: [0.45, 0.5, 0.58] }
    )
  );
  p2.push(
    pdfTexto(495, 43, 'PAGINA 2 DE 2', {
      fuente: 'F2',
      tamano: 7.5,
      color: [0.12, 0.31, 0.88],
    })
  );

  const streamP1 = p1.join('\n');
  const streamP2 = p2.join('\n');

  const objetos: string[] = [];
  objetos.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  objetos.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>\nendobj');
  objetos.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 7 0 R >>\nendobj'
  );
  objetos.push(
    '4 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 8 0 R >>\nendobj'
  );
  objetos.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');
  objetos.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj');
  objetos.push(
    `7 0 obj\n<< /Length ${Buffer.byteLength(streamP1, 'utf-8')} >>\nstream\n${streamP1}\nendstream\nendobj`
  );
  objetos.push(
    `8 0 obj\n<< /Length ${Buffer.byteLength(streamP2, 'utf-8')} >>\nstream\n${streamP2}\nendstream\nendobj`
  );

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objetos) {
    offsets.push(Buffer.byteLength(pdf, 'utf-8'));
    pdf += `${obj}\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf-8');
  pdf += `xref\n0 ${objetos.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objetos.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf-8');
}
