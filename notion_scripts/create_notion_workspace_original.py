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
    print("Searching for shared pages in Notion...")
    search_res = call_notion_api("search", data={})
    results = search_res.get("results", [])
    
    # Filter for pages (not databases)
    pages = [r for r in results if r.get("object") == "page"]
    
    if not pages:
        print("\n=== ATENCIÓN: NO SE ENCONTRARON PÁGINAS COMPARTIDAS ===")
        print("Para que el script pueda crear el espacio en Notion:")
        print("1. Abre Notion en tu navegador o app.")
        print("2. Abre o crea la página donde quieras alojar el proyecto (ej. 'Pasantía Software').")
        print("3. Haz clic en el botón '...' (esquina superior derecha).")
        print("4. Selecciona 'Agregar conexiones' (Add connections).")
        print("5. Busca la integración vinculada a tu token (usualmente llamada 'notion' o el nombre que le diste).")
        print("6. Haz clic en ella para otorgarle acceso.")
        print("7. Una vez hecho, vuelve a ejecutar este script.\n")
        return

    # Use the first shared page as parent
    parent_page = pages[0]
    parent_id = parent_page["id"]
    parent_title = "Untitled"
    if "properties" in parent_page:
        title_prop = parent_page["properties"].get("title", {}).get("title", [])
        if title_prop:
            parent_title = title_prop[0].get("plain_text", "Untitled")
    
    print(f"Encontrada página compartida: '{parent_title}' (ID: {parent_id})")
    print("Creando página principal del proyecto 'Portal San Roque Dev'...")
    
    # 1. Create Pasantía Main Page
    main_page_data = {
        "parent": { "page_id": parent_id },
        "properties": {
            "title": [
                {
                    "text": { "content": "Pasantía de Software - Municipalidad de San Roque 🏛️" }
                }
            ]
        },
        "children": [
            {
                "object": "block",
                "type": "heading_1",
                "heading_1": {
                    "rich_text": [
                        { "text": { "content": "Portal San Roque Dev 🌐🏛️" } }
                    ]
                }
            },
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [
                        {
                            "text": {
                                "content": "Espacio de trabajo oficial para la pasantía de desarrollo de software del Frontend de la Municipalidad de San Roque, Corrientes. En esta página gestionaremos las tareas del backlog, documentaremos el código y coordinaremos las actividades del equipo."
                            }
                        }
                    ]
                }
            },
            {
                "object": "block",
                "type": "callout",
                "callout": {
                    "rich_text": [
                        {
                            "text": {
                                "content": "💡 Web Oficial: https://munisanroque.ar/\n⚡ Deploy en Vivo: https://devsoftwaresanroque.netlify.app/\n📦 Repositorio: git@github.com:RickyFer22/Dev_Software_SanRoque.git"
                            }
                        }
                    ],
                    "icon": { "type": "emoji", "emoji": "⚡" },
                    "color": "green_background"
                }
            },
            {
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [
                        { "text": { "content": "🎨 Paleta de Colores Oficial" } }
                    ]
                }
            },
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [
                        {
                            "text": {
                                "content": "Todos los módulos deben respetar estrictamente los siguientes colores institucionales:\n"
                                          "• Verde Base: #134e4a (--verde)\n"
                                          "• Verde Oscuro: #0d3937 (--verde-oscuro)\n"
                                          "• Verde Claro: #1a6b65 (--verde-claro)\n"
                                          "• Dorado: #d4a83c (--dorado)\n"
                                          "• Dorado Claro: #f5d98a (--dorado-claro)\n"
                                          "• Gris de Fondo: #f4f7f6 (--gris-fondo)\n"
                                          "• Gris de Texto: #4a5568 (--gris-texto)"
                            }
                        }
                    ]
                }
            },
            {
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [
                        { "text": { "content": "🔄 Flujo Operativo Diario" } }
                    ]
                }
            },
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [
                        {
                            "text": {
                                "content": "1. Revisa tu asignación en el Tablero de Tareas de abajo y muévela a 'En Progreso'.\n"
                                          "2. Ejecuta git pull origin main para sincronizar tu local.\n"
                                          "3. Programa utilizando HTML5, CSS y JavaScript Vanilla (con Live Server).\n"
                                          "4. Sube tus cambios: git add . -> git commit -> git push.\n"
                                          "5. Verifica el deploy automático en Netlify.\n"
                                          "6. Mueve tu tarjeta en Notion a 'Finalizado'."
                            }
                        }
                    ]
                }
            }
        ]
    }
    
    new_page = call_notion_api("pages", data=main_page_data)
    workspace_page_id = new_page["id"]
    print(f"Página de Pasantía creada con éxito! ID: {workspace_page_id}")
    
    # 2. Create the Tasks Database
    print("Creando Base de Datos del Tablero de Tareas...")
    db_data = {
        "parent": { "page_id": workspace_page_id },
        "title": [
            {
                "type": "text",
                "text": { "content": "Tablero de Tareas (Backlog) 📋" }
            }
        ],
        "properties": {
            "Tarea": { "title": {} },
            "Estado": {
                "select": {
                    "options": [
                        { "name": "Por Hacer", "color": "red" },
                        { "name": "En Progreso", "color": "yellow" },
                        { "name": "Finalizado", "color": "green" }
                    ]
                }
            },
            "Módulo": {
                "select": {
                    "options": [
                        { "name": "🌲 Turismo & Cultura", "color": "green" },
                        { "name": "🏛️ Dependencia Municipal", "color": "blue" },
                        { "name": "⚽ Deportes", "color": "orange" },
                        { "name": "📋 Servicios a la Comunidad", "color": "purple" },
                        { "name": "⛪ Culto", "color": "pink" },
                        { "name": "🛍️ Emprendedores Locales", "color": "brown" },
                        { "name": "⚙️ Configuración / Base", "color": "gray" }
                    ]
                }
            }
        }
    }
    
    db = call_notion_api("databases", data=db_data)
    db_id = db["id"]
    print(f"Base de datos de Tareas creada con éxito! ID: {db_id}")
    
    # 3. Populate Tasks
    print("Agregando tareas iniciales al backlog...")
    tasks = [
        ("Maquetación responsiva del Sidebar y Header principal", "⚙️ Configuración / Base"),
        ("Investigación y maquetación de Turismo (Sección Atractivos e Historia)", "🌲 Turismo & Cultura"),
        ("Crear catálogo de Alojamientos y Gastronomía con enlace directo a WhatsApp", "🌲 Turismo & Cultura"),
        ("Diseñar grilla de Eventos Culturales y Carnavales", "🌲 Turismo & Cultura"),
        ("Diseñar e implementar el catálogo de Dependencias Municipales", "🏛️ Dependencia Municipal"),
        ("Crear el organigrama interactivo con horarios de secretarías", "🏛️ Dependencia Municipal"),
        ("Maquetar la cartelera de Deportes y fixture del Futsal local", "⚽ Deportes"),
        ("Crear el sistema interactivo de disponibilidad/reserva de canchas", "⚽ Deportes"),
        ("Estructurar la cuadrícula horaria interactiva de Misas y Capillas", "⛪ Culto"),
        ("Diseñar grilla de Recolección de Residuos por barrios con mapa descriptivo", "📋 Servicios a la Comunidad"),
        ("Estructurar horarios del Transporte Urbano y la Terminal de Ómnibus", "📋 Servicios a la Comunidad"),
        ("Crear vitrina comercial digital para la visibilización de Emprendedores de San Roque", "🛍️ Emprendedores Locales")
    ]
    
    for t_name, t_module in tasks:
        task_page_data = {
            "parent": { "database_id": db_id },
            "properties": {
                "Tarea": {
                    "title": [
                        { "text": { "content": t_name } }
                    ]
                },
                "Estado": {
                    "select": { "name": "Por Hacer" }
                },
                "Módulo": {
                    "select": { "name": t_module }
                }
            }
        }
        call_notion_api("pages", data=task_page_data)
        print(f"[OK] Tarea agregada: '{t_name}'")
        time.sleep(0.3) # Rate limit friendly
        
    print("\n=======================================================")
    print("ESPACIO DE NOTION CREADO E INICIALIZADO CON EXITO!")
    print("=======================================================")

if __name__ == "__main__":
    main()
