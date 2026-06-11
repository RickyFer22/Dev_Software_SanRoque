let mapa;
let marcadores = [];

const lugares = [
    // HOSPEDAJES
    { 
        nombre: 'Fortune', 
        lat: -28.578244, 
        lng: -58.708171, 
        tipo: 'hospedaje', 
        icono: '🏨', 
        desc: 'Hospedaje',
        direccion: 'San Roque, Corrientes',
        imagen: 'img/Hospedaje JR.jpeg'
    },
    { 
        nombre: 'Casa Blanca', 
        lat: -28.580640, 
        lng: -58.717417, 
        tipo: 'hospedaje', 
        icono: '🏨', 
        desc: 'Casa quinta familiar',
        direccion: 'San Roque, Corrientes',
        imagen: 'img/Hospedaje Casa Blanca.jpeg'
    },
    { 
        nombre: 'Hospedaje JR', 
        lat: -28.576108, 
        lng: -58.713279, 
        tipo: 'hospedaje', 
        icono: '🏨', 
        desc: 'Hostel',
        direccion: 'San Roque, Corrientes',
        imagen: 'img/Hospedaje JR.jpeg'
    },
    { 
        nombre: 'Leguiza Hotel', 
        lat: -28.575055, 
        lng: -58.709070, 
        tipo: 'hospedaje', 
        icono: '🏨', 
        desc: 'Hotel con WiFi y climatización',
        direccion: 'Zona urbana, San Roque',
        imagen: 'img/Hotel Leguiza.jpeg'
    },
    
    // GASTRONOMÍA
    { 
        nombre: 'Comedor Ariana', 
        lat: -28.580843, 
        lng: -58.721403, 
        tipo: 'gastronomia', 
        icono: '🍽', 
        desc: 'Comedor - Av. principal',
        direccion: 'Av. principal, San Roque',
        imagen: 'img/Comedor Ariana.jpeg'
    },
    
    // TURISMO
    { 
        nombre: 'Plaza San Martín', 
        lat: -28.572519, 
        lng: -58.708458, 
        tipo: 'turismo', 
        icono: '⛪', 
        desc: 'Plaza e Iglesia histórica - Centro de San Roque',
        direccion: 'Plaza San Martín, San Roque, Corrientes',
        imagen: 'img/PLAZA E HIGLESIA.jpeg'
    }
];

function initMapa() {
    // Verificar que existe el contenedor
    const mapaContainer = document.getElementById('mapa-interactivo');
    if (!mapaContainer) {
        console.error('No se encontró el contenedor del mapa');
        return;
    }
    
    mapa = L.map('mapa-interactivo').setView([-28.577, -58.713], 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19
    }).addTo(mapa);
    
    agregarMarcadores(lugares);
    console.log('Mapa inicializado correctamente');
}

function crearIconoPersonalizado(icono) {
    return L.divIcon({
        className: 'custom-marker-wrapper',
        html: '<div class="custom-marker">' + icono + '</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
}

function agregarMarcadores(lista) {
    lista.forEach(function(lugar) {
        const marcador = L.marker([lugar.lat, lugar.lng], {
            icon: crearIconoPersonalizado(lugar.icono)
        }).addTo(mapa);
        
        // Construir el contenido del popup con imagen
        let popupContent = '<div style="min-width: 220px;">';
        
        // Agregar imagen si existe
        if (lugar.imagen) {
            popupContent += '<img src="' + lugar.imagen + '" alt="' + lugar.nombre + '" style="width: 100%; max-height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 10px; border: 2px solid #d4a83c;">';
        }
        
        // Nombre
        popupContent += '<h4 style="margin: 0 0 5px 0; color: #134e4a; font-size: 1.2em;">' + lugar.nombre + '</h4>';
        
        // Descripción
        popupContent += '<p style="margin: 5px 0; font-size: 0.95em;">' + lugar.desc + '</p>';
        
        // Dirección
        if (lugar.direccion) {
            popupContent += '<p style="margin: 5px 0; font-size: 0.9em; color: #666;"><strong>📍</strong> ' + lugar.direccion + '</p>';
        }
        
        // Tipo
        popupContent += '<small style="color: #1a6b65; display: block; margin-top: 8px;">Tipo: ' + lugar.tipo + '</small>';
        popupContent += '</div>';
        
        marcador.bindPopup(popupContent);
        
        marcadores.push({ marcador: marcador, tipo: lugar.tipo });
    });
}

function filtrarMapa(tipo) {
    marcadores.forEach(function(item) {
        if (tipo === 'todos' || item.tipo === tipo) {
            item.marcador.addTo(mapa);
        } else {
            mapa.removeLayer(item.marcador);
        }
    });
}

function centrarMapa(lat, lng, nombre) {
    if (mapa) {
        mapa.setView([lat, lng], 17);
        marcadores.forEach(function(item) {
            const pos = item.marcador.getLatLng();
            if (Math.abs(pos.lat - lat) < 0.0001 && Math.abs(pos.lng - lng) < 0.0001) {
                item.marcador.openPopup();
            }
        });
    }
}

// Inicializar cuando cargue la página
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initMapa, 200);
});