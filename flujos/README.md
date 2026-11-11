# Catálogo Oficial de Flujos del Sistema — Sanatorio Antonia

Este documento constituye el índice técnico y catálogo consolidado de todos los **Flujos del Sistema**, organizados con sus nombres definitivos, Historias de Usuario asociadas, descripciones funcionales, código Mermaid en formato Diagrama de Secuencia Técnico y sus correspondientes imágenes renderizadas en alta resolución.

---

## 1. Índice de Flujos Implementados (Oficiales)

| Flujo | Nombre Oficial del Flujo | Historias de Usuario (HUs) | Imagen Asociada |
|:---:|---|:---:|---|
| **Flujo 1** | Registro de Paciente, Validación OTP de Celular y Completitud de Perfil | **HU1 y HU2** | [`Flujo1_Registro_Paciente_OTP_Perfil_HU1_HU2.jpg`](./imagenes/Flujo1_Registro_Paciente_OTP_Perfil_HU1_HU2.jpg) |
| **Flujo 2** | Registro de Menor de Edad, Aprobación Administrativa y Reenvío de Documentación | **HU1 y HU13** | [`Flujo2_Registro_Menor_Aprobacion_Reenvio_Doc_HU1_HU13.jpg`](./imagenes/Flujo2_Registro_Menor_Aprobacion_Reenvio_Doc_HU1_HU13.jpg) |
| **Flujo 3** | Configuración de Agenda Médica, Reserva de Turno y Simulación de Cobertura | **HU19, HU3 y HU20** | [`Flujo3_Configuracion_Agenda_Reserva_Simulacion_Cobertura_HU19_HU3_HU20.jpg`](./imagenes/Flujo3_Configuracion_Agenda_Reserva_Simulacion_Cobertura_HU19_HU3_HU20.jpg) |
| **Flujo 4** | Recepción en Consultorio, Validación de Elegibilidad y Atención Médica | **HU12, HU20, HU16, HU8 y HU7** | [`Flujo4_Recepcion_Elegibilidad_Atencion_Medica_HU12_HU20_HU16_HU8_HU7.jpg`](./imagenes/Flujo4_Recepcion_Elegibilidad_Atencion_Medica_HU12_HU20_HU16_HU8_HU7.jpg) |
| **Flujo 5** | Ciclo de Estudios Médicos, Visor DICOM PACS e Informe PDF Oficial | **HU21 y HU8 E4** | [`Flujo5_Ciclo_Estudios_Visor_PACS_Informe_PDF_HU21_HU8_E4.jpg`](./imagenes/Flujo5_Ciclo_Estudios_Visor_PACS_Informe_PDF_HU21_HU8_E4.jpg) |
| **Flujo 6** | Envío Automático de Recordatorios de Turnos 24 Horas Antes | **HU23** | [`Flujo6_Envio_Automatico_Recordatorios_24h_HU23.jpg`](./imagenes/Flujo6_Envio_Automatico_Recordatorios_24h_HU23.jpg) |
| **Flujo 7** | Panel Gerencial de Métricas, Gráficos Estadísticos y Exportación de Reportes | **HU18** | [`Flujo7_Panel_Metricas_Graficos_Exportacion_Reportes_HU18.jpg`](./imagenes/Flujo7_Panel_Metricas_Graficos_Exportacion_Reportes_HU18.jpg) |

---

## 2. Detalle y Diagramas de Secuencia por Flujo

### Flujo 1: Registro de Paciente, Validación OTP de Celular y Completitud de Perfil (HU1 y HU2)
- **HUs Implicadas:** 
  - `HU1`: Registro de Pacientes en la web (con validación de celular por OTP).
  - `HU2`: Inicio de Sesión y pantalla "Completar mis datos" (Email, Sexo, Cobertura optativa).
- **Descripción:** El paciente completa datos mínimos, valida su línea celular ingresando un código OTP de 6 dígitos (expira en 5 min) y se crea la cuenta. Al ingresar por primera vez, el sistema detecta datos pendientes y exige completar email, sexo y definir si posee obra social/plan o si se atiende de forma `PARTICULAR`.
- **Archivo de Imagen:** [`Flujo1_Registro_Paciente_OTP_Perfil_HU1_HU2.jpg`](./imagenes/Flujo1_Registro_Paciente_OTP_Perfil_HU1_HU2.jpg)

```mermaid
sequenceDiagram
  autonumber
  actor P as Paciente
  participant FE as Frontend (Registro / Login)
  participant BE as Backend (/auth, /pacientes)
  participant WA as Servicio OTP (WhatsApp/Email)
  participant DB as PostgreSQL (Prisma)

  P->>FE: Completa datos mínimos (Nombre, DNI, Celular, Fecha Nac., Clave)
  FE->>BE: POST /auth/request-phone-code
  BE->>DB: Guarda CodigoVerificacion (6 dígitos, expira en 5 min)
  BE->>WA: Envía código OTP al celular
  P->>FE: Ingresa código OTP en el modal interactivo
  FE->>BE: POST /auth/verify-phone-code + POST /pacientes/registro
  BE->>DB: Crea Usuario + Paciente (perfilCompleto = false) y Audita
  BE-->>FE: 201 Created ("Registro completado con éxito")
  P->>FE: Inicia sesión con DNI y contraseña
  FE->>BE: POST /auth/login
  BE-->>FE: Autentica y detecta datos pendientes (email, sexo, cobertura)
  FE->>P: Despliega modal obligatorio "Completar mis datos"
  P->>FE: Ingresa Email, Sexo y elige Obra Social/Plan o modalidad "Particular"
  FE->>BE: PUT /pacientes/perfil
  BE->>DB: Actualiza perfil (perfilCompleto = true) y habilita reserva de turnos
```

---

### Flujo 2: Registro de Menor de Edad, Aprobación Administrativa y Reenvío de Documentación (HU1 y HU13)
- **HUs Implicadas:**
  - `HU1`: Registro de menor de edad con adulto responsable y carga de documentación.
  - `HU13`: Bandeja administrativa de aprobación/rechazo de menores y módulo "Menores a cargo" (`MisMenores.jsx`) con reenvío de documentación corregida.
- **Descripción:** Alta de menor de edad vinculando el DNI del tutor y adjuntando partida de nacimiento/libreta en Cloudinary. Si la administración observa el documento, el adulto ingresa a `/mis-menores`, ve la observación y reenvía una versión legible sin perder el historial.
- **Archivo de Imagen:** [`Flujo2_Registro_Menor_Aprobacion_Reenvio_Doc_HU1_HU13.jpg`](./imagenes/Flujo2_Registro_Menor_Aprobacion_Reenvio_Doc_HU1_HU13.jpg)

```mermaid
sequenceDiagram
  autonumber
  actor TUT as Adulto Responsable (Tutor)
  participant FE as Frontend React (Registro / MisMenores.jsx)
  participant BE as Backend API (/pacientes, /administrativos)
  participant CLD as Cloudinary
  participant DB as PostgreSQL (Prisma)
  actor ADM as Personal Administrativo

  TUT->>FE: Inicia registro de Menor (< 18 años)
  FE->>BE: POST /api/pacientes/registro (con DNI Adulto + Documento adjunto)
  BE->>DB: Verifica existencia y estado del Adulto Responsable
  alt DNI Adulto no registrado o inactivo
    BE-->>FE: 400 Bad Request ("El DNI del adulto no se encuentra registrado")
  else Adulto válido
    BE->>CLD: Sube Partida/Libreta vía HTTPS
    CLD-->>BE: URL segura de archivo
    BE->>DB: INSERT usuario, paciente (PENDIENTE_APROBACION) y documento_responsable
    BE-->>FE: 201 Created ("Registro pendiente de aprobación")
  end

  ADM->>FE: Revisa /menores-pendientes
  FE->>BE: GET /api/administrativos/menores-pendientes
  BE-->>FE: Lista con datos y enlace a Cloudinary

  alt Documentación observada / ilegible
    ADM->>FE: Presiona "Rechazar registro" con motivo
    FE->>BE: PATCH /api/administrativos/menores/:id/rechazar
    BE->>DB: UPDATE estado = RECHAZADO + Guarda motivo + Auditoría
    BE-->>TUT: Email informando motivo de rechazo
    TUT->>FE: Accede a /mis-menores, ve observación y adjunta nuevo documento
    FE->>BE: PATCH /api/pacientes/menores/:id/reenviar-documentacion
    BE->>CLD: Sube nuevo archivo conservando versión previa
    BE->>DB: UPDATE estado = PENDIENTE_APROBACION + INSERT documento_responsable
  else Documentación válida
    ADM->>FE: Presiona "Aprobar registro"
    FE->>BE: PATCH /api/administrativos/menores/:id/aprobar
    BE->>DB: UPDATE estado = ACTIVO + Auditoría
    BE-->>TUT: Email confirmando activación de la cuenta
  end
```

---

### Flujo 3: Configuración de Agenda Médica, Reserva de Turno y Simulación de Cobertura (HU19, HU3 y HU20)
- **HUs Implicadas:**
  - `HU19`: Configuración de la agenda del profesional (días, franjas y duración).
  - `HU3`: Solicitud de turnos web por el paciente (límite de 2 turnos activos y cálculo dinámico).
  - `HU20`: Simulador de cobertura médico-paciente y listado de requisitos de consulta.
- **Descripción:** El administrativo define la agenda del profesional. El paciente consulta disponibilidad en tiempo real, recibe la simulación de cobertura (si el médico no atiende su obra social, se advierte consulta Particular) y reserva su cupo con control de solapamiento.
- **Archivo de Imagen:** [`Flujo3_Configuracion_Agenda_Reserva_Simulacion_Cobertura_HU19_HU3_HU20.jpg`](./imagenes/Flujo3_Configuracion_Agenda_Reserva_Simulacion_Cobertura_HU19_HU3_HU20.jpg)

```mermaid
sequenceDiagram
  autonumber
  actor ADM as Administrativo (gestion_usuarios)
  actor PAC as Paciente Autenticado
  participant BE as Backend API
  participant DB as PostgreSQL

  ADM->>BE: PUT /profesionales/:id/agenda (Días, Hora Inicio/Fin, Duración)
  BE->>DB: Verifica no solapamiento de franjas ni turnos reservados afectados
  BE->>DB: Guarda AgendaProfesional y registra en Auditoría

  PAC->>BE: GET /profesionales/:id/disponibilidad?fecha=YYYY-MM-DD
  BE->>DB: Calcula bloques dinámicos según Agenda menos Turnos activos
  BE-->>PAC: Devuelve horarios libres y simulación de cobertura (HU20 E6.3)
  Note over PAC,BE: Si el médico no atiende por su Obra Social, informa atención Particular y lista requisitos (DNI, credencial, token, copago)
  PAC->>BE: POST /turnos (Confirma reserva de turno)
  BE->>DB: Valida: 1) Perfil completo, 2) Máximo 2 turnos activos con el profesional, 3) Cupo libre en transacción
  BE->>DB: Crea Turno en estado SOLICITADO y registra en Auditoría
  BE-->>PAC: 201 Created ("Tu turno fue registrado correctamente")
```

---

### Flujo 4: Recepción en Consultorio, Validación de Elegibilidad y Atención Médica (HU12, HU20, HU16, HU8 y HU7)
- **HUs Implicadas:**
  - `HU12`: Gestión de turnos y recepción en sala de espera.
  - `HU20`: Validación de elegibilidad de afiliados, credenciales y token digital de prepagas.
  - `HU16`: Agenda Diaria del profesional.
  - `HU8`: Historia Clínica del paciente (con vínculo clínico).
  - `HU7`: Registro de consulta y evolución médica.
- **Descripción:** En mesa de entradas se valida la elegibilidad de la cobertura y se registra la recepción (`EN_ESPERA`). El profesional ve al paciente en su agenda diaria, abre la historia clínica, revisa antecedentes y estudios, y registra la consulta pasando el turno a `COMPLETADO`.
- **Archivo de Imagen:** [`Flujo4_Recepcion_Elegibilidad_Atencion_Medica_HU12_HU20_HU16_HU8_HU7.jpg`](./imagenes/Flujo4_Recepcion_Elegibilidad_Atencion_Medica_HU12_HU20_HU16_HU8_HU7.jpg)

```mermaid
sequenceDiagram
  autonumber
  actor PAC as Paciente
  actor ADM as Recepción / Admin
  actor MED as Profesional de la Salud
  participant FE as Frontend React
  participant BE as Backend API
  participant DB as PostgreSQL (Prisma)

  rect rgb(235, 245, 255)
    Note over PAC,DB: Fase 1: Llegada, Validación de Elegibilidad y Recepción en Sala de Espera
    PAC->>ADM: Se presenta en recepción para su turno programado
    ADM->>FE: Busca el turno por DNI del paciente
    FE->>BE: POST /api/obras-sociales/validar-elegibilidad
    BE->>DB: Verifica convenio de Obra Social/Plan y vigencia de credencial
    alt Credencial vencida o sin convenio
      BE-->>FE: No elegible (Alerta: Debe regularizar o abonar consulta Particular)
    else Cobertura vigente
      BE-->>FE: Elegible OK (Informa monto de copago, autorización y exige Token si es Prepaga)
      ADM->>FE: Confirma recepción con N° de autorización / Token digital
      FE->>BE: PATCH /api/turnos/:id/recepcion
      BE->>DB: UPDATE turno SET presente = true, fecha_llegada = NOW(), estado = EN_ESPERA + Auditoría
      BE-->>FE: 200 OK (Turno en sala de espera)
    end
  end

  rect rgb(240, 253, 244)
    Note over MED,DB: Fase 2: Atención en Consultorio, Historia Clínica y Evolución
    MED->>FE: Visualiza paciente en sala de espera desde su Agenda Diaria (/agenda)
    MED->>FE: Hace clic en el paciente y selecciona "Ver Historia Clínica"
    FE->>BE: GET /api/pacientes/:idPaciente/historia-clinica
    BE->>DB: Valida vínculo clínico (turno activo) y recupera antecedentes, consultas y estudios PACS
    BE-->>FE: Ficha médica completa del paciente
    MED->>FE: Completa formulario de consulta (Motivo, Diagnóstico y Tratamiento)
    FE->>BE: POST /api/consultas
    BE->>DB: INSERT en consulta + UPDATE turno SET estado = COMPLETADO + Auditoría
    BE-->>FE: 201 Created ("Consulta registrada con éxito")
    FE-->>MED: Turno completado y retorno a la agenda diaria
  end
```

---

### Flujo 5: Ciclo de Estudios Médicos, Visor DICOM PACS e Informe PDF Oficial (HU21 y HU8 E4)
- **HUs Implicadas:**
  - `HU21`: Gobernanza de estudios médicos (carga restringida a especialistas diagnósticos/admin y modo solo lectura para pacientes).
  - `HU8 E4`: Pestaña de Estudios Médicos en la Historia Clínica del médico tratante.
- **Descripción:** El especialista autorizado registra el estudio vinculando el `StudyInstanceUID`. El paciente accede a `/mis-estudios` en modo solo lectura, visualizando las imágenes en el visor **OHIF Viewer v3** (vía Nginx gateway con `COOP/COEP`) y descargando el informe oficial generado dinámicamente con **PDFKit**.
- **Archivo de Imagen:** [`Flujo5_Ciclo_Estudios_Visor_PACS_Informe_PDF_HU21_HU8_E4.jpg`](./imagenes/Flujo5_Ciclo_Estudios_Visor_PACS_Informe_PDF_HU21_HU8_E4.jpg)

```mermaid
sequenceDiagram
  autonumber
  actor ESP as Especialista Habilitado / Admin
  actor PAC as Paciente (Solo Lectura)
  actor MED as Médico Tratante
  participant BE as Backend (/estudios)
  participant PACS as Orthanc PACS + OHIF Gateway (:3005)
  participant DB as PostgreSQL

  ESP->>BE: POST /estudios (DNI Paciente, Nombre, StudyInstanceUID, Observación)
  BE->>BE: Verifica rol (Especialidad Diagnóstica / puedeCargarEstudios / Admin)
  BE->>DB: Guarda EstudioMedico (ACTIVO) con firma/matrícula y Audita
  
  PAC->>BE: GET /estudios (Accede a /mis-estudios en modo Solo Lectura)
  BE-->>PAC: Lista estudios activos (Sin opciones de alta, edición ni borrado)
  
  par Visualización de Imágenes DICOM
    PAC->>PACS: Abre "Ver en Visor PACS" (OHIF Viewer v3 vía pacs-gateway)
    MED->>PACS: Abre "Ver en Visor PACS" desde Historia Clínica del Paciente
    PACS-->>PAC: Renderiza estudio DICOMweb (Zoom, contraste W/L, mediciones)
  and Descarga de Informe Oficial PDF
    PAC->>BE: GET /estudios/:idEstudio/pdf
    BE->>BE: Genera PDF en memoria (PDFKit) con membrete Sanatorio Antonia y firma médica
    BE-->>PAC: Stream application/pdf listo para descargar o imprimir
  end
```

---

### Flujo 6: Envío Automático de Recordatorios de Turnos 24 Horas Antes (HU23)
- **HUs Implicadas:**
  - `HU23`: Envío automático de recordatorios preventivos de turnos 24 hs previas a la cita.
- **Descripción:** Un scheduler periódico ejecuta `procesarRecordatoriosTurnos()`. Detecta turnos activos entre +24h y +25h sin aviso previo y despacha correos vía Nodemailer. Al confirmarse el envío, marca `recordatorioEnviado = true` con trazabilidad e idempotencia en PostgreSQL.
- **Archivo de Imagen:** [`Flujo6_Envio_Automatico_Recordatorios_24h_HU23.jpg`](./imagenes/Flujo6_Envio_Automatico_Recordatorios_24h_HU23.jpg)

```mermaid
sequenceDiagram
  autonumber
  actor SCH as Scheduler / Worker (Cron Job)
  participant BE as Backend API (/turnos/recordatorios/procesar)
  participant SVC as recordatorioService.ts
  participant DB as PostgreSQL (Prisma)
  participant SMTP as Servicio Correo / Nodemailer
  actor PAC as Paciente con Turno

  rect rgb(235, 245, 255)
    Note over SCH,DB: Fase 1: Identificación y Filtrado de Turnos en Ventana de 24 hs
    SCH->>BE: POST /api/turnos/recordatorios/procesar (Trigger periódico)
    BE->>SVC: procesarRecordatoriosTurnos()
    SVC->>DB: SELECT turnos entre +24h y +25h con estado SOLICITADO o CONFIRMADO y recordatorio_enviado = false
    DB-->>SVC: Lista de turnos candidatos

    alt Turno cancelado, reprogramado o agendado con menos de 24 hs de anticipación
      SVC->>SVC: Omite turno (evita recordatorio redundante o inválido)
    else Turno activo elegible para recordatorio
      Note over SVC,PAC: Fase 2: Envío de Aviso y Garantía de Idempotencia
      SVC->>SMTP: Enviar email con plantilla institucional (Médico, Especialidad, Fecha, Hora y Requisitos)
      alt Despacho exitoso (SMTP 250 OK)
        SMTP-->>PAC: Recibe correo preventivo de su cita médica
        SMTP-->>SVC: Confirmación de envío
        SVC->>DB: UPDATE turno SET recordatorio_enviado = true, fecha_recordatorio = NOW()
        SVC->>DB: INSERT auditoria (Registro inmutable del recordatorio enviado)
      else Error en el despacho (Falla de red o correo inválido)
        SMTP-->>SVC: Error de transporte / Fallo de entrega
        SVC->>DB: Registra incidencia en log sin alterar estado del turno
        SVC->>SVC: Programa reintento en siguiente ciclo (hasta 3 intentos)
      end
    end
    SVC-->>BE: Resumen consolidado (Total procesados, enviados, omitidos y fallidos)
    BE-->>SCH: 200 OK (Job de recordatorios completado)
  end
```

