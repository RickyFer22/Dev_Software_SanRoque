/* Asistente MuniAyuda: datos útiles, respuestas locales y tarjetas del chat.
   Se carga después de app.js (comparten el ámbito global). */
// ═══ DATOS ÚTILES E INFO CHATBOT ═══
const datosUtilesInfo = {
    remises:{
        titulo:"🚖 Remises",
        descripcion:"Servicio de remises disponibles en toda la ciudad. Te buscan donde estés.",
        contactos:[
            {nombre:"Remis choro", tel:"3777721215"},
            {nombre:"Romero ale", tel:"3777476810"},
            {nombre:"BALDOVINO", tel:"3777-711144"},
            {nombre:"PAULO", tel:"1130251880"},
            {nombre:"TELLO REMIS", tel:"3777446545"},
            {nombre:"TU REMIS", tel:"3777697065"},
            {nombre:"FONTANA", tel:"37775202117"},
            {nombre:"REMIS", tel:"37778207866"}
        ]
    },

    terminal:{
        titulo:"🚌 Terminal de Ómnibus",
        descripcion:"Terminal de colectivos de San Roque con conexiones a Corrientes Capital, Goya, Buenos Aires y toda la región.",
        ubicacion:"https://www.google.com/maps/search/?api=1&query=-28.5767789,-58.7135694",
        horarios:"Boleterías de 06:00 a 23:00 hs",
        empresas:[
            "Rápido Tata",
            "Río Uruguay",
            "El Pulqui",
            "Silvia",
            "Empresa Itatí / Ersa"
        ]
    },

    municipio:{
        titulo:"🏛️ Municipalidad",
        descripcion:"Atención al ciudadano, trámites oficiales y dependencias municipales.",
        ubicacion:"https://www.google.com/maps/search/?api=1&query=-28.57680756168794,-58.708982356874806",
        horarios:"Lunes a Viernes de 07:00 a 13:00 hs",
        lugares:[
            { nombre:"Palacio Municipal (Sede Central)", link:"https://www.google.com/maps/search/?api=1&query=-28.57680756168794,-58.708982356874806" },
            { nombre:"C.I.C Centro Integrador Comunitario", link:"https://www.google.com/maps/search/?api=1&query=-28.575522578502625,-58.70431666637905" },
            { nombre:"Oficina de Turismo y Cultura", link:"https://www.google.com/maps/search/?api=1&query=-28.57098181276159,-58.71209180928368" }
        ]
    },

    iglesias:{
        titulo:"⛪ Iglesias",
        descripcion:"Templos religiosos y patrimonio histórico de San Roque.",
        lugares:[
            {
                nombre:"Parroquia San Roque de Montpellier",
                link:"https://www.google.com/maps/search/?api=1&query=-28.571590353744543,-58.711252302690546"
            },
            {
                nombre:"Capilla Histórica (Templo Viejo - 1783)",
                link:"https://www.google.com/maps/search/?api=1&query=-28.57098181276159,-58.71209180928368"
            },
            {
                nombre:"Iglesia Monte de Sion",
                link:"https://www.google.com/maps/search/?api=1&query=-28.575815684105844,-58.707426283145196"
            },
            {
                nombre:"Templo Filadelfia de San Roque",
                link:"https://www.google.com/maps/search/?api=1&query=-28.57730954160022,-58.70606541439768"
            },
            {
                nombre:"Salón del Reino de los Testigos de Jehová",
                link:"https://www.google.com/maps/search/?api=1&query=-28.577110361826733,-58.70697266022936"
            },
            {
                nombre:"Iglesia Evangélica Asamblea de Dios",
                link:"https://www.google.com/maps/search/?api=1&query=-28.580856838882077,-58.718072982275054"
            }
        ]
    },

    emergencias:{
        titulo:"🚨 Emergencias",
        descripcion:"Servicios de urgencia y seguridad disponibles 24 hs en San Roque.",
        contactos:[
            { nombre:"Comisaría San Roque", tel:"03772-123456", emergencia:"101", ubicacion:"https://www.google.com/maps/search/?api=1&query=-28.569921140360318,-58.71262131369322" },
            { nombre:"Bomberos Voluntarios San Roque", tel:"100", emergencia:"100", ubicacion:"https://www.google.com/maps/search/?api=1&query=-28.577904318277724,-58.713826053599384" },
            { nombre:"Hospital San Roque (Guardia Médica)", tel:"(03783) 123-456", emergencia:"107", ubicacion:"https://www.google.com/maps/search/?api=1&query=-28.577215169382498,-58.711315397535905" },
            { nombre:"Policía Rural (PRIAR)", tel:"101", ubicacion:"https://www.google.com/maps/search/?api=1&query=-28.567397145178468,-58.70263241554249" },
            { nombre:"Defensa Civil", tel:"103" }
        ],
        lugares:[
            {
                nombre:"Policía de San Roque",
                link:"https://www.google.com/maps/search/?api=1&query=-28.570089924920314,-58.712608217644515"
            },
            {
                nombre:"Hospital de San Roque",
                link:"https://www.google.com/maps/search/?api=1&query=-28.577551339214832,-58.711226434897526"
            },
            {
                nombre:"Bomberos San Roque",
                link:"https://www.google.com/maps/search/?api=1&query=-28.577904318277724,-58.713826053599384"
            }
        ]
    },

    salud:{
        titulo:"🏥 Salud",
        descripcion:"Hospital público, guardias y farmacias de turno en San Roque.",
        lugares:[
            {
                nombre:"Hospital de San Roque (Guardia Médica 24 hs)",
                link:"https://www.google.com/maps/search/?api=1&query=-28.577215169382498,-58.711315397535905"
            },
            {
                nombre:"Farmar IV",
                link:"https://www.google.com/maps/search/?api=1&query=-28.57564523967805,-58.7115423787572"
            },
            {
                nombre:"Farmacia Itatí S.C.S",
                link:"https://www.google.com/maps/search/?api=1&query=-28.57490350407002,-58.70936387230284"
            },
            {
                nombre:"Farmacia Tressens II",
                link:"https://www.google.com/maps/search/?api=1&query=-28.575223851034433,-58.70882743052239"
            },
            {
                nombre:"Farmacia San Roque",
                link:"https://www.google.com/maps/search/?api=1&query=-28.57708938162111,-58.711638385451934"
            },
            {
                nombre:"Centro de Salud Comunitario CIC",
                link:"https://www.google.com/maps/search/?api=1&query=-28.575522578502625,-58.70431666637905"
            }
        ]
    },

    servicios:{
        titulo:"🏧 Servicios",
        descripcion:"Bancos, cajeros, trámites y servicios útiles para visitantes.",
        contactos:[
            {nombre:"Remis choro", tel:"3777721215"},
            {nombre:"Romero ale", tel:"3777476810"},
            {nombre:"BALDOVINO", tel:"3777-711144"},
            {nombre:"PAULO", tel:"1130251880"},
            {nombre:"TELLO REMIS", tel:"3777446545"},
            {nombre:"TU REMIS", tel:"3777697065"},
            {nombre:"FONTANA", tel:"37775202117"},
            {nombre:"REMIS", tel:"37778207866"}
        ],
        lugares:[
            {
                nombre:"Banco de Corrientes (Sucursal y Cajeros 24 hs)",
                link:"https://www.google.com/maps/search/?api=1&query=-28.57573154360633,-58.708639876601616"
            },
            {
                nombre:"Municipalidad de San Roque",
                link:"https://www.google.com/maps/search/?api=1&query=-28.57680756168794,-58.708982356874806"
            },
            {
                nombre:"C.I.C extensión del municipio",
                link:"https://www.google.com/maps/search/?api=1&query=-28.575522578502625,-58.70431666637905"
            },
            {
                nombre:"Registro Civil",
                link:"https://www.google.com/maps/search/?api=1&query=-28.576534179577525,-58.70901613864172"
            }
        ]
    },

    "talleres-repuesteras":{
        titulo:"🔧 Talleres / Repuesteras",
        descripcion:"Talleres mecánicos, auxilio de gomería 24 hs y comercios de repuestos.",
        lugares:[
            {
                nombre:"Taller Mecánico y Auxilio en Ruta",
                link:"https://www.google.com/maps/search/?api=1&query=-28.5750,-58.7120"
            },
            {
                nombre:"Gomería y Vulcanización 24 hs",
                link:"https://www.google.com/maps/search/?api=1&query=-28.5740,-58.7100"
            },
            {
                nombre:"Repuestera San Roque (Autos y Camionetas)",
                link:"https://www.google.com/maps/search/?api=1&query=-28.5760,-58.7090"
            },
            {
                nombre:"Taller de Motos y Repuestos",
                link:"https://www.google.com/maps/search/?api=1&query=-28.5730,-58.7080"
            }
        ]
    },

    "estacion-servicios":{
        titulo:"⛽ Estación de servicios",
        descripcion:"Estaciones de combustible, lubricentro, servicompras 24 hs y asistencia al viajero.",
        ubicacion:"https://www.google.com/maps/search/?api=1&query=-28.572337,-58.714552",
        horarios:"Atención las 24 hs todos los días",
        lugares:[
            {
                nombre:"Estación de Servicio YPF San Roque",
                link:"https://www.google.com/maps/search/?api=1&query=-28.572337,-58.714552"
            },
            {
                nombre:"Tienda Servicompras & Cafetería 24 hs",
                link:"https://www.google.com/maps/search/?api=1&query=-28.572337,-58.714552"
            },
            {
                nombre:"Servicio de Aire, Agua y Lubricentro",
                link:"https://www.google.com/maps/search/?api=1&query=-28.572337,-58.714552"
            }
        ]
    },

    "registro-civil":{
        titulo:"🪪 Registro Civil",
        descripcion:"Delegación San Roque del Registro Provincial de las Personas. DNI, actas y trámites.",
        ubicacion:"https://www.google.com/maps/search/?api=1&query=-28.576534179577525,-58.70901613864172",
        horarios:"Lunes a Viernes de 07:00 a 13:00 hs",
        lugares:[
            {
                nombre:"Registro Provincial de las Personas - San Roque",
                link:"https://www.google.com/maps/search/?api=1&query=-28.576534179577525,-58.70901613864172"
            }
        ]
    },

    turismo:{
        titulo:"📍 Lugares turísticos",
        descripcion:"Puntos importantes de San Roque.",
        lugares:[
            {
                nombre:"Plaza Principal Libertad",
                link:"https://www.google.com/maps/search/?api=1&query=-28.57098181276159,-58.71209180928368"
            },
            {
                nombre:"Museo de San Roque",
                link:"https://www.google.com/maps/search/?api=1&query=-28.57098181276159,-58.71209180928368"
            }
        ]
    }
};
window.datosUtilesInfo = datosUtilesInfo;

