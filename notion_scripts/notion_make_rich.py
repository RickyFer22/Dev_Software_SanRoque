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
    print("=== NOTION WORKSPACE RICH UPGRADE ===")
    
    # 1. Update main page properties (Title, Icon, Cover)
    print("1. Updating main page title, icon, and cover...")
    page_update_data = {
        "properties": {
            "title": [
                {
                    "text": { "content": "Pasantía en Ingeniería de Software — Portal Municipal San Roque 🏛️" }
                }
            ]
        },
        "icon": {
            "type": "emoji",
            "emoji": "🏛️"
        },
        "cover": {
            "type": "external",
            "external": {
                "url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1920&auto=format&fit=crop"
            }
        }
    }
    call_notion_api(f"pages/{page_id}", method="PATCH", data=page_update_data)
    print("[OK] Main page updated.")
    
    # 2. Get list of current child blocks and delete them
    print("2. Fetching and deleting old child blocks to clear the canvas...")
    blocks_res = call_notion_api(f"blocks/{page_id}/children", method="GET")
    blocks = blocks_res.get("results", [])
    
    for block in blocks:
        block_id = block["id"]
        call_notion_api(f"blocks/{block_id}", method="DELETE")
        print(f"[OK] Deleted block {block_id} ({block.get('type')})")
        time.sleep(0.1) # Be rate-limit friendly
    
    # 3. Create the new extremely rich page layout blocks
    print("3. Appending rich content blocks (Intro, Links, Modules, Brand guidelines)...")
    
    rich_blocks = [
        # Table of Contents
        {
            "object": "block",
            "type": "table_of_contents",
            "table_of_contents": {}
        },
        # Divider
        {
            "object": "block",
            "type": "divider",
            "divider": {}
        },
        # Welcome Callout
        {
            "object": "block",
            "type": "callout",
            "callout": {
                "rich_text": [
                    {
                        "type": "text",
                        "text": {
                            "content": "¡Te damos la bienvenida al Portal de Desarrollo del Municipio de San Roque! 🏛️✨\nEste es el espacio de trabajo centralizado para la Pasantía de Ingeniería de Software 2026. Aquí coordinaremos el diseño, relevamiento y maquetación interactiva del frontend municipal utilizando estándares nativos de la web para lograr un portal moderno, inclusivo y accesible para todos los vecinos."
                        }
                    }
                ],
                "icon": { "type": "emoji", "emoji": "🚀" },
                "color": "green_background"
            }
        },
        # Quick Links Callout
        {
            "object": "block",
            "type": "callout",
            "callout": {
                "rich_text": [
                    {
                        "type": "text",
                        "text": { "content": "🔗 RECURSOS Y ENLACES CLAVE DEL PROYECTO:\n\n" },
                        "annotations": { "bold": True }
                    },
                    {
                        "type": "text",
                        "text": { "content": "• 🌐 Portal Municipal Oficial: " }
                    },
                    {
                        "type": "text",
                        "text": {
                            "content": "munisanroque.ar\n",
                            "link": { "url": "https://munisanroque.ar/" }
                        },
                        "annotations": { "underline": True, "color": "blue" }
                    },
                    {
                        "type": "text",
                        "text": { "content": "• ⚡ Entorno de Despliegue en Vivo: " }
                    },
                    {
                        "type": "text",
                        "text": {
                            "content": "devsoftwaresanroque.netlify.app\n",
                            "link": { "url": "https://devsoftwaresanroque.netlify.app/" }
                        },
                        "annotations": { "underline": True, "color": "blue" }
                    },
                    {
                        "type": "text",
                        "text": { "content": "• 📦 Repositorio GitHub Oficial: " }
                    },
                    {
                        "type": "text",
                        "text": {
                            "content": "github.com/RickyFer22/Dev_Software_SanRoque\n",
                            "link": { "url": "https://github.com/RickyFer22/Dev_Software_SanRoque" }
                        },
                        "annotations": { "underline": True, "color": "blue" }
                    },
                    {
                        "type": "text",
                        "text": { "content": "• 📄 Manual Completo del Pasante (PDF): " }
                    },
                    {
                        "type": "text",
                        "text": {
                            "content": "Ver Documento Técnico",
                            "link": { "url": "https://github.com/RickyFer22/Dev_Software_SanRoque/blob/main/Manual_Pasantes_Software_San_Roque_Completo.pdf" }
                        },
                        "annotations": { "underline": True, "color": "blue" }
                    }
                ],
                "icon": { "type": "emoji", "emoji": "🔗" },
                "color": "gray_background"
            }
        },
        # Divider
        {
            "object": "block",
            "type": "divider",
            "divider": {}
        },
        # Brand Guidelines Heading
        {
            "object": "block",
            "type": "heading_2",
            "heading_2": {
                "rich_text": [
                    { "text": { "content": "🎨 Lineamientos Visuales y Estilo (Branding)" } }
                ]
            }
        },
        # Brand Callout
        {
            "object": "block",
            "type": "callout",
            "callout": {
                "rich_text": [
                    {
                        "type": "text",
                        "text": {
                            "content": "PALETA DE COLORES INSTITUCIONAL (Estricta y Variable):\n\n🟢 Verde Base: #134e4a (--verde) — Usado para contenedores principales y fondos sólidos.\n🟢 Verde Oscuro: #0d3937 (--verde-oscuro) — Usado para el fondo principal de la aplicación.\n🟢 Verde Claro: #1a6b65 (--verde-claro) — Usado para hovers e iluminaciones.\n🟡 Dorado: #d4a83c (--dorado) — Usado para acentos visuales y decoraciones secundarias.\n🟡 Dorado Claro: #f5d98a (--dorado-claro) — Usado para títulos destacados e iluminados.\n⚪ Gris Fondo: #f4f7f6 (--gris-fondo) — Usado para contrastes claros opcionales.\n⚫ Gris Texto: #4a5568 (--gris-texto) — Usado para lecturas extensas claras.\n\n⚠️ Regla de Estilo: Todas las tipografías deben usar las fuentes pre-cargadas (Syne, DM Sans y JetBrains Mono) para mantener coherencia estética."
                        }
                    }
                ],
                "icon": { "type": "emoji", "emoji": "🎨" },
                "color": "yellow_background"
            }
        },
        # Divider
        {
            "object": "block",
            "type": "divider",
            "divider": {}
        },
        # Modules Heading
        {
            "object": "block",
            "type": "heading_2",
            "heading_2": {
                "rich_text": [
                    { "text": { "content": "🏛️ Arquitectura Modular del Portal (Syllabus de 6 Módulos)" } }
                ]
            }
        },
        # Modules intro paragraph
        {
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [
                    { "text": { "content": "Cada módulo es una entidad responsiva e independiente con su respectivo modelo de datos. Expande cada sección para conocer los objetivos de desarrollo y requerimientos específicos de maquetación:" } }
                ]
            }
        },
        # Module 1 Toggle
        {
            "object": "block",
            "type": "toggle",
            "toggle": {
                "rich_text": [
                    { "text": { "content": "🏔️ Módulo 01: Turismo y Cultura" }, "annotations": { "bold": True } }
                ],
                "children": [
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [
                                {
                                    "text": {
                                        "content": "• Foco: Promocionar los atractivos naturales y la herencia histórico-cultural de San Roque.\n• Relevamiento: Balneario Municipal, costanera, Fiesta Patronal del 16 de Agosto, Carnavales, alojamientos (cabañas, hoteles) y gastronomía local.\n• Entregables Frontend: Grilla de atractivos responsiva, perfiles de prestadores con botón directo de reserva vía WhatsApp, y timeline visual de eventos culturales."
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        },
        # Module 2 Toggle
        {
            "object": "block",
            "type": "toggle",
            "toggle": {
                "rich_text": [
                    { "text": { "content": "🏛️ Módulo 02: Dependencia Municipal" }, "annotations": { "bold": True } }
                ],
                "children": [
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [
                                {
                                    "text": {
                                        "content": "• Foco: Digitalizar y organizar el directorio institucional del gobierno local.\n• Relevamiento: Áreas y Secretarías (Intendencia, Obras Públicas, Salud, etc.), nombres de responsables oficiales, horarios de atención al público y canales directos de contacto.\n• Entregables Frontend: Organigrama jerárquico interactivo con buscador en tiempo real y cartillas informativas autogestionadas para trámites ciudadanos."
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        },
        # Module 3 Toggle
        {
            "object": "block",
            "type": "toggle",
            "toggle": {
                "rich_text": [
                    { "text": { "content": "⚽ Módulo 03: Deportes" }, "annotations": { "bold": True } }
                ],
                "children": [
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [
                                {
                                    "text": {
                                        "content": "• Foco: Impulsar la actividad física, clubes de la ciudad y el uso compartido de la infraestructura.\n• Relevamiento: Clubes locales (Defensores, San Roque), torneos de fútbol y futsal local, cronograma de escuelas deportivas y reservas del Polideportivo.\n• Entregables Frontend: Grilla interactiva de fixtures/tablas de posiciones y sistema integrado de consulta de turnos y disponibilidad de canchas públicas."
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        },
        # Module 4 Toggle
        {
            "object": "block",
            "type": "toggle",
            "toggle": {
                "rich_text": [
                    { "text": { "content": "♻️ Módulo 04: Servicios a la Comunidad" }, "annotations": { "bold": True } }
                ],
                "children": [
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [
                                {
                                    "text": {
                                        "content": "• Foco: Facilitar información de servicios esenciales diarios del ciudadano.\n• Relevamiento: Recorrido y horarios de la Recolección de Residuos por barrio, directorio telefónico de remiserías y cronograma de colectivos interurbanos.\n• Entregables Frontend: Mapa descriptivo visual para recolección de residuos, buscador dinámico de transporte por destino y botonera telefónica para remises."
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        },
        # Module 5 Toggle
        {
            "object": "block",
            "type": "toggle",
            "toggle": {
                "rich_text": [
                    { "text": { "content": "⛪ Módulo 05: Culto y Religión" }, "annotations": { "bold": True } }
                ],
                "children": [
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [
                                {
                                    "text": {
                                        "content": "• Foco: Centralizar las actividades religiosas y comunitarias del municipio.\n• Relevamiento: Parroquia San Roque de Montpellier, capillas barriales, horarios de misas y cronograma de la Novena de San Roque.\n• Entregables Frontend: Buscador interactivo de misas por capilla y día de la semana, e historia ilustrada del templo principal de la ciudad."
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        },
        # Module 6 Toggle
        {
            "object": "block",
            "type": "toggle",
            "toggle": {
                "rich_text": [
                    { "text": { "content": "🛍️ Módulo 06: Emprendedores Locales" }, "annotations": { "bold": True } }
                ],
                "children": [
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [
                                {
                                    "text": {
                                        "content": "• Foco: Impulsar y reactivar el comercio, artesanos e independientes locales.\n• Relevamiento: Registro de productores, artesanos, reposteros y pequeños comercios con fotos de productos y datos de contacto.\n• Entregables Frontend: Showcase interactivo filtrable por categoría comercial con botones de compra directa por WhatsApp."
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        },
        # Divider
        {
            "object": "block",
            "type": "divider",
            "divider": {}
        },
        # Operations Workflow Heading
        {
            "object": "block",
            "type": "heading_2",
            "heading_2": {
                "rich_text": [
                    { "text": { "content": "🔄 Flujo Operativo y Metodología Diaria" } }
                ]
            }
        },
        # Workflow Steps
        {
            "object": "block",
            "type": "numbered_list_item",
            "numbered_list_item": {
                "rich_text": [
                    { "text": { "content": "Revisa tus asignaciones en el " }, "annotations": { "italic": True } },
                    { "text": { "content": "Tablero de Gestión (Backlog)" }, "annotations": { "bold": True } },
                    { "text": { "content": " que se encuentra al final de esta página, y mueve la tarea correspondiente a " }, "annotations": { "italic": True } },
                    { "text": { "content": "En Progreso" }, "annotations": { "bold": True, "color": "orange" } }
                ]
            }
        },
        {
            "object": "block",
            "type": "numbered_list_item",
            "numbered_list_item": {
                "rich_text": [
                    { "text": { "content": "Sincroniza tu entorno local ejecutando " } },
                    { "text": { "content": "git pull origin main" }, "annotations": { "code": True } },
                    { "text": { "content": " antes de comenzar a escribir código." } }
                ]
            }
        },
        {
            "object": "block",
            "type": "numbered_list_item",
            "numbered_list_item": {
                "rich_text": [
                    { "text": { "content": "Escribe código nativo y responsivo utilizando exclusivamente " } },
                    { "text": { "content": "HTML5 semántico" }, "annotations": { "bold": True } },
                    { "text": { "content": ", " } },
                    { "text": { "content": "CSS3 Vanilla" }, "annotations": { "bold": True } },
                    { "text": { "content": " y " } },
                    { "text": { "content": "JavaScript nativo (ES6+)" }, "annotations": { "bold": True } },
                    { "text": { "content": " sin añadir frameworks." } }
                ]
            }
        },
        {
            "object": "block",
            "type": "numbered_list_item",
            "numbered_list_item": {
                "rich_text": [
                    { "text": { "content": "Guarda localmente y sube tus cambios ejecutando: " } },
                    { "text": { "content": "git add . -> git commit -m \"style/feat: ...\" -> git push origin main" }, "annotations": { "code": True } }
                ]
            }
        },
        {
            "object": "block",
            "type": "numbered_list_item",
            "numbered_list_item": {
                "rich_text": [
                    { "text": { "content": "Verifica el despliegue automático en tiempo real en la URL en vivo de " } },
                    { "text": { "content": "Netlify" }, "annotations": { "bold": True, "color": "blue" } }
                ]
            }
        },
        {
            "object": "block",
            "type": "numbered_list_item",
            "numbered_list_item": {
                "rich_text": [
                    { "text": { "content": "Marca tu tarea como " } },
                    { "text": { "content": "Finalizado" }, "annotations": { "bold": True, "color": "green" } },
                    { "text": { "content": " en Notion una vez validado su correcto funcionamiento." } }
                ]
            }
        },
        # Divider
        {
            "object": "block",
            "type": "divider",
            "divider": {}
        },
        # Backlog Heading
        {
            "object": "block",
            "type": "heading_2",
            "heading_2": {
                "rich_text": [
                    { "text": { "content": "📋 Tablero de Gestión y Backlog del Proyecto" } }
                ]
            }
        }
    ]
    
    call_notion_api(f"blocks/{page_id}/children", method="PATCH", data={ "children": rich_blocks })
    print("[OK] Rich visual layout successfully appended to page.")
    
    # 4. Re-create the Tasks Database at the bottom of the page
    print("4. Creating fresh Backlog Database at the end of the page...")
    db_data = {
        "parent": { "page_id": page_id },
        "title": [
            {
                "type": "text",
                "text": { "content": "Tablero de Gestión (Backlog) 📋" }
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
                        { "name": "🌲 M01: Turismo & Cultura", "color": "green" },
                        { "name": "🏛️ M02: Dependencia Municipal", "color": "blue" },
                        { "name": "⚽ M03: Deportes", "color": "orange" },
                        { "name": "📋 M04: Servicios a la Comunidad", "color": "purple" },
                        { "name": "⛪ M05: Culto y Religión", "color": "pink" },
                        { "name": "🛍️ M06: Emprendedores Locales", "color": "brown" },
                        { "name": "⚙️ Configuración / Base", "color": "gray" }
                    ]
                }
            }
        }
    }
    
    new_db = call_notion_api("databases", method="POST", data=db_data)
    new_db_id = new_db["id"]
    print(f"[OK] New database created. ID: {new_db_id}")
    
    # 5. Populate standard 12 modular backlog tasks into the new database
    print("5. Populating standard backlog tasks into database...")
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
                    "select": { "name": "Por Hacer" }
                },
                "Módulo": {
                    "select": { "name": t_module }
                }
            }
        }
        call_notion_api("pages", method="POST", data=task_page_data)
        print(f"[OK] Task added: '{t_name}'")
        time.sleep(0.3) # Rate limit friendly
        
    print("\n=======================================================")
    print("SUCCESS: RICH NOTION WORKSPACE UPGRADED SUCCESSFULLY!")
    print("=======================================================")

if __name__ == "__main__":
    main()
