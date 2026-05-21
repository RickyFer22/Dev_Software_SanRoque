# 🏛️ Scripts de Automatización e Integración con Notion

Esta carpeta contiene el conjunto completo de herramientas y scripts en Python desarrollados para inicializar, enriquecer y estructurar de manera premium la **Pasantía en Ingeniería de Software — Portal Municipal San Roque** en Notion.

---

## 🔑 Prerrequisitos y Configuración

Todos los scripts se comunican de forma segura con la API oficial de Notion. Para ejecutarlos, debes asegurarte de cumplir con lo siguiente:

1.  **Instalar Python 3.x**
2.  **Configurar tu Token de Notion (`NOTION_API_KEY`):**
    Puedes establecerlo como variable de entorno en tu terminal:
    *   **En PowerShell (Windows):**
        ```powershell
        $env:NOTION_API_KEY="tu_token_ntn_aquí"
        ```
    *   **En Bash/zsh (Linux/macOS):**
        ```bash
        export NOTION_API_KEY="tu_token_ntn_aquí"
        ```
    *(Nota: Si no la configuras, los scripts principales te solicitarán que la ingreses de forma interactiva en la consola).*

---

## 📁 Catálogo de Scripts

### 1. 📂 `create_notion_workspace_original.py`
*   **Propósito:** Es la versión original de inicialización del espacio de trabajo.
*   **Qué hace:** Realiza una búsqueda (`search`) de las páginas de Notion a las que tu token tiene permisos de integración, toma la primera página compartida y crea una subpágina básica del proyecto con un tablero de tareas inicial elemental de 3 propiedades.

### 2. 💎 `notion_make_rich.py`
*   **Propósito:** Script de enriquecimiento visual profundo.
*   **Qué hace:** 
    *   Reconfigura las propiedades superiores de la página principal (agrega portada abstracta verde-dorada, actualiza el icono a `🏛️` y expande el título).
    *   Limpia el canvas barriendo cualquier bloque viejo de texto o listas.
    *   Genera e inserta bloques visuales dinámicos nativos: Tabla de Contenidos automatizada, bloques tipo *Callout* para Onboarding, Guía de Paleta de Colores/Branding, y una sección de toggles expandibles que desglosa el syllabus de 6 módulos y requerimientos de frontend.

### 3. 🔍 `notion_inspect.py`
*   **Propósito:** Herramienta de diagnóstico y análisis de bloques.
*   **Qué hace:** Consulta y lista en consola el identificador (`ID`) y tipo (`type`) de cada bloque hijo que reside dentro del canvas de la página principal de Notion. Es sumamente útil para identificar bases de datos huérfanas, IDs de bloques para su posterior modificación o verificar si la página ha sido vaciada.

### 4. 🎓 `notion_upgrade_eval.py`
*   **Propósito:** Script principal de reestructuración UX/UI orientado a la evaluación docente y entregas de alumnos.
*   **Qué hace:**
    *   Inspecciona la página y elimina de forma inteligente las bases de datos duplicadas que estén obsoletas.
    *   Agrega dos secciones explicativas tipo *Callout* de doble columna (Onboarding para Alumnos y Rúbrica para Docentes) para organizar el flujo de correcciones.
    *   Crea una base de datos maestra e integrada: **`🎓 Control de Avance y Calificaciones (Backlog) 📋`**.
    *   Inserta propiedades avanzadas: `Estudiante` (selector), `Entregable (URL)` (campo de link a Netlify/PR), `Calificación` (selector por colores del 1 al 10 y rehacer), `Feedback del Docente` (texto amplio) y `Fecha de Entrega`.
    *   Genera y puebla el backlog oficial con las 12 tareas modulares del Portal Municipal.

---

## 🚀 Instrucciones de Ejecución

Para ejecutar cualquiera de los scripts de forma segura, sitúate en el directorio de scripts y corre el comando de Python en tu shell:

```bash
# Cambiar al directorio
cd "c:\Users\Ricardo\Desktop\PROYECTOS MSR\1- PAGINA MUNICIPIO\Pasantia Software\notion_scripts"

# Ejemplo: Ejecutar el inspector de bloques para diagnosticar
python notion_inspect.py

# Ejemplo: Ejecutar la actualización de evaluación docente y alumnos
python notion_upgrade_eval.py
```
