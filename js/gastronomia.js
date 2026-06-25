document.addEventListener("DOMContentLoaded", () => {

  const grid = document.getElementById("gastronomia-grid");

  if (!grid) {
    console.error("No existe #gastronomia-grid en el DOM");
    return;
  }

  const data = window.gastronomiaData;

  if (!data) {
    console.error("No se cargó gastronomiaData");
    return;
  }

  function crearCard(local) {
    return `
      <div class="bg-white rounded-xl shadow overflow-hidden flex flex-col">
        <img src="${local.imagen}" class="h-56 w-full object-cover" />

        <div class="p-5 flex flex-col flex-grow">
          <h3 class="font-bold text-lg">${local.nombre}</h3>
          <p class="text-sm mt-2">${local.descripcion}</p>

          <p class="text-sm mt-3">🕒 ${local.horario}</p>
          <p class="text-sm">📍 ${local.ubicacion}</p>

          <a class="mt-auto bg-primary text-white py-2 text-center rounded mt-4"
             href="https://wa.me/${local.whatsapp}"
             target="_blank">
            WhatsApp
          </a>
        </div>
      </div>
    `;
  }

  grid.innerHTML = Object.values(data)
    .map(crearCard)
    .join("");

});
