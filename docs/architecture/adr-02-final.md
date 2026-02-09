# ADR-002 — Arquitectura Final

**Estado:** En revisión  
**Fecha:** 3 de febrero de 2026  
**Decisores:** Kevin Luna, Sheyla Sarmiento  
**Contexto:** Evolución arquitectónica del sistema

## Contexto

Tras la validación funcional del MVP, se plantea una **arquitectura final** orientada a un escenario más cercano a producción real. Esta fase busca escalar la solución y prepararla para un uso sostenido por organizaciones sin fines de lucro, priorizando resiliencia, escalabilidad y mantenibilidad a largo plazo.

El crecimiento del sistema introduce nuevos requerimientos técnicos que no pueden ser abordados eficientemente por una arquitectura monolítica.

### Drivers arquitectónicos prioritarios

- Escalabilidad diferencial de componentes.  
- Resiliencia y tolerancia a fallos.  
- Desarrollo en paralelo por equipos independientes.  
- Mantenibilidad a largo plazo.

## Decisión

Se adopta una **arquitectura de microservicios**, descomponiendo el monolito del MVP en servicios independientes alineados con los distintos contextos del dominio del negocio.

## Estilo arquitectónico

- Microservicios.  
- Separación por contextos de negocio.  
- Comunicación síncrona y asíncrona.  
- API Gateway como punto de entrada único.

## Componentes principales

### Frontend

- React.  
- Consumo de APIs a través de un API Gateway centralizado.

### Backend

#### Microservicios definidos

- Servicio de Organización y Autenticación.  
- Servicio de Usuarios y Miembros.  
- Servicio de Proyectos y Actividades.  
- Servicio de Comunicación.  
- Servicio de Horas Sociales.

Cada microservicio:

- Está implementado con Node.js y Express.  
- Posee su propia base de datos o esquema aislado.  
- Es responsable exclusivo de sus datos (principio de propiedad de datos).

### Persistencia

- PostgreSQL / Supabase.  
- Aislamiento lógico de datos por servicio.  
- Eliminación de dependencias directas entre bases de datos.

### Infraestructura

- Contenedores Docker independientes.  
- API Gateway centralizado.  
- Orquestación con Docker Compose.  
- Preparación para despliegue en plataformas cloud (Render / Fly.io).

## Seguridad

- Cumplimiento de OWASP Top 10.  
- Principios de Zero Trust.  
- Autenticación y autorización en cada petición.  
- Cifrado de comunicaciones mediante TLS/SSL.

## Alternativas consideradas

### Mantener la arquitectura monolítica del MVP

Rechazada por:

- Limitaciones de escalabilidad granular.  
- Dominio de falla único.  
- Bloqueo de despliegues ante cambios menores.

### Microservicios sin API Gateway

Descartada debido a:

- Mayor complejidad en el frontend.  
- Incremento de la superficie de ataque.  
- Dificultad para aplicar políticas de seguridad centralizadas.

## Consecuencias

### Ventajas

- Escalabilidad granular por servicio.  
- Aislamiento de fallos.  
- Despliegue independiente de componentes.  
- Mejor alineación con escenarios de producción real.

### Desventajas

- Mayor complejidad operativa.  
- Necesidad de manejar consistencia eventual.  
- Incremento en la latencia por comunicación entre servicios.

## Justificación final

La arquitectura de microservicios representa una evolución natural del MVP hacia una solución robusta, escalable y preparada para un entorno real. Esta decisión permite transformar las limitaciones del monolito inicial en fortalezas del sistema final, alineando la solución con buenas prácticas modernas de arquitectura de software.