---

### Flujo 7: Panel Gerencial de Métricas, Gráficos Estadísticos y Exportación de Reportes (HU18)
- **HUs Implicadas:**
  - `HU18`: Panel gerencial de métricas, gráficos estadísticos y generación/exportación de reportes en PDF y Excel.
- **Descripción:** El administrativo con permiso `gestion_usuarios` accede a `/reportes`. El backend calcula KPIs operativos (volumen, % atención, ausentismo, tiempos de espera) y permite consolidar snapshots auditados o exportar archivos estructurados en **PDF** o **Excel (`.xlsx`)** generados en memoria.
- **Archivo de Imagen:** [`Flujo7_Panel_Metricas_Graficos_Exportacion_Reportes_HU18.jpg`](./imagenes/Flujo7_Panel_Metricas_Graficos_Exportacion_Reportes_HU18.jpg)

```mermaid
sequenceDiagram
  autonumber
  actor ADM as Administrativo (gestion_usuarios)
  participant FE as Frontend React (Dashboard / Reportes)
  participant BE as Backend API (/reportes, /metricas)
  participant DB as PostgreSQL (Prisma)
  participant EXP as Motor Exportador (PDFKit / ExcelJS)

  rect rgb(235, 245, 255)
    Note over ADM,DB: Fase 1: Control de Acceso RBAC y Carga de KPIs y Gráficos Estadísticos
    ADM->>FE: Accede a la sección "Métricas y Reportes" (/reportes)
    FE->>BE: GET /api/reportes/panel (con filtros opcionales: período, especialidad, profesional)
    BE->>BE: Verifica rol ADMINISTRATIVO y permiso gestion_usuarios (requierePermisoGestionUsuarios)
    alt Usuario sin permisos suficientes
      BE-->>FE: 403 Forbidden ("No tenés permisos para acceder a esta sección")
    else Usuario autorizado
      BE->>DB: Consulta agregada de Turnos, Consultas, Especialidades y Tiempos de Espera
      DB-->>BE: Datos brutos del período seleccionado
      BE->>BE: Calcula KPIs (Total agendados, % Atendidos, Tasa Ausentismo, Cancelados, Reprogramados)
      BE-->>FE: 200 OK (Renderiza Tarjetas de KPIs y Gráficos por Especialidad, Estado y Evolución)
    end
  end

  rect rgb(240, 253, 244)
    Note over ADM,EXP: Fase 2: Filtrado Dinámico, Consolidación con Auditoría y Exportación (PDF / Excel)
    opt Aplicación de Filtros Paramétricos (Período temporal, Especialidad o Médico)
      ADM->>FE: Selecciona rango de fechas, especialidad o profesional
      FE->>BE: GET /api/reportes/metricas?fechaInicio=...&idEspecialidad=...&idProfesional=...
      BE->>DB: Filtra registros y recalcula indicadores cuantitativos en tiempo real
      DB-->>BE: Resultados segmentados
      BE-->>FE: 200 OK (Actualiza KPIs y gráficos estadísticos)
    end

    par Consolidación y Guardado de Reporte en Historial
      ADM->>FE: Presiona "Generar Reporte" (ingresa título y notas)
      FE->>BE: POST /api/reportes/generar
      BE->>DB: Guarda snapshot del reporte en historial + INSERT en auditoria (autor, fecha e IP)
      DB-->>BE: Confirmación de registro
      BE-->>FE: 201 Created ("Reporte consolidado y guardado en el historial")
    and Exportación Estructurada en PDF o Excel (.xlsx)
      ADM->>FE: Presiona "Exportar en PDF" o "Exportar en Excel (.xlsx)"
      FE->>BE: GET /api/reportes/exportar?formato=pdf|excel (o /api/reportes/:id/exportar)
      BE->>EXP: Genera documento en memoria con formato institucional, tablas y resúmenes porcentuales
      EXP-->>BE: Buffer / Stream del archivo generado
      BE-->>ADM: Descarga directa de archivo .pdf o .xlsx
    end
  end
```

