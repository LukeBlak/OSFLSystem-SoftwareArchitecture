# ADR-001 — Arquitectura del MVP

**Estado:** Aceptado  
**Fecha:** 3 de febrero de 2026  
**Decisores:** José Avilés, Alexander Martínez, Jhonnatan Peñate  
**Contexto:** Proyecto académico – Arquitectura de Software

## Contexto

El proyecto corresponde a un **Sistema de Gestión de Voluntariados** orientado a organizaciones y asociaciones sin fines de lucro (OSFL). El sistema permitirá que múltiples organizaciones utilicen una misma plataforma tecnológica, manteniendo una separación lógica de datos y configuración por organización, siguiendo un enfoque **multi-organización (multi-tenant)** similar al utilizado por plataformas como Moodle.

El sistema se desarrolla inicialmente como un **MVP (Producto Mínimo Viable)**, cuyo objetivo es validar el dominio funcional del voluntariado y demostrar una arquitectura clara, mantenible y alineada con las restricciones académicas del curso.

### Restricciones principales

- Tiempo limitado de desarrollo.  
- Equipo académico con niveles de experiencia técnica heterogéneos.  
- Necesidad de una solución funcional, estable y comprensible.

### Drivers arquitectónicos prioritarios

- Rapidez de desarrollo.  
- Claridad estructural.  
- Bajo costo de despliegue.  
- Facilidad de mantenimiento inicial.

## Decisión

Se adopta una **arquitectura monolítica modular basada en capas** para el desarrollo del MVP del sistema.

## Estilo arquitectónico

- Monolito modular.  
- Arquitectura en capas (Layered Architecture).  
- Separación clara de responsabilidades.

Este enfoque permite reducir la complejidad inicial del sistema, minimizar la latencia interna y facilitar la comprensión del código por parte del equipo de desarrollo.

## Componentes principales

### Frontend

- React.  
- Interfaz web responsiva.  
- Consumo de API REST.

### Backend

- Node.js con Express.  
- API REST centralizada.  
- Organización modular por dominios funcionales.

#### Capas del backend

- **Presentación:** controladores y endpoints REST.  
- **Aplicación:** servicios que implementan los casos de uso.  
- **Dominio:** entidades del negocio (Voluntario, Proyecto, Organización, Horas Sociales).  
- **Persistencia:** repositorios y acceso a base de datos.

### Persistencia

- Base de datos relacional PostgreSQL.  
- Gestión de usuarios, organizaciones, proyectos, roles y horas sociales.  
- Uso de repositorios para desacoplar la lógica de negocio del acceso a datos.

### Infraestructura

- Contenedores Docker.  
- Orquestación básica con Docker Compose para entorno de desarrollo.

## Requisitos no funcionales priorizados

### Alta prioridad

- **Seguridad:** control de acceso basado en roles y aislamiento de datos por organización.  
- **Rendimiento:** tiempos de respuesta aceptables bajo carga moderada.  
- **Mantenibilidad:** código modular y documentado.  
- **Confiabilidad:** funcionamiento estable con baja tasa de errores.

## Alternativas consideradas

### Arquitectura de microservicios desde el inicio

Rechazada debido a:

- Mayor complejidad operativa.  
- Sobrecosto de infraestructura.  
- Dificultad de implementación en un entorno académico.

### Arquitectura sin modularización

Descartada por generar alto acoplamiento y dificultar el mantenimiento.

## Consecuencias

### Ventajas

- Desarrollo rápido y controlado.  
- Arquitectura fácil de comprender y documentar.  
- Menor complejidad de despliegue.  
- Base sólida para validar el dominio del voluntariado.

### Desventajas

- Escalabilidad limitada.  
- Riesgo de crecimiento excesivo del monolito si no se controla la modularidad.

## Justificación final

La arquitectura monolítica modular basada en capas es la opción más adecuada para el MVP del Sistema de Gestión de Voluntariados, ya que equilibra simplicidad, claridad y velocidad de desarrollo. Esta decisión permite cumplir los objetivos académicos del proyecto y establece una base técnica sólida para una futura evolución arquitectónica.
