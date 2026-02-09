# Sistema de Gestión de Voluntariados para Organizaciones sin Fines de Lucro

Este repositorio contiene el desarrollo académico de un **Sistema de Gestión de Voluntariados**, creado como proyecto de cátedra para la materia de **Arquitectura de Software** y en la carrera de **Ingeniería de Software y Negocios Digitales**.

La idea central del proyecto es sencilla pero interesante: **ofrecer una plataforma unica que pueda ser utilizada por multiples organizaciones sin fines de lucro**, manteniendo sus datos aislados y seguros, y facilitando la gestión de voluntarios, proyectos y horas sociales.

## Contexto del proyecto

Las organizaciones sin fines de lucro suelen enfrentar limitaciones tecnicas y presupuestarias para gestionar voluntariados de forma eficiente. Este sistema busca resolver ese problema mediante una **arquitectura multi-organización (multi-tenant)**, ejemplo Moodle, donde varias organizaciones comparten la misma plataforma tecnológica sin necesidad de desplegar sistemas separados.

El proyecto se esta desarrollando en **dos etapas**:

* **MVP (Producto Mínimo Viable)**: enfocado en validar el dominio del voluntariado y demostrar una arquitectura clara, funcional y mantenible.
* **Fase Final**: orientada a escalar la solución hacia un escenario más cercano a producción real a futuro.

## Objetivos

### Objetivo general

Diseñar e implementar un sistema web que permita a organizaciones sin fines de lucro gestionar voluntarios, proyectos y horas sociales de forma centralizada, segura y escalable.

### Objetivos específicos

* Validar el dominio del voluntariado mediante un MVP funcional.
* Aplicar buenas practicas de **arquitectura de software** y **decisiones arquitectónicas documentadas (ADR)**.
* Diseñar una solución alineada con principios de mantenibilidad, seguridad y rendimiento.
* Preparar la base tecnica para una futura evolucion hacia microservicios.

## Arquitectura del sistema

La arquitectura del sistema fue definida mediante Architecture Decision Records (ADR), los cuales documentan las decisiones clave tomadas durante el diseño.

- **ADR-001 – Arquitectura del MVP**: define una arquitectura monolítica modular basada en capas, priorizando simplicidad, claridad y rapidez de desarrollo.
- **ADR-002 – Arquitectura Final**: plantea la evolución hacia una arquitectura de microservicios orientada a escalabilidad, resiliencia y desarrollo en paralelo.

Los ADR completos se encuentran disponibles en el directorio `/docs/architecture`.

## Funcionalidades principales

### Roles del sistema

**Administrador / Líder de organización**

* Gestión de proyectos de voluntariado
* Registro y validación de horas sociales
* Administración de miembros y comités
* Publicación de anuncios
* Visualización de actividades mediante calendario

**Voluntarios / Miembros**

* Inscripción a proyectos
* Visualización de anuncios
* Envío de sugerencias y mensajes
* Consulta de actividades asignadas

El acceso a las funcionalidades se controla mediante un **sistema básico de roles y permisos**, suficiente para el alcance académico del proyecto.

## Requisitos no funcionales destacados

* **Seguridad**: aislamiento de datos por organización y control de acceso basado en roles.
* **Rendimiento**: tiempos de respuesta aceptables bajo carga moderada.
* **Mantenibilidad**: código modular, documentado y fácil de entender.
* **Confiabilidad**: funcionamiento estable con baja tasa de errores.

## Infraestructura y despliegue

* Contenedores Docker para backend, frontend y servicios auxiliares.
* Docker Compose para orquestación en entorno de desarrollo.
* Preparación para despliegue en plataformas cloud como Render o Fly.io.
* Comunicación segura mediante HTTPS (TLS/SSL).

## Seguridad

El sistema se alinea con buenas prácticas de seguridad modernas:

* Protección contra vulnerabilidades comunes (OWASP Top 10)
* Principios de Zero Trust
* Autenticación y autorización en cada petición
* Cifrado de comunicaciones en tránsito

## Equipo de trabajo

Proyecto desarrollado por:

* José Avilés
* Kevin Luna
* Eliezer Martínez
* Jhonnatan Peñate
* Sheyla Sarmiento

**Institución:** Escuela Superior de Economía y Negocios (ESEN)

**Cátedra:** Arquitectura de Software

## Notas finales

Este proyecto tiene un **enfoque académico**, pero está diseñado con una mentalidad cercana al mundo real. La arquitectura propuesta busca demostrar no solo que el sistema funciona, sino que **está bien pensado**, documentado y preparado para evolucionar.