---

## 3. Flujos Pospuestos y Fuera de Alcance

1. **Flujo A: Gestión de Turnos por Chatbot de WhatsApp (`HU4`)** — Pospuesto para la fase de cierre; en su lugar se implementó la validación OTP vía celular.
2. **Flujo B: Registro de Pacientes vía Chatbot de WhatsApp (`HU5`)** — Pospuesto por requerimientos legales y documentales resueltos en el portal web.
3. **Flujo C: Edición y Baja Lógica de Usuarios Administrativos (`HU22`)** — Pospuesto; la gestión de administrativos se mantiene con alta y permisos `gestion_usuarios`.
4. **Flujo D: Prescripción Médica Digital con Firma Electrónica e Interoperabilidad con Farmacias** — Fuera de alcance inicial.
5. **Flujo E: Validación Federada con RENAPER / Mi Argentina** — Fuera de alcance inicial.
6. **Flujo F: Facturación Electrónica y Caja Diaria** — Fuera de alcance inicial.

---

## 4. Directorio de Imágenes y Diagramas de Arquitectura

Todos los diagramas técnicos están almacenados en la subcarpeta [`imagenes/`](./imagenes/):

- [`imagenes/Flujo1_Registro_Paciente_OTP_Perfil_HU1_HU2.jpg`](./imagenes/Flujo1_Registro_Paciente_OTP_Perfil_HU1_HU2.jpg)
- [`imagenes/Flujo2_Registro_Menor_Aprobacion_Reenvio_Doc_HU1_HU13.jpg`](./imagenes/Flujo2_Registro_Menor_Aprobacion_Reenvio_Doc_HU1_HU13.jpg)
- [`imagenes/Flujo3_Configuracion_Agenda_Reserva_Simulacion_Cobertura_HU19_HU3_HU20.jpg`](./imagenes/Flujo3_Configuracion_Agenda_Reserva_Simulacion_Cobertura_HU19_HU3_HU20.jpg)
- [`imagenes/Flujo4_Recepcion_Elegibilidad_Atencion_Medica_HU12_HU20_HU16_HU8_HU7.jpg`](./imagenes/Flujo4_Recepcion_Elegibilidad_Atencion_Medica_HU12_HU20_HU16_HU8_HU7.jpg)
- [`imagenes/Flujo5_Ciclo_Estudios_Visor_PACS_Informe_PDF_HU21_HU8_E4.jpg`](./imagenes/Flujo5_Ciclo_Estudios_Visor_PACS_Informe_PDF_HU21_HU8_E4.jpg)
- [`imagenes/Flujo6_Envio_Automatico_Recordatorios_24h_HU23.jpg`](./imagenes/Flujo6_Envio_Automatico_Recordatorios_24h_HU23.jpg)
- [`imagenes/Flujo7_Panel_Metricas_Graficos_Exportacion_Reportes_HU18.jpg`](./imagenes/Flujo7_Panel_Metricas_Graficos_Exportacion_Reportes_HU18.jpg)
- [`imagenes/arquitectura_tecnica_detallada_sanatorio_antonia.jpg`](./imagenes/arquitectura_tecnica_detallada_sanatorio_antonia.jpg)
- [`imagenes/arquitectura_ehr_ris_pacs_sprint3.jpg`](./imagenes/arquitectura_ehr_ris_pacs_sprint3.jpg)
