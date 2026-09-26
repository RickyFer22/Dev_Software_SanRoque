(() => {
  const widget = document.getElementById('nav-weather');
  const icon = document.getElementById('nav-weather-icon');
  const temperature = document.getElementById('nav-weather-temp');
  if (!widget || !icon || !temperature) return;

  const weatherLabels = new Map([
    [0, ['light_mode', 'cielo despejado']],
    [1, ['light_mode', 'mayormente despejado']],
    [2, ['partly_cloudy_day', 'parcialmente nublado']],
    [3, ['cloud', 'nublado']],
    [45, ['foggy', 'neblina']],
    [48, ['foggy', 'neblina']],
    [51, ['rainy', 'llovizna']],
    [53, ['rainy', 'llovizna']],
    [55, ['rainy', 'llovizna']],
    [61, ['rainy', 'lluvia']],
    [63, ['rainy', 'lluvia']],
    [65, ['rainy', 'lluvia']],
    [80, ['rainy', 'lluvia']],
    [81, ['rainy', 'lluvia']],
    [82, ['rainy', 'lluvia']],
    [95, ['thunderstorm', 'tormenta']],
    [96, ['thunderstorm', 'tormenta']],
    [99, ['thunderstorm', 'tormenta']],
  ]);

  const url = 'https://api.open-meteo.com/v1/forecast?latitude=-28.5768&longitude=-58.7168&current=temperature_2m%2Cweather_code&timezone=America%2FArgentina%2FCordoba';

  fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error('Weather request failed');
      return response.json();
    })
    .then((data) => {
      const current = data.current;
      const value = Number(current?.temperature_2m);
      if (!Number.isFinite(value)) throw new Error('Weather data unavailable');

      const [iconName, description] = weatherLabels.get(Number(current.weather_code)) || ['cloud', 'clima actual'];
      icon.textContent = iconName;
      temperature.textContent = `${Math.round(value)}°`;
      widget.setAttribute('aria-label', `Clima actual en San Roque: ${Math.round(value)} grados, ${description}`);
    })
    .catch(() => {
      icon.textContent = 'cloud_off';
      temperature.textContent = '--°';
      widget.setAttribute('aria-label', 'Clima de San Roque no disponible');
    });
})();