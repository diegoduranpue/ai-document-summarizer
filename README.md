# Resumen automático de documentos

Aplicación web que convierte documentos en un resumen visual y estructurado. El archivo se procesa directamente en el navegador: no se envía ni se guarda en un servidor.

## Funciones

- Carga mediante selector o arrastrando el archivo.
- Compatibilidad con `.docx`, `.md` y `.txt`.
- Generación de panorama general, ideas clave y conceptos recurrentes.
- Detección opcional de intervenciones etiquetadas como `Profesor:` y `Alumnos:`.
- Agrupación de todas las intervenciones de alumnos en una sola voz.
- Diseño adaptable a computadora, tableta y móvil.
- Límite de 10 MB por documento.

## Tecnologías

- React 19
- Next.js 16
- vinext y Vite
- Mammoth para leer documentos Word `.docx`
- Tailwind CSS 4

## Requisitos

- Node.js 22.13 o posterior
- pnpm

## Instalación

```bash
pnpm install
pnpm dev
```

Después abre `http://localhost:3000`.

## Crear la versión de producción

```bash
pnpm build
```

## Formato de voces en transcripciones

Para mostrar la sección separada entre profesor y alumnos, el documento puede usar líneas como estas:

```text
Profesor: Esta es la explicación principal del tema.
Alumnos: Esta es una pregunta o aportación del grupo.
```

Todas las líneas `Alumno:`, `Alumnos:`, `Estudiante:` o `Estudiantes:` se reúnen en el grupo **Alumnos**.

## Privacidad

La lectura y el análisis se realizan en el navegador de la persona usuaria. La aplicación no incorpora una base de datos ni almacenamiento de documentos.

## Estructura principal

- `app/page.tsx`: carga, lectura y generación del resumen.
- `app/globals.css`: diseño y adaptación responsive.
- `app/layout.tsx`: metadatos y configuración general.
- `public/`: imágenes y recursos públicos.

## Nota sobre Word

El formato moderno compatible es `.docx`. Los archivos antiguos `.doc` deben guardarse como `.docx` antes de subirlos.
