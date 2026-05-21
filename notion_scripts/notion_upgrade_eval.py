import urllib.request
import json
import time
import sys
import os

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

token = os.environ.get("NOTION_API_KEY")
if not token:
    print("La variable de entorno NOTION_API_KEY no está configurada.")
    token = input("Por favor, ingresa tu Token de Notion (ntn_...): ").strip()
page_id = "36730b4a-e7dc-81cc-8bab-c9cff253fbeb"

def call_notion_api(endpoint, method="POST", data=None):
    url = f"https://api.notion.com/v1/{endpoint}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
    }
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"HTTP Error {e.code} calling {endpoint}: {error_body}")
        raise e
    except Exception as e:
        print(f"Error calling {endpoint}: {e}")
        raise e

def main():
    print("=== NOTION BACKLOG UX/UI UPGRADE FOR STUDENTS & TEACHERS ===")
    
    # 1. Fetch all child blocks of the page
    print("1. Fetching child blocks to inspect and remove older databases...")
    res = call_notion_api(f"blocks/{page_id}/children", method="GET")
    blocks = res.get("results", [])
    
    # We want to identify the old components at the bottom to delete them cleanly
    # These include old child_databases, the heading '📋 Tablero de Gestión...', the divider before it, and trailing paragraphs
    blocks_to_delete = []
    found_backlog_section = False
    
    for b in blocks:
        b_type = b.get("type")
        b_id = b.get("id")
        
        # Mark all database blocks for deletion to prevent duplicate backlog panels
        if b_type == "child_database":
            blocks_to_delete.append(b_id)
            print(f"[MARK FOR DELETE] Database block: {b_id} ('{b['child_database'].get('title')}')")
            continue
            
        # Detect where the backlog section starts to clean it up and rebuild it beautifully
        if b_type == "heading_2":
            text = "".join([t.get("plain_text", "") for t in b["heading_2"].get("rich_text", [])])
            if "Tablero" in text or "Backlog" in text:
                found_backlog_section = True
                blocks_to_delete.append(b_id)
                print(f"[MARK FOR DELETE] Backlog Heading block: {b_id} ('{text}')")
                continue
        
        # If we are in the backlog section or at the very end, delete any extra divider or trailing paragraphs
        if found_backlog_section or (b == blocks[-1] and b_type == "paragraph"):
            blocks_to_delete.append(b_id)
            print(f"[MARK FOR DELETE] Trailing/Section block: {b_id} ({b_type})")
            
        # Let's also check if there is an extra divider right before the backlog section and delete it
        # (It's safe to delete by ID)
        if b_id == "36730b4a-e7dc-81a5-97aa-e65d87833cb2":
            blocks_to_delete.append(b_id)
            print(f"[MARK FOR DELETE] Section Divider block: {b_id}")

    # Deduplicate and delete marked blocks
    blocks_to_delete = list(set(blocks_to_delete))
    for b_id in blocks_to_delete:
        try:
            call_notion_api(f"blocks/{b_id}", method="DELETE")
            print(f"[OK] Deleted old block: {b_id}")
            time.sleep(0.1)
        except Exception as e:
            print(f"[WARN] Could not delete block {b_id}: {e}")

    # 2. Append new explanation blocks and double Column Guides (Callouts) for Alumnos & Docentes
    print("2. Appending new Evaluation Methodology Heading and double Role Guides...")
    
    eval_methodology_blocks = [
        # Divider
        {
            "object": "block",
            "type": "divider",
            "divider": {}
        },
        # Section Heading H2
        {
            "object": "block",
            "type": "heading_2",
            "heading_2": {
                "rich_text": [
                    { "text": { "content": "🎓 Control de Avance, Entregas y Calificaciones" } }
                ]
            }
        },
        # Subtitle paragraph
        {
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [
                    { "text": { "content": "Este espacio interactivo está diseñado bajo una metodología ágil de educación digital. Permite a los " } },
                    { "text": { "content": "Alumnos" }, "annotations": { "bold": True, "color": "blue" } },
                    { "text": { "content": " reportar sus avances de maquetación en tiempo real y a los " } },
                    { "text": { "content": "Docentes / Evaluadores" }, "annotations": { "bold": True, "color": "green" } },
                    { "text": { "content": " calificar las entregas, verificar despliegues y dejar feedback directo de mejora." } }
                ]
            }
        },
        # Student Guide Callout
        {
            "object": "block",
            "type": "callout",
            "callout": {
                "rich_text": [
                    {
                        "type": "text",
                        "text": { "content": "👨‍💻 PARA ALUMNOS — ¿CÓMO ENTREGAR TAREAS?\n\n" },
                        "annotations": { "bold": True }
                    },
                    {
                        "type": "text",
                        "text": {
                            "content": "1️⃣ Selección: Selecciona tu tarea del backlog y asígnate en la columna 'Estudiante'.\n"
                                      "2️⃣ Desarrollo: Cambia el Estado a '🟡 En Progreso' y programa localmente usando el stack oficial.\n"
                                      "3️⃣ Despliegue: Sube tus cambios a GitHub y corrobora la compilación en Netlify.\n"
                                      "4️⃣ Entrega: Pega tu link del despliegue en vivo en 'Entregable (URL)', cambia el Estado a '🔵 Listo para Evaluación' y registra la Fecha de Entrega."
                        }
                    }
                ],
                "icon": { "type": "emoji", "emoji": "👨‍💻" },
                "color": "blue_background"
            }
        },
        # Teacher Guide Callout
        {
            "object": "block",
            "type": "callout",
            "callout": {
                "rich_text": [
                    {
                        "type": "text",
                        "text": { "content": "🍎 PARA DOCENTES — ¿CÓMO CALIFICAR Y EVALUAR?\n\n" },
                        "annotations": { "bold": True }
                    },
                    {
                        "type": "text",
                        "text": {
                            "content": "1️⃣ Monitoreo: Filtra el tablero para visualizar tareas en estado '🔵 Listo para Evaluación'.\n"
                                      "2️⃣ Inspección: Abre el enlace provisto en 'Entregable (URL)' para auditar la UX/UI y revisa el código fuente.\n"
                                      "3️⃣ Nota: Asigna la puntuación cualitativa en 'Calificación' (Excelente, Muy Bueno, Aprobado o Insuficiente).\n"
                                      "4️⃣ Cierre: Deja tus observaciones técnicas en 'Feedback del Docente' y cambia el Estado a:\n"
                                      "      • '🟢 Aprobado' — Cierra la tarea con éxito.\n"
                                      "      • '🟠 Rehacer / Observaciones' — La tarea retorna al alumno con notas de corrección."
                        }
                    }
                ],
                "icon": { "type": "emoji", "emoji": "🎓" },
                "color": "green_background"
            }
        }
    ]
    
    call_notion_api(f"blocks/{page_id}/children", method="PATCH", data={ "children": eval_methodology_blocks })
    print("[OK] Methodology headings and role callouts appended.")
    
    # 3. Create the new extremely rich Database with custom assessment properties
    print("3. Re-creating Master Database with advanced evaluation properties...")
    db_data = {
        "parent": { "page_id": page_id },
        "title": [
            {
                "type": "text",
                "text": { "content": "🎓 Control de Avance y Calificaciones (Backlog) 📋" }
            }
        ],
        "properties": {
            "Tarea": { "title": {} },
            "Módulo": {
                "select": {
                    "options": [
                        { "name": "🌲 M01: Turismo & Cultura", "color": "green" },
                        { "name": "🏛️ M02: Dependencia Municipal", "color": "blue" },
                        { "name": "⚽ M03: Deportes", "color": "orange" },
                        { "name": "📋 M04: Servicios a la Comunidad", "color": "purple" },
                        { "name": "⛪ M05: Culto y Religión", "color": "pink" },
                        { "name": "🛍️ M06: Emprendedores Locales", "color": "brown" },
                        { "name": "⚙️ Configuración / Base", "color": "gray" }
                    ]
                }
            },
            "Estado": {
                "select": {
                    "options": [
                        { "name": "🔴 Por Hacer", "color": "red" },
                        { "name": "🟡 En Progreso", "color": "yellow" },
                        { "name": "🔵 Listo para Evaluación", "color": "blue" },
                        { "name": "🟢 Aprobado", "color": "green" },
                        { "name": "🟠 Rehacer / Observaciones", "color": "orange" }
                    ]
                }
            },
            "Estudiante": {
                "select": {
                    "options": [
                        { "name": "[Sin Asignar]", "color": "gray" },
                        { "name": "Ricardo Fernández", "color": "blue" },
                        { "name": "Estudiante Invitado 1", "color": "purple" },
                        { "name": "Estudiante Invitado 2", "color": "pink" }
                    ]
                }
            },
            "Entregable (URL)": { "url": {} },
            "Calificación": {
                "select": {
                    "options": [
                        { "name": "💬 Pendiente", "color": "gray" },
                        { "name": "⭐ Excelente (10)", "color": "green" },
                        { "name": "🔹 Muy Bueno (8-9)", "color": "blue" },
                        { "name": "🔸 Aprobado (6-7)", "color": "orange" },
                        { "name": "⚠️ Insuficiente (1-5)", "color": "red" }
                    ]
                }
            },
            "Feedback del Docente": { "rich_text": {} },
            "Fecha de Entrega": { "date": {} }
        }
    }
    
    new_db = call_notion_api("databases", method="POST", data=db_data)
    new_db_id = new_db["id"]
    print(f"[OK] Advanced evaluation database created. ID: {new_db_id}")
    
    # 4. Populate standard 12 modular backlog tasks into the new database
    print("4. Populating 12 backlog tasks with assessment placeholders...")
    tasks = [
        ("Maquetación responsiva del Sidebar y Header principal", "⚙️ Configuración / Base"),
        ("Investigación y maquetación de Turismo (Sección Atractivos e Historia)", "🌲 M01: Turismo & Cultura"),
        ("Crear catálogo de Alojamientos y Gastronomía con enlace directo a WhatsApp", "🌲 M01: Turismo & Cultura"),
        ("Diseñar grilla de Eventos Culturales y Carnavales", "🌲 M01: Turismo & Cultura"),
        ("Diseñar e implementar el catálogo de Dependencias Municipales", "🏛️ M02: Dependencia Municipal"),
        ("Crear el organigrama interactivo con horarios de secretarías", "🏛️ M02: Dependencia Municipal"),
        ("Maquetar la cartelera de Deportes y fixture del Futsal local", "⚽ M03: Deportes"),
        ("Crear el sistema interactivo de disponibilidad/reserva de canchas", "⚽ M03: Deportes"),
        ("Diseñar grilla de Recolección de Residuos por barrios con mapa descriptivo", "📋 M04: Servicios a la Comunidad"),
        ("Estructurar horarios del Transporte Urbano y la Terminal de Ómnibus", "📋 M04: Servicios a la Comunidad"),
        ("Estructurar la cuadrícula horaria interactiva de Misas y Capillas", "⛪ M05: Culto y Religión"),
        ("Crear vitrina comercial digital para la visibilización de Emprendedores de San Roque", "🛍️ M06: Emprendedores Locales")
    ]
    
    for t_name, t_module in tasks:
        task_page_data = {
            "parent": { "database_id": new_db_id },
            "properties": {
                "Tarea": {
                    "title": [
                        { "text": { "content": t_name } }
                    ]
                },
                "Estado": {
                    "select": { "name": "🔴 Por Hacer" }
                },
                "Módulo": {
                    "select": { "name": t_module }
                },
                "Estudiante": {
                    "select": { "name": "[Sin Asignar]" }
                },
                "Calificación": {
                    "select": { "name": "💬 Pendiente" }
                }
            }
        }
        call_notion_api("pages", method="POST", data=task_page_data)
        print(f"[OK] Task added: '{t_name}'")
        time.sleep(0.3) # Rate limit friendly
        
    print("\n=======================================================")
    print("SUCCESS: EVALUATION UX/UI DATABASE REBUILT SUCCESSFULLY!")
    print("=======================================================")

if __name__ == "__main__":
    main()
