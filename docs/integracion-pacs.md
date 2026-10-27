# Integración PACS: Orthanc + OHIF Viewer (HU21)

Esta guía documenta la infraestructura y arquitectura para la gestión y visualización de estudios médicos e imágenes DICOM implementada para la **HU21** (y consulta en Historia Clínica según **HU8**).

---

## 1. Arquitectura y Principio de Diseño

Siguiendo el estándar de sistemas de salud modernos (EHR / RIS / PACS):
- **Base de datos relacional (PostgreSQL):** Almacena únicamente metadatos livianos (`id_estudio`, `id_paciente`, `nombre`, `codigo` / `StudyInstanceUID`, `observacion`, fechas y auditoría). **No guarda archivos pesados (PDFs ni binarios DICOM)**.
- **Servidor PACS (Orthanc):** Responsable del almacenamiento masivo de imágenes médicas, soporte para modalidades DICOM (ecógrafos, resonadores, tomógrafos por puerto `4242`) y exposición del estándar **DICOMweb** (QIDO-RS / WADO-RS / STOW-RS).
- **Visor Web Zero-Footprint (OHIF Viewer v3):** Visor en React/CornerstoneJS ejecutado en el navegador del profesional. Permite zoom, contraste W/L, mediciones y reconstrucción multiplanar sin instalar clientes pesados.
- **Reverse Proxy Gateway (Nginx):** Unifica OHIF y el endpoint `/dicom-web/` bajo el mismo origen (`http://localhost:3005`), previniendo errores de CORS, COOP/COEP y protegiendo Orthanc para permitir solo lectura (`GET`/`HEAD`/`OPTIONS`) desde la web.

```
                      +---------------------------------------+
                      |       Navegador del Profesional       |
                      |  (Historia Clínica / Visor Web OHIF)  |
                      +-------------------+-------------------+
                                          |
                        HTTP (GET) :3005  |
                                          v
                      +---------------------------------------+
                      |        pacs-gateway (Nginx)           |
                      |       (Mismo origen, Read-Only)       |
                      +---------+-------------------+---------+
                                |                   |
                      /         |                   | /dicom-web/
                                v                   v
                      +-------------------+  +-------------------+
                      |    ohif (v3)      |  |  orthanc (PACS)   |
                      |  (Visor React)    |  |  (DICOMweb :8042) |
                      +-------------------+  +---------+---------+
                                                       ^
                                                       | C-STORE :4242
                                             +---------+---------+
                                             | Modalidad Médica  |
                                             | (Tomógrafo / etc) |
                                             +-------------------+
```

---

## 2. Cómo levantar el entorno PACS

El archivo [`docker-compose.pacs.yml`](../docker-compose.pacs.yml) contiene los 3 servicios orquestados:
- `orthanc`: servidor PACS (`orthancteam/orthanc:24.10.3`).
- `ohif`: visor DICOM (`ohif/app:v3.9.2`).
- `pacs-gateway`: proxy unificador (`nginx:1.27-alpine`).

### Comando para iniciar:

```bash
docker compose -f docker-compose.pacs.yml up -d
```

### URLs disponibles en local:

| Servicio | URL Local | Descripción |
| :--- | :--- | :--- |
| **OHIF Viewer** | `http://localhost:3005` | Visor web para profesionales |
| **Orthanc Explorer 2** | `http://localhost:8042/ui/app/` | Panel administrativo de Orthanc (subir estudios DICOM manualmente para pruebas) |
| **Stone Web Viewer** | `http://localhost:8042/stone-webviewer/` | Visor web alternativo integrado en Orthanc |
| **DICOMweb endpoint** | `http://localhost:3005/dicom-web/` | API QIDO-RS / WADO-RS pública en solo lectura |
| **Puerto DICOM Nativo** | `localhost:4242` | AET: `SISMEDPACS` para conectar equipamiento médico o simuladores DCMTK |

---

## 3. Variables de Entorno del Backend

En el `.env` de `backend-sistemamedico`, configurar:

```env
# URL pública del visor OHIF (accesible desde el navegador del médico)
OHIF_VIEWER_URL=http://localhost:3005

# URL interna para comunicación server-to-server del backend con Orthanc
ORTHANC_INTERNAL_URL=http://localhost:8042

# (Opcional) Si Orthanc tiene autenticación habilitada:
# ORTHANC_USERNAME=orthanc
# ORTHANC_PASSWORD=orthanc
```

---

## 4. Endpoints del Backend implementados (HU21)

### Paciente autenticado (rol `PACIENTE`):
- `GET /api/estudios`: Listado de mis estudios activos con metadatos y links directos al visor.
- `GET /api/estudios/:idEstudio`: Detalle de un estudio.
- `POST /api/estudios`: Alta de estudio (`nombre`, `codigo`, `observacion`).
- `PUT /api/estudios/:idEstudio`: Edición de estudio propio.
- `DELETE /api/estudios/:idEstudio`: Baja lógica de estudio propio.

### Profesional autenticado con vínculo (rol `PROFESIONAL`):
- `GET /api/estudios/paciente/:idPaciente`: Visualización en solo lectura de los estudios del paciente.
- `GET /api/pacientes/:idPaciente/historia-clinica`: Historia Clínica integral (HU8) con datos personales, antecedentes, consultas cronológicas y estudios médicos vinculados.

### Integración y Diagnóstico PACS:
- `GET /api/estudios/pacs/estado`: Diagnóstico de salud y conectividad con el servidor Orthanc.
- `GET /api/estudios/:idEstudio/pacs`: Inspección de disponibilidad y conteo de series/imágenes DICOM reales en Orthanc.
