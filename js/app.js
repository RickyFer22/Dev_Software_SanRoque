let map;
const mapMarkers = {};
function initMap() {
  map = L.map('main-map').setView([-28.5744,-58.7083],15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
  for(const [id,data] of Object.entries(alojamientosData)) {
    if(data.coords) {
      const marker = L.marker(data.coords).addTo(map);
      marker.bindPopup(`<div class="text-center min-w-[160px] p-1"><img src="${data.mainImg}" class="w-full h-24 object-cover rounded-xl mb-3 shadow-sm"/><h3 class="font-bold text-primary text-[15px] leading-tight mb-1">${data.titulo}</h3><div class="text-golden-sand text-[11px] mb-3 font-bold">★ ${data.rating}</div><button onclick="navigateToDetails('${id}')" class="bg-river-teal text-white text-xs px-4 py-2 rounded-full font-bold w-full hover:bg-primary transition-colors">VER DETALLE</button></div>`);
      mapMarkers[id] = {marker,category:data.categoria};
    }
  }
}

function renderStars(ratingStr) {
  const rating = parseFloat(ratingStr); let html='';
  for(let i=1;i<=5;i++){
    if(rating>=i) html+='<span class="material-symbols-outlined filled text-[20px]">star</span>';
    else if(rating>=i-0.5) html+='<span class="material-symbols-outlined filled text-[20px]">star_half</span>';
    else html+='<span class="material-symbols-outlined text-[20px] text-neutral-300">star</span>';
  } return html;
}

// ═══ VOTING ═══
function initVotingForContainer(container) {
  const accId = container.getAttribute('data-id'); if(!accId) return;
  const savedVotes = JSON.parse(localStorage.getItem('userVotes')||'{}');
  const stars = container.querySelectorAll('.star-btn');
  const label = container.querySelector('.vote-label');
  container.classList.remove('pointer-events-none','bg-teal-50','border-teal-200');
  if(label){label.textContent='Votar';label.classList.remove('text-river-teal');label.classList.add('text-neutral-500');}
  stars.forEach(s=>s.querySelector('span').className='material-symbols-outlined text-[16px] md:text-[22px] text-neutral-300 transition-colors');
  const lockVote=(val)=>{
    container.classList.add('pointer-events-none','bg-teal-50','border-teal-200');
    if(label){label.textContent='¡Votado!';label.classList.replace('text-neutral-500','text-river-teal');}
    stars.forEach((s,i)=>{const icon=s.querySelector('span');if(i<val){icon.classList.add('filled','text-golden-sand');icon.classList.remove('text-neutral-300');}else{icon.classList.remove('filled','text-golden-sand');icon.classList.add('text-neutral-300');}});
  };
  if(savedVotes[accId]){lockVote(savedVotes[accId]);return;}
  if(container.dataset.listenerAttached) return;
  container.dataset.listenerAttached='true';
  stars.forEach((star,index)=>{
    star.addEventListener('mouseover',()=>{if(JSON.parse(localStorage.getItem('userVotes')||'{}')[accId]) return;stars.forEach((s,i)=>{const icon=s.querySelector('span');if(i<=index){icon.classList.add('filled','text-golden-sand');icon.classList.remove('text-neutral-300');}else{icon.classList.remove('filled','text-golden-sand');icon.classList.add('text-neutral-300');}});});
    star.addEventListener('mouseout',()=>{if(JSON.parse(localStorage.getItem('userVotes')||'{}')[accId]) return;stars.forEach(s=>{const icon=s.querySelector('span');icon.classList.remove('filled','text-golden-sand');icon.classList.add('text-neutral-300');});});
    star.addEventListener('click',(e)=>{e.stopPropagation();const cv=JSON.parse(localStorage.getItem('userVotes')||'{}');if(cv[accId]) return;const val=index+1;cv[accId]=val;localStorage.setItem('userVotes',JSON.stringify(cv));document.querySelectorAll(`.interactive-stars[data-id="${accId}"]`).forEach(c=>{const l=c.querySelector('.vote-label');c.classList.add('pointer-events-none','bg-teal-50','border-teal-200');if(l){l.textContent='¡Votado!';l.classList.replace('text-neutral-500','text-river-teal');}c.querySelectorAll('.star-btn span').forEach((icon,i)=>{if(i<val){icon.classList.add('filled','text-golden-sand');icon.classList.remove('text-neutral-300');icon.style.transform='scale(1.3)';setTimeout(()=>icon.style.transform='scale(1)',200);}else{icon.classList.remove('filled','text-golden-sand');icon.classList.add('text-neutral-300');}});});});
  });
}

// ═══ SPA NAV ═══
function navigateToDetails(id) {
  const data = alojamientosData[id]; if(!data) return;
  document.getElementById('main-explorer-view').classList.replace('block','hidden');
  const detView = document.getElementById('detailed-accommodation-view');
  detView.classList.replace('hidden','block');
  detView.classList.remove('animate-view-in'); void detView.offsetWidth; detView.classList.add('animate-view-in');
  document.getElementById('mobile-sticky-contact').classList.replace('hidden','block');
  window.scrollTo({top:0,behavior:'smooth'});
  document.getElementById('det-title').textContent=data.titulo;
  document.getElementById('det-rating-stars').innerHTML=renderStars(data.rating);
  document.getElementById('det-rating-number').textContent=data.rating;
  document.getElementById('det-reviews-count').textContent=data.reviewsCount;
  document.getElementById('det-location').textContent=data.ubicacion;
  document.getElementById('det-long-desc').textContent=data.descripcionLarga;
  document.getElementById('det-main-img').src=data.mainImg;
  const detStars=document.getElementById('det-interactive-stars');
  detStars.setAttribute('data-id',id); initVotingForContainer(detStars);
  const thumbContainer=document.getElementById('det-gallery-thumbs'); thumbContainer.innerHTML='';
  data.galeria.forEach((imgUrl,i)=>{const btn=document.createElement('button');btn.className=`snap-center w-[130px] md:w-full h-20 rounded-xl overflow-hidden shrink-0 border-[3px] transition-all hover:scale-105 active:scale-95 ${i===0?'border-primary':'border-transparent opacity-80 hover:opacity-100'}`;btn.innerHTML=`<img class="w-full h-full object-cover" src="${imgUrl}"/>`;btn.onclick=()=>{document.getElementById('det-main-img').src=imgUrl;Array.from(thumbContainer.children).forEach(b=>b.classList.replace('border-primary','border-transparent'));btn.classList.replace('border-transparent','border-primary');};thumbContainer.appendChild(btn);});
  document.getElementById('det-capacity-list').innerHTML=data.capacidad.map(c=>`<div class="capacity-row"><span class="material-symbols-outlined text-river-teal mt-0.5 text-[22px]">${c.icono}</span><div><div class="font-bold text-neutral-800 text-sm">${c.titulo}</div>${c.desc?`<div class="text-neutral-500 text-[13px] mt-0.5">${c.desc}</div>`:''}</div></div>`).join('');
  document.getElementById('det-services-grid').innerHTML=data.servicios.map(s=>`<div class="service-badge"><span class="material-symbols-outlined text-[18px] text-river-teal">${s.icono}</span><span>${s.texto}</span></div>`).join('');
  document.getElementById('det-checkin').textContent=data.checkin; document.getElementById('det-checkout').textContent=data.checkout; document.getElementById('det-cancellation').textContent=data.cancelacion;
  const waUrl=`https://wa.me/${data.waNumber}?text=${encodeURIComponent(`Hola! Vi tu alojamiento "${data.titulo}" en el portal de San Roque...`)}`;
  document.getElementById('det-wa-btn-desktop').href=waUrl; document.getElementById('det-wa-btn-mobile').href=waUrl;
  document.getElementById('det-phone-btn').href=data.telefono;
}

function backToGrid() {
  document.getElementById('detailed-accommodation-view').classList.replace('block','hidden');
  document.getElementById('mobile-sticky-contact').classList.replace('block','hidden');
  const mainView=document.getElementById('main-explorer-view');
  mainView.classList.replace('hidden','block');
  mainView.classList.remove('animate-view-in'); void mainView.offsetWidth; mainView.classList.add('animate-view-in');
  window.scrollTo({top:0,behavior:'smooth'});
  if(map){setTimeout(()=>map.invalidateSize(),100);}
}

// ═══ DOMCONTENTLOADED ═══
document.addEventListener("DOMContentLoaded",()=>{
  const observer=new IntersectionObserver((entries)=>{entries.forEach(e=>{if(e.isIntersecting) e.target.classList.add('visible');});},{threshold:0.05});
  document.querySelectorAll('.fade-in-up').forEach(el=>observer.observe(el));
  initMap();
  const filterBtns=document.querySelectorAll('.filter-btn');const cards=document.querySelectorAll('.card-item');
  filterBtns.forEach(btn=>{btn.addEventListener('click',()=>{filterBtns.forEach(b=>{b.classList.remove('bg-river-teal','text-canvas-white','shadow-sm');b.classList.add('bg-surface-container','text-on-surface-variant');});btn.classList.remove('bg-surface-container','text-on-surface-variant');btn.classList.add('bg-river-teal','text-canvas-white','shadow-sm');const f=btn.getAttribute('data-filter');cards.forEach(card=>{card.style.display=(f==='all'||card.getAttribute('data-category')===f)?'block':'none';});for(const[id,markerObj] of Object.entries(mapMarkers)){if(f==='all'||markerObj.category===f){if(!map.hasLayer(markerObj.marker)) map.addLayer(markerObj.marker);}else{if(map.hasLayer(markerObj.marker)) map.removeLayer(markerObj.marker);}}});});
  window.addEventListener('scroll',()=>{const nav=document.getElementById('main-nav');if(window.scrollY>50){nav.classList.add('bg-primary/95','backdrop-blur-md','shadow-md','py-4');nav.classList.remove('bg-gradient-to-b','from-black/60','to-transparent','pt-6','pb-6');}else{nav.classList.remove('bg-primary/95','backdrop-blur-md','shadow-md','py-4');nav.classList.add('bg-gradient-to-b','from-black/60','to-transparent','pt-6','pb-6');}});
  document.querySelectorAll('.interactive-stars').forEach(initVotingForContainer);
  loadWeather();
});

function ts2h(unix,offset){const d=new Date((unix+offset)*1000);return String(d.getUTCHours()).padStart(2,'0')+':'+String(d.getUTCMinutes()).padStart(2,'0');}

async function loadWeather() {
  try {
    const res=await fetch('/api/weather?lat=-28.5768&lon=-58.7168');
    if(!res.ok) throw new Error(); const d=await res.json(); if(d.error) throw new Error(d.error);
    const owmCode=d.weather[0].icon; let icon='light_mode';
    if(owmCode.includes('01')) icon=owmCode.includes('n')?'nights_stay':'light_mode';
    else if(owmCode.includes('02')||owmCode.includes('03')||owmCode.includes('04')) icon='cloud';
    else if(owmCode.includes('09')||owmCode.includes('10')) icon='rainy';
    else if(owmCode.includes('11')) icon='thunderstorm';
    else if(owmCode.includes('13')) icon='ac_unit';
    else if(owmCode.includes('50')) icon='foggy';
    document.getElementById('weather-icon-top').textContent=icon; document.getElementById('weather-temp-top').textContent=`${Math.round(d.main.temp)}°`;
    document.getElementById('wp-temp').textContent=`${Math.round(d.main.temp)}°C`; document.getElementById('wp-desc').textContent=d.weather[0].description;
    document.getElementById('wp-icon').textContent=icon; document.getElementById('wp-hum').textContent=`${d.main.humidity}%`;
    document.getElementById('wp-wind').textContent=`${Math.round(d.wind.speed*3.6)} km/h`; document.getElementById('wp-feel').textContent=`${Math.round(d.main.feels_like)}°C`;
    document.getElementById('wp-pressure').textContent=`${d.main.pressure} hPa`;
    document.getElementById('wp-date').textContent=new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'});
  } catch(e){console.error("Error clima.");}
}

// ═══ INTRO SPLASH ═══
(function(){
  const splash=document.getElementById('intro-splash');
  const logo=document.getElementById('splash-logo');
  const text=document.getElementById('splash-text');
  if(!splash) return;
  if(sessionStorage.getItem('splashShown')){splash.classList.add('hidden-out');return;}
  requestAnimationFrame(()=>{setTimeout(()=>{logo.classList.add('show');text.classList.add('show');},80);});
  setTimeout(()=>{splash.classList.add('hidden-out');sessionStorage.setItem('splashShown','1');},2800);
})();

// ═══ TYPEWRITER ═══
(function(){
  const phrases=['Dónde alojarme\nen San Roque','Hospedajes\ncon alma local','Tu lugar\nbajo el sol correntino','Bienvenido a\nSan Roque','Descubrí\nlo mejor del norte'];
  const el=document.getElementById('hero-typewriter-text');
  if(!el) return;
  let phraseIdx=0,charIdx=0,deleting=false,pauseTimer=null;
  function type(){
    if(!deleting){
      charIdx++;
      el.innerHTML=phrases[phraseIdx].slice(0,charIdx).replace('\n','<br>');
      if(charIdx===phrases[phraseIdx].length){deleting=true;clearTimeout(pauseTimer);pauseTimer=setTimeout(type,2600);return;}
      setTimeout(type,55+Math.random()*35);
    } else {
      charIdx--;
      el.innerHTML=phrases[phraseIdx].slice(0,charIdx).replace('\n','<br>');
      if(charIdx===0){deleting=false;phraseIdx=(phraseIdx+1)%phrases.length;setTimeout(type,380);return;}
      setTimeout(type,28+Math.random()*18);
    }
  }
  setTimeout(type,500);
})();

// ═══ DATOS ÚTILES E INFO CHATBOT ═══
const datosUtilesInfo = {
    remises:{
        titulo:"🚖 Remises",
        descripcion:"Servicio de remises disponibles en toda la ciudad. Te buscan donde estés.",
        contactos:[
            {nombre:"Remis San Roque", tel:"549XXXXXXXXX"},
            {nombre:"Remis Centro", tel:"549XXXXXXXXX"},
            {nombre:"Remis Norte", tel:"549XXXXXXXXX"}
        ]
    },


    terminal:{
        titulo:"🚌 Terminal de Ómnibus",
        descripcion:"Terminal de colectivos de San Roque.",
        ubicacion:"https://www.google.com/maps/search/?api=1&query=-28.5767789,-58.7135694"
    },


    municipio:{
        titulo:"🏛️ Municipalidad",
        descripcion:"Atención al ciudadano y trámites municipales.",
        ubicacion:"https://www.google.com/maps/search/?api=1&query=-28.57680756168794,-58.708982356874806"
    },


    iglesias:{
        titulo:"⛪ Iglesias",
        descripcion:"Templos religiosos de San Roque.",
        lugares:[

            {
                nombre:"Parroquia San Roque de Montpellier",
                link:"https://www.google.com/maps/search/?api=1&query=-28.571590353744543,-58.711252302690546"
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
        descripcion:"Servicios de urgencia disponibles en San Roque.",
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
        descripcion:"Farmacias y atención médica.",
        lugares:[

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
            }

        ]
    },


    servicios:{
        titulo:"🏧 Servicios rápidos",
        descripcion:"Servicios útiles para visitantes.",
        lugares:[

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

const BOT_API = "https://muni-bot-production.up.railway.app/chat";
let chatOpen = false;

document.getElementById("chatToggle").onclick = () => {
    chatOpen = !chatOpen;
    document.getElementById("chatWindow").style.display = chatOpen ? "flex" : "none";
};

// Escucha de clicks en los botones de Datos Útiles
document.querySelectorAll('#lista-datos-utiles a').forEach(btn => {
    btn.addEventListener('click', function(e){
        e.preventDefault();
        const tipo = this.dataset.tipo;
        
        // Abrir ventana del chatbot si estuviese cerrada
        chatOpen = true;
        document.getElementById("chatWindow").style.display = "flex";
        
        // Simular el mensaje del usuario con el botón presionado
        addMsg(this.innerText.trim(), true);
        showTyping();
        
        setTimeout(() => {
            hideTyping();
            responderDatosUtiles(tipo);
        }, 600);
    });
});

function quickAsk(text){
    document.getElementById("chatInput").value = text;
    sendChat();
}

function addMsg(text, user=false){
    const box = document.getElementById("chatBox");
    const div = document.createElement("div");

    div.style.margin = "10px 0";
    div.style.padding = "12px";
    div.style.borderRadius = "14px";
    div.style.maxWidth = "85%";
    div.style.wordBreak = "break-word";

    if(user){
        div.style.marginLeft = "auto";
        div.style.background = "#003633";
        div.style.color = "white";
        div.style.borderBottomRightRadius = "2px";
    } else {
        div.style.background = "white";
        div.style.color = "#333";
        div.style.borderBottomLeftRadius = "2px";
        div.style.boxShadow = "0 2px 5px rgba(0,0,0,0.05)";
    }

    div.innerHTML = text; 
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
    const item = datosUtilesInfo[tipo];
    if(!item) return;

    let html = `<b>${item.titulo}</b><br>`;
    html += `<p style="margin-top:4px; font-size:13px; color:#475569;">${item.descripcion}</p>`;

    if(item.ubicacion){
        html += `<p style="margin-top:8px;"><a target="_blank" href="${item.ubicacion}" style="color:#134E4A; font-weight:bold; text-decoration:underline;">📍 Ver ubicación en mapa</a></p>`;
    }

    if(item.lugares){
        html += `<ul style="margin-top:8px; padding-left:14px; list-style-type:disc; font-size:13px;">`;
        item.lugares.forEach(l => {
            html += `<li style="margin-top:4px;"><a target="_blank" href="${l.link}" style="color:#134E4A; font-weight:bold; text-decoration:underline;">${l.nombre}</a></li>`;
        });
        html += `</ul>`;
    }

    if(item.contactos){
        html += `<div style="margin-top:8px; font-size:13px;"><b>Contactos directos:</b><ul style="padding-left:0; list-style-type:none; margin-top:4px;">`;
        item.contactos.forEach(c => {
            html += `<li style="margin-top:6px; background:white; border:1px solid #e2e8f0; padding:6px 10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                    <div><strong>${c.nombre}</strong></div>
                    <a target="_blank" href="https://wa.me/${c.tel}" style="background:#25d366; color:white; padding:4px 8px; border-radius:6px; font-weight:bold; font-size:11px; text-decoration:none;">
                        📲 WhatsApp
                    </a>
                </li>`;
        });
        html += `</ul></div>`;
    }

    addMsg(html);
}

async function sendChat(){
    const input = document.getElementById("chatInput");
    const text = input.value.trim();
    if(!text) return;

    addMsg(text, true);
    input.value = "";
    showTyping();       

    const textLower = text.toLowerCase();

    // 1. Verificamos si la pregunta es sobre Datos Útiles primero (respuesta local rápida)
    if(textLower.includes("remis") || textLower.includes("remises") || textLower.includes("taxi")){ setTimeout(()=>{ hideTyping(); responderDatosUtiles("remises"); }, 600); return; }
    if(textLower.includes("terminal") || textLower.includes("colectivo") || textLower.includes("bus")){ setTimeout(()=>{ hideTyping(); responderDatosUtiles("terminal"); }, 600); return; }
    if(textLower.includes("municipio") || textLower.includes("muni")){ setTimeout(()=>{ hideTyping(); responderDatosUtiles("municipio"); }, 600); return; }
    if(textLower.includes("iglesia") || textLower.includes("templo") || textLower.includes("parroquia")){ setTimeout(()=>{ hideTyping(); responderDatosUtiles("iglesias"); }, 600); return; }
    if(textLower.includes("policia") || textLower.includes("emergencia") || textLower.includes("bomberos")){ setTimeout(()=>{ hideTyping(); responderDatosUtiles("emergencias"); }, 600); return; }
    if(textLower.includes("salud") || textLower.includes("farmacia") || textLower.includes("hospital")){ setTimeout(()=>{ hideTyping(); responderDatosUtiles("salud"); }, 600); return; }
    if(textLower.includes("servicio") || textLower.includes("cajero") || textLower.includes("banco")){ setTimeout(()=>{ hideTyping(); responderDatosUtiles("servicios"); }, 600); return; }

    // 2. Si no es de Datos Útiles, consulta a la API
    try {
        const response = await fetch(BOT_API, {
            method: "POST", 
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: text }) 
        });

        const data = await response.json();
        hideTyping();

        const botResponse = data.reply || data.response || data.message || "Respuesta recibida";
        addMsg(botResponse);

    } catch (error) {
        console.error("Error al conectar con la API:", error);
        hideTyping();
        addMsg("⚠️ Lo siento, tuve un problema de conexión con el servidor.");
    }
}

// Mensaje inicial del bot
setTimeout(() => {
    addMsg(`👋 <b>¡Bienvenido a MuniAyuda!</b><br><br>Soy el asistente virtual de Turismo de San Roque.<br><br>Puedo ayudarte con:<br>🏨 Hospedajes<br>🍕 Gastronomía<br>🎉 Eventos<br>🚓 Emergencias<br><br>¿Qué necesitás?`);
}, 1000);
