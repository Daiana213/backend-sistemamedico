/* global window */
// Configuración de OHIF Viewer v3 para el Sistema Médico (HU21).
// DICOMweb se resuelve sobre el mismo origen que el visor (gateway nginx -> Orthanc).
// Abrir un estudio: <OHIF_VIEWER_URL>/viewer?StudyInstanceUIDs=<StudyInstanceUID>

const dicomWebRoot = `${window.location.origin}/dicom-web`;

window.config = {
  routerBasename: '/',
  showStudyList: true,
  showWarningMessageForCrossOrigin: false,
  showCPUFallbackMessage: true,
  showLoadingIndicator: true,
  strictZSpacingForVolumeViewport: true,
  maxNumberOfWebWorkers: 3,
  extensions: [],
  modes: [],
  defaultDataSourceName: 'orthanc',
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'orthanc',
      configuration: {
        friendlyName: 'PACS Orthanc - Sistema Médico',
        name: 'orthanc',
        wadoUriRoot: dicomWebRoot,
        qidoRoot: dicomWebRoot,
        wadoRoot: dicomWebRoot,
        qidoSupportsIncludeField: false,
        supportsReject: false,
        imageRendering: 'wadors',
        thumbnailRendering: 'wadors',
        enableStudyLazyLoad: true,
        supportsFuzzyMatching: false,
        supportsWildcard: true,
        staticWado: false,
        singlepart: 'bulkdata,video',
        omitQuotationForMultipartRequest: true,
        bulkDataURI: {
          enabled: true,
          relativeResolution: 'studies',
        },
      },
    },
  ],
};
