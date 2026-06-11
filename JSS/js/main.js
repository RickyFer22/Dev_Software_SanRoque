// Filtros de botones
document.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        this.parentElement.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
    });
});

// Scroll suave
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Efecto brillo en banner
const banner = document.querySelector('.banner-eventos');
if (banner) {
    banner.addEventListener('mousemove', function(e) {
        const rect = banner.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const brilho = document.querySelector('.banner-brilho');
        if (brilho) {
            brilho.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(245, 217, 138, 0.2) 0%, transparent 50%)`;
        }
    });
}

// LIGHTBOX FUNCIONALIDAD
function abrirLightbox(imagen, titulo) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    
    lightboxImg.src = imagen;
    lightboxCaption.textContent = titulo;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden'; // Evitar scroll
}

function cerrarLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.remove('active');
    document.body.style.overflow = 'auto'; // Restaurar scroll
}

// Cerrar con tecla ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        cerrarLightbox();
    }
});