const BOT_API = (window.location.protocol === 'file:')
    ? 'http://127.0.0.1:4000/api/bot/chat'
    : '/api/bot/chat';
window.BOT_API = BOT_API;
let chatOpen = false;

const chatToggleBtn = document.getElementById("chatToggle");

chatToggleBtn.onclick = () => {
    chatOpen = !chatOpen;
    if (chatOpen && window.VsrTrack) VsrTrack.click('chatbot', 'abierto');
    document.getElementById("chatWindow").style.display = chatOpen ? "flex" : "none";
    chatToggleBtn.setAttribute("aria-expanded", String(chatOpen));

    // Animación de click: el botón nunca se oculta, solo se anima
    chatToggleBtn.classList.remove("clicked");
    void chatToggleBtn.offsetWidth; // fuerza reinicio de la animación
    chatToggleBtn.classList.add("clicked");
};

chatToggleBtn.addEventListener("animationend", () => {
    chatToggleBtn.classList.remove("clicked");
});

// Minimizar el asistente: botón ✕ del encabezado y tecla Escape.
function closeChatWindow() {
    chatOpen = false;
    const win = document.getElementById("chatWindow");
    if (win) win.style.display = "none";
    chatToggleBtn.setAttribute("aria-expanded", "false");
}
document.querySelectorAll("[data-chat-close]").forEach((btn) => btn.addEventListener("click", closeChatWindow));
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && chatOpen) closeChatWindow(); });

// Escucha de clicks en los botones de Datos Útiles
document.querySelectorAll('#lista-datos-utiles a').forEach(btn => {
    btn.addEventListener('click', function(e){
        e.preventDefault();
        chatOpen = true;
        document.getElementById("chatWindow").style.display = "flex";
        quickAsk(this.innerText.trim());
    });
});

function quickAsk(text){
    document.getElementById("chatInput").value = text;
    sendChat();
}

function detectDatosUtilesCategoryFromText(text){
  if(!text) return null;
  const t = String(text).toLowerCase();
  if(/polic|comisar|comisaria|policia/.test(t)) return 'emergencias';
  if(/hospital|salud|clinica/.test(t)) return 'emergencias';
  if(/remis|taxi|traslado|chofer|auto/.test(t)) return 'remises';
  if(/municipio|intendencia|municipalidad/.test(t)) return 'municipio';
  if(/banco|cajero|corrientes/.test(t)) return 'servicios';
  if(/terminal|colectivo|ómnibus|omnibus/.test(t)) return 'terminal';
  return null;
}

function escapeHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function sanitizeBotHtml(text) {
    // Texto plano con un mínimo de formato: **negrita**, viñetas y saltos de línea.
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
        .replace(/(^|\n)\s*[*-]\s+/g, '$1• ')
        .replace(/(^|\n)#+\s*/g, '$1')
        .replace(/&lt;b&gt;/g, '<b>')
        .replace(/&lt;\/b&gt;/g, '</b>')
        .replace(/&lt;br&gt;/g, '<br>');
}

function answerLocally(message) {
    const text = String(message || '').toLowerCase();
    if (/\b(fiesta patronal|fiestas patronales|patronal)\b/.test(text)) {
        return {
            reply: 'La Fiesta Patronal de San Roque se celebra el 16 de agosto de 2026 en la Parroquia San Roque de Montpellier. Habrá misa solemne, procesión y actividades culturales.',
            category: 'eventos'
        };
    }
    if (/\b(historia|cu[eé]ntame sobre la historia|origen de san roque|cómo nació san roque|cómo se fund[oó])\b/.test(text)) {
        return {
            reply: 'La historia de San Roque forma parte de su identidad como ciudad correntina. El portal municipal documenta su patrimonio, la tradición religiosa y el valor turístico de su comunidad.',
            category: 'general'
        };
    }
    if (/\b(remis|remises|taxi|taxis|traslado|traslados|transporte|chofer|choferes)\b/.test(text)) {
        const fromRem = datosUtilesInfo.remises?.contactos || datosUtilesInfo.remises?.contenido?.contactos || [];
        const fromServ = datosUtilesInfo.servicios?.contactos || datosUtilesInfo.servicios?.contenido?.contactos || [];
        const combined = [...fromRem, ...fromServ];
        const seen = new Set();
        const contacts = [];
        combined.forEach(c => {
          const key = `${(c.nombre || '').trim().toLowerCase()}|${String(c.tel || '').replace(/\D/g, '')}`;
          if (!seen.has(key) && (c.nombre || c.tel)) {
            seen.add(key);
            contacts.push(c);
          }
        });
        const lines = contacts.map(c => `• ${c.nombre}: ${c.tel}`);
        return { reply: `Estos son los remises oficiales de San Roque:\n${lines.join('\n')}`, category: 'remises' };
    }
    if (/\b(comer|gastronom|restaurant|comedor|comida|sabores|restaurante)\b/.test(text)) {
        return { reply: 'Acá están las opciones gastronómicas disponibles en San Roque.', category: 'gastronomia' };
    }
    if (/\b(aloj|hotel|hospedaje|dormir|quedarse|estad[ií]a|estancia)\b/.test(text)) {
        return { reply: 'Estos son los alojamientos disponibles en San Roque.', category: 'alojamientos' };
    }
    if (/\b(evento|agenda|actividad|show|concierto|feria)\b/.test(text)) {
        return { reply: 'Estos son los próximos eventos publicados en San Roque.', category: 'eventos' };
    }
    const duMatch = text.match(/\b(terminal|municipio|iglesia|iglesias|emergencia|emergencias|salud|servicio|servicios|remis|remises|municipio|banco)\b/);
    if (duMatch) {
      // return specific category so sendChat can render datos útiles
      const key = duMatch[1];
      // normalize some plural forms
      if (key === 'iglesias') return { reply: 'Te paso información de las iglesias y templos de San Roque.', category: 'iglesias' };
      if (key === 'emergencia' || key === 'emergencias') return { reply: 'Te paso información de servicios de emergencias en San Roque.', category: 'emergencias' };
      if (key === 'remis' || key === 'remises') return { reply: 'Te comparto los remises oficiales de San Roque.', category: 'remises' };
      if (key === 'banco' || key === 'servicio' || key === 'servicios') return { reply: 'Te paso información de servicios oficiales y datos útiles de San Roque.', category: 'servicios' };
      return { reply: 'Te paso información de servicios oficiales y datos útiles de San Roque.', category: key };
    }
    return { reply: 'Soy el asistente turístico de San Roque. Puedo ayudarte con alojamientos, gastronomía, eventos y datos útiles oficiales.', category: 'general' };
}

function addMsg(text, user=false, options={html:false}){
    const box = document.getElementById("chatBox");
    const div = document.createElement("div");

    div.style.margin = "10px 0";
    div.style.padding = "12px";
    div.style.borderRadius = "14px";
    div.style.maxWidth = "85%";
    div.style.wordBreak = "break-word";
    div.style.whiteSpace = "pre-wrap";

    if(user){
        div.style.marginLeft = "auto";
        div.style.background = "#003633";
        div.style.color = "white";
        div.style.borderBottomRightRadius = "2px";
        div.textContent = text;
    } else {
        div.style.background = "white";
        div.style.color = "#333";
        div.style.borderBottomLeftRadius = "2px";
        div.style.boxShadow = "0 2px 5px rgba(0,0,0,0.05)";
        if (options.html) {
            div.classList.add('bot-with-cards');
            div.innerHTML = text;
        } else {
            div.innerHTML = sanitizeBotHtml(text);
        }
    }

    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

function showTyping(){
    const box = document.getElementById("chatBox");
    const div = document.createElement("div");
    div.id = "typing";
    div.innerHTML = `<div class="typing"><span></span><span></span><span></span></div>`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

function hideTyping(){
    const t = document.getElementById("typing");
    if(t) t.remove();
}

function responderDatosUtiles(tipo) {
  const item = datosUtilesInfo[tipo] || (tipo === 'remises' ? datosUtilesInfo.servicios : null);
  if(!item) return;
  const content = item.contenido || item;

  let html = `<b>${item.titulo || content.titulo || (tipo === 'remises' ? '🚖 Remises disponibles' : '')}</b><br>`;
  html += `<p style="margin-top:4px; font-size:13px; color:#475569;">${item.descripcion || content.descripcion || (tipo === 'remises' ? 'Servicio de remises disponibles en toda la ciudad. Te buscan donde estés.' : '')}</p>`;

  if (content.ubicacion) {
    html += `<p style="margin-top:8px;"><a target="_blank" href="${content.ubicacion}" style="color:#134E4A; font-weight:bold; text-decoration:underline;">📍 Ver ubicación en mapa</a></p>`;
  }

  const lugares = (tipo !== 'remises') ? (content.lugares || []) : [];
  if (Array.isArray(lugares) && lugares.length) {
    html += `<ul style="margin-top:8px; padding-left:14px; list-style-type:disc; font-size:13px;">`;
    lugares.forEach(l => {
      const link = l.link || l.url || l.mapsLink || '';
      const label = l.nombre || l.titulo || l.label || '';
      if (link) html += `<li style="margin-top:4px;"><a target="_blank" href="${link}" style="color:#134E4A; font-weight:bold; text-decoration:underline;">${label}</a></li>`;
      else html += `<li style="margin-top:4px;">${label}</li>`;
    });
    html += `</ul>`;
  }

  let contactos = [];
  if (tipo === 'remises') {
    const fromRem = datosUtilesInfo.remises?.contactos || datosUtilesInfo.remises?.contenido?.contactos || [];
    const fromServ = datosUtilesInfo.servicios?.contactos || datosUtilesInfo.servicios?.contenido?.contactos || [];
    const combined = [...fromRem, ...fromServ];
    const seen = new Set();
    combined.forEach(c => {
      const key = `${(c.nombre || '').trim().toLowerCase()}|${String(c.tel || '').replace(/\D/g, '')}`;
      if (!seen.has(key) && (c.nombre || c.tel)) {
        seen.add(key);
        contactos.push(c);
      }
    });
  } else if (tipo !== 'servicios') {
    contactos = content.contactos || [];
  }

  if (tipo === 'servicios') {
    html += `<div style="margin-top:12px; padding-top:10px; border-top:1px solid #e2e8f0;">
      <button type="button" onclick="responderDatosUtiles('remises')" class="chat-card-button" style="display:inline-flex; align-items:center; gap:6px; cursor:pointer; background:#003633; color:white; padding:8px 14px; border-radius:8px; font-weight:bold; border:none; font-size:12px; text-decoration:none;">
        🚖 Ver remises con toda la lista
      </button>
    </div>`;
  }

  if (Array.isArray(contactos) && contactos.length) {
    html += `<div style="margin-top:8px; font-size:13px;"><b>Contactos de remises cargados:</b><ul style="padding-left:0; list-style-type:none; margin-top:4px;">`;
    contactos.forEach(c => {
      const rawTel = String(c.tel || c.telefono || c.phone || '');
      const tel = rawTel.replace(/\D/g,'');
      const wa = c.whatsapp || c.wa || c.waNumber || (tel ? buildWaLink(tel, `Hola! Quiero coordinar un viaje con ${c.nombre} desde el portal de San Roque.`) : '');
      const waUrl = (wa && String(wa).startsWith('http')) ? wa : (wa ? `https://wa.me/${String(wa).replace(/^\+/, '')}?text=${encodeURIComponent('Hola!')}` : '');
      html += `<li style="margin-top:6px; background:white; border:1px solid #e2e8f0; padding:6px 10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <div><strong>${escapeHtml(c.nombre || c.label || '')}</strong></div>
          <div style="display:flex; gap:6px; align-items:center;">
            ${waUrl ? `<a class="chat-card-button" href="${waUrl}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
            ${tel ? `<a href="tel:${tel}" style="background:#003633; color:white; padding:4px 8px; border-radius:6px; font-weight:bold; font-size:11px; text-decoration:none;">📞 ${rawTel || tel}</a>` : ''}
          </div>
        </li>`;
    });
    html += `</ul></div>`;
  }

  addMsg(html, false, { html: true });
}

function buildWaLink(rawNumber, text = 'Hola!') {
    const digits = String(rawNumber || '').replace(/[^\d+]/g, '');
    if (!digits) return '';
    const clean = digits.replace(/^\+/, '');
    return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

function renderChatCards(category) {
    const cardHeader = {
        remises: { title: 'Remises disponibles', subtitle: 'Contactos locales con WhatsApp directo' },
        alojamientos: { title: 'Alojamientos', subtitle: 'Consultá disponibilidad y detalles' },
        gastronomia: { title: 'Gastronomía recomendada', subtitle: 'Reservá o escribí por WhatsApp' },
    }[category];

    if (!cardHeader) return '';

    // If category is alojamientos, render a placeholder and hydrate it asynchronously
    if (category === 'alojamientos') {
      return `<div class="chat-card">
      <div class="chat-card-header">
        <div class="chat-card-title">${cardHeader.title}</div>
        <div class="chat-card-subtitle">${cardHeader.subtitle}</div>
      </div>
      <div class="chat-card-list"><div class="chat-card-placeholder" data-category="alojamientos"></div></div>
    </div>`;
    }

    // If category is gastronomia, render a placeholder and hydrate it asynchronously
    if (category === 'gastronomia') {
      return `<div class="chat-card">
      <div class="chat-card-header">
        <div class="chat-card-title">${cardHeader.title}</div>
        <div class="chat-card-subtitle">${cardHeader.subtitle}</div>
      </div>
      <div class="chat-card-list"><div class="chat-card-placeholder" data-category="gastronomia"></div></div>
    </div>`;
    }

    let remisesList = [];
    if (category === 'remises') {
      const fromRem = datosUtilesInfo.remises?.contactos || datosUtilesInfo.remises?.contenido?.contactos || [];
      const fromServ = datosUtilesInfo.servicios?.contactos || datosUtilesInfo.servicios?.contenido?.contactos || [];
      const combined = [...fromRem, ...fromServ];
      const seen = new Set();
      combined.forEach(c => {
        const key = `${(c.nombre || '').trim().toLowerCase()}|${String(c.tel || '').replace(/\D/g, '')}`;
        if (!seen.has(key) && (c.nombre || c.tel)) {
          seen.add(key);
          remisesList.push(c);
        }
      });
    }

    const items = category === 'remises'
        ? remisesList
        : category === 'alojamientos'
            ? Object.entries(alojamientosData || {}).filter(([, item]) => isLodging(item)).slice(0, 6).map(([id, item]) => ({ id, ...item }))
            : Array.isArray(window.gastronomiaData) ? window.gastronomiaData.slice(0, 6) : [];

    if (!items.length) return '';

    const rows = items.map((item) => {
        if (category === 'remises') {
            const name = escapeHtml(item.nombre || item.name || '');
            const tel = escapeHtml(item.tel || item.telefono || '');
            const wa = buildWaLink(item.tel || item.telefono, `Hola! Quiero coordinar un remis con ${item.nombre} desde el portal de San Roque.`);
            const telDigits = String(item.tel || item.telefono || '').replace(/\D/g, '');
            return `<div class="chat-card-item">
                <div class="chat-card-item-info">
                    <div class="chat-card-item-title">${name}</div>
                    <div class="chat-card-item-subtitle">${tel}</div>
                </div>
                <div class="chat-card-actions">
                    ${wa ? `<a class="chat-card-button" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
                    ${telDigits ? `<a class="chat-card-button" href="tel:${telDigits}" style="background:#003633; color:white;">Llamar</a>` : ''}
                </div>
            </div>`;
        }

        if (category === 'alojamientos') {
            const title = escapeHtml(item.titulo || '');
            const location = escapeHtml(item.ubicacion || 'San Roque');
            const wa = buildWaLink(item.waNumber || item.telefono, `Hola! Quiero consultar disponibilidad de ${item.titulo} en San Roque.`);
            return `<div class="chat-card-item">
                <div class="chat-card-item-info">
                    <div class="chat-card-item-title">${title}</div>
                    <div class="chat-card-item-subtitle">${location}</div>
                </div>
                <div class="chat-card-actions">
                    <button class="chat-card-button" type="button" onclick="navigateToDetails('${item.id}')">Ver detalle</button>
                    ${wa ? `<a class="chat-card-button" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
                </div>
            </div>`;
        }

        const name = escapeHtml(item.nombre || '');
        const location = escapeHtml(item.ubicacion || 'San Roque');
        const wa = buildWaLink(item.whatsapp || item.telefono, `Hola! Quiero consultar sobre ${item.nombre} en San Roque.`);
        return `<div class="chat-card-item">
            <div class="chat-card-item-info">
                <div class="chat-card-item-title">${name}</div>
                <div class="chat-card-item-subtitle">${location}</div>
            </div>
            <div class="chat-card-actions">
                ${wa ? `<a class="chat-card-button" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
            </div>
        </div>`;
    }).join('');

    return `<div class="chat-card">
        <div class="chat-card-header">
            <div class="chat-card-title">${cardHeader.title}</div>
            <div class="chat-card-subtitle">${cardHeader.subtitle}</div>
        </div>
        <div class="chat-card-list">${rows}</div>
    </div>`;
}

// Fetch alojamientos from API (/api/data) with graceful fallback to in-memory data
async function fetchAlojamientosFromApi() {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error('API no disponible');
    const json = await res.json();
    // API may return object with alojamientos map or array
    let alojamientos = [];
    if (Array.isArray(json.alojamientos)) alojamientos = json.alojamientos;
    else if (json.alojamientos && typeof json.alojamientos === 'object') alojamientos = Object.entries(json.alojamientos).map(([id, v]) => ({ id, ...v }));
    return alojamientos;
  } catch (err) {
    // fallback to global data if available
    try {
      if (window.alojamientosData) return Object.entries(window.alojamientosData).map(([id, v]) => ({ id, ...v }));
    } catch (e) {}
    return [];
  }
}

// Fetch gastronomia from API (/api/data) with graceful fallback to in-memory data
async function fetchGastronomiaFromApi() {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error('API no disponible');
    const json = await res.json();
    let gastronomia = [];
    if (Array.isArray(json.gastronomia)) gastronomia = json.gastronomia;
    return gastronomia;
  } catch (err) {
    try {
      if (Array.isArray(window.gastronomiaData)) return window.gastronomiaData;
    } catch (e) {}
    return [];
  }
}

function renderGastronomiaItem(item) {
  const title = escapeHtml(item.titulo || item.nombre || '');
  const location = escapeHtml(item.ubicacion || 'San Roque');
  const wa = buildWaLink(item.whatsapp || item.telefono || item.waNumber, `Hola! Quiero consultar sobre ${item.titulo || item.nombre} en San Roque.`);
  return `<div class="chat-card-item">
        <div class="chat-card-item-info">
          <div class="chat-card-item-title">${title}</div>
          <div class="chat-card-item-subtitle">${location}</div>
        </div>
        <div class="chat-card-actions">
          ${wa ? `<a class="chat-card-button" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
        </div>
      </div>`;
}

// Replace placeholder inside the last bot message with real gastronomia fetched from API
async function hydrateGastronomiaInMessage(messageDiv) {
  if (!messageDiv) return;
  const placeholder = messageDiv.querySelector('.chat-card-placeholder[data-category="gastronomia"]');
  if (!placeholder) return;
  const items = await fetchGastronomiaFromApi();
  const list = (items || []).slice(0, 8).map(renderGastronomiaItem).join('');
  const wrapper = document.createElement('div');
  wrapper.className = 'chat-card';
  wrapper.innerHTML = `<div class="chat-card-header"><div class="chat-card-title">Gastronomía</div><div class="chat-card-subtitle">Reservá o escribí por WhatsApp</div></div><div class="chat-card-list">${list}</div>`;
  placeholder.replaceWith(wrapper.querySelector('.chat-card-list'));
}

function renderAlojamientoItem(item) {
  const title = escapeHtml(item.titulo || item.nombre || '');
  const location = escapeHtml(item.ubicacion || 'San Roque');
  const wa = buildWaLink(item.waNumber || item.telefono || item.whatsapp, `Hola! Quiero consultar disponibilidad de ${item.titulo || item.nombre} en San Roque.`);
  return `<div class="chat-card-item">
        <div class="chat-card-item-info">
          <div class="chat-card-item-title">${title}</div>
          <div class="chat-card-item-subtitle">${location}</div>
        </div>
        <div class="chat-card-actions">
          <button class="chat-card-button" type="button" onclick="navigateToDetails('${item.id}')">Ver detalle</button>
          ${wa ? `<a class="chat-card-button" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
        </div>
      </div>`;
}

// Replace placeholder inside the last bot message with real alojamientos fetched from API
async function hydrateAlojamientosInMessage(messageDiv) {
  if (!messageDiv) return;
  const placeholder = messageDiv.querySelector('.chat-card-placeholder');
  if (!placeholder) return;
  const items = await fetchAlojamientosFromApi();
  const list = (items || []).slice(0, 8).map(renderAlojamientoItem).join('');
  const wrapper = document.createElement('div');
  wrapper.className = 'chat-card';
  wrapper.innerHTML = `<div class="chat-card-header"><div class="chat-card-title">Alojamientos</div><div class="chat-card-subtitle">Consultá disponibilidad y detalles</div></div><div class="chat-card-list">${list}</div>`;
  placeholder.replaceWith(wrapper.querySelector('.chat-card-list'));
}

const CHAT_API_URL = window.BOT_API || '/api/bot/chat';

async function sendChat(){
    const input = document.getElementById("chatInput");
    const text = input.value.trim();
    if(!text) return;

    addMsg(text, true);
    input.value = "";
    showTyping();

    const localResponse = answerLocally(text);

    try {
        const response = await fetch(CHAT_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: text })
        });

        const data = await response.json();
        hideTyping();

        const botResponse = data.reply || data.response || data.message || localResponse.reply || "Respuesta recibida";
        const category = data.category || localResponse.category || 'general';
        // If user asked about datos útiles (policía/hospital/municipio/banco), prefer structured datosUtiles
        const duFromText = detectDatosUtilesCategoryFromText(text);
        if (duFromText && datosUtilesInfo && datosUtilesInfo[duFromText]) {
          responderDatosUtiles(duFromText);
          hideTyping();
          return;
        }
        const safeBotResponse = sanitizeBotHtml(botResponse);
        // If it's a datos utiles category, render the detailed block with map/phone
        if (datosUtilesInfo && datosUtilesInfo[category]) {
          // For datos útiles we render the structured block only (avoid duplicate titles)
          responderDatosUtiles(category);
        } else {
          const cards = renderChatCards(category);
          if (cards) {
            addMsg(`${safeBotResponse}<br>${cards}`, false, { html: true });
            if (category === 'alojamientos') {
              const box = document.getElementById('chatBox');
              const last = box && box.lastElementChild;
              hydrateAlojamientosInMessage(last).catch(() => {});
            } else if (category === 'gastronomia') {
              const box = document.getElementById('chatBox');
              const last = box && box.lastElementChild;
              hydrateGastronomiaInMessage(last).catch(() => {});
            }
          } else {
            addMsg(safeBotResponse);
          }
        }

    } catch (error) {
        console.error("Error al conectar con la API:", error);
        hideTyping();

        if (localResponse) {
            const safeBotResponse = sanitizeBotHtml(localResponse.reply);
            // If localResponse maps to datos utiles, render that detailed block
            if (datosUtilesInfo && datosUtilesInfo[localResponse.category]) {
              // Avoid duplicating the textual title; render structured block only
              responderDatosUtiles(localResponse.category);
            } else {
                const cards = renderChatCards(localResponse.category);
                if (cards) {
                    addMsg(`${safeBotResponse}<br>${cards}`, false, { html: true });
                    if (localResponse.category === 'alojamientos') {
                      const box = document.getElementById('chatBox');
                      const last = box && box.lastElementChild;
                      hydrateAlojamientosInMessage(last).catch(() => {});
                    } else if (localResponse.category === 'gastronomia') {
                      const box = document.getElementById('chatBox');
                      const last = box && box.lastElementChild;
                      hydrateGastronomiaInMessage(last).catch(() => {});
                    }
                } else {
                    addMsg(safeBotResponse);
                }
            }
        } else {
            addMsg("⚠️ Lo siento, tuve un problema de conexión con el servidor.");
        }
    }
}

// Mensaje inicial del bot
setTimeout(() => {
    addMsg(`👋 <b>¡Hola! Soy MuniAyuda.</b><br>Consultame por alojamientos, dónde comer, eventos, lugares para visitar, servicios o emergencias.`);
}, 1000);
