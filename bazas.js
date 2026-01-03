// --- LÓGICA DEL JUEGO (BACKEND) ---
class JuegoPodrida {
    constructor(nombresJugadores, maxCartas) {
        this.jugadores = nombresJugadores.map(nombre => ({
            nombre: nombre,
            puntos: 0,
            // NUEVO: Guardamos el historial de apuestas y resultados reales
            historialPredicciones: [],
            historialReales: []
        }));
        this.rondas = this.generarSecuenciaRondas(maxCartas);
        this.rondaActualIdx = 0;
    }

    generarSecuenciaRondas(max) {
        const subida = Array.from({ length: max }, (_, i) => i + 1);
        const bajada = [...subida].reverse();
        return subida.concat(bajada);
    }

    validarApuestas(apuestas) {
        const cartas = this.rondas[this.rondaActualIdx];
        const suma = apuestas.reduce((a, b) => a + b, 0);
        if (suma === cartas) {
            throw new Error(`¡Regla de la Podrida! La suma de apuestas no puede ser ${cartas}. Alguien tiene que cambiar.`);
        }
    }

    validarResultados(resultados) {
        const cartas = this.rondas[this.rondaActualIdx];
        const suma = resultados.reduce((a, b) => a + b, 0);
        if (suma !== cartas) {
            throw new Error(`Error en resultados: La suma de bazas ganadas debe ser exactamente ${cartas} (cargaste ${suma}).`);
        }
    }

    calcularPuntajeRonda(apuesta, reales) {
        if (apuesta === reales) {
            return 10 + (reales * 3);
        } else {
            return -(Math.abs(apuesta - reales) * 3);
        }
    }

    procesarRonda(apuestas, resultados) {
        this.validarApuestas(apuestas);
        this.validarResultados(resultados);

        this.jugadores.forEach((jugador, i) => {
            jugador.puntos += this.calcularPuntajeRonda(apuestas[i], resultados[i]);
            // NUEVO: Guardamos los datos para los gráficos
            jugador.historialPredicciones.push(apuestas[i]);
            jugador.historialReales.push(resultados[i]);
        });
        this.rondaActualIdx++;
    }

    obtenerGanador() {
        return [...this.jugadores].sort((a, b) => b.puntos - a.puntos)[0];
    }
}

// --- LÓGICA DE INTERFAZ (UI) ---
let partida;
// Variable para guardar las instancias de los gráficos y destruirlos si es necesario
let chartsInstances = []; 

function iniciarPartida() {
    const nombres = document.getElementById('nombres').value.split(',').map(n => n.trim()).filter(n => n);
    const max = parseInt(document.getElementById('max-cartas').value);
    
    if (nombres.length < 2 || isNaN(max)) return alert("Configurá bien los nombres y cartas.");

    partida = new JuegoPodrida(nombres, max);
    
    document.getElementById('setup').style.display = 'none';
    document.getElementById('game-panel').style.display = 'block';
    document.getElementById('tabla-puntos').style.display = 'block';
    
    renderizarHeaders(nombres);
    actualizarInterfazRonda();
}

function renderizarHeaders(nombres) {
    const header = document.getElementById('header-jugadores');
    header.innerHTML = '<th>Cartas</th>'; // Reset header
    nombres.forEach(n => {
        const th = document.createElement('th');
        th.innerText = n;
        header.appendChild(th);
    });
}

function actualizarInterfazRonda() {
    const cartas = partida.rondas[partida.rondaActualIdx];
    document.getElementById('display-ronda').innerText = `Ronda ${partida.rondaActualIdx + 1} de ${partida.rondas.length}`;
    document.getElementById('display-cartas').innerText = `Cartas a repartir: ${cartas}`;
    
    const listaApuestas = document.getElementById('lista-apuestas');
    const listaResultados = document.getElementById('lista-resultados');
    listaApuestas.innerHTML = '';
    listaResultados.innerHTML = '';

    partida.jugadores.forEach((j, i) => {
        listaApuestas.insertAdjacentHTML('beforeend', `<div>${j.nombre}: <input type="number" class="apuesta-in" value="0" min="0"></div>`);
        listaResultados.insertAdjacentHTML('beforeend', `<div>${j.nombre}: <input type="number" class="resultado-in" value="0" min="0"></div>`);
    });
}

function procesarRondaUI() {
    const apuestas = Array.from(document.querySelectorAll('.apuesta-in')).map(i => parseInt(i.value) || 0);
    const resultados = Array.from(document.querySelectorAll('.resultado-in')).map(i => parseInt(i.value) || 0);

    try {
        partida.procesarRonda(apuestas, resultados);
        agregarFilaTabla();
        if (partida.rondaActualIdx < partida.rondas.length) {
            actualizarInterfazRonda();
        } else {
            finDelJuegoUI();
        }
    } catch (e) {
        alert(e.message);
    }
}

function agregarFilaTabla() {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${partida.rondas[partida.rondaActualIdx - 1]}</td>`;
    partida.jugadores.forEach(j => {
        tr.innerHTML += `<td>${j.puntos}</td>`;
    });
    document.getElementById('cuerpo-tabla').appendChild(tr);
}

// NUEVO: Función que maneja el fin del juego
function finDelJuegoUI() {
    const g = partida.obtenerGanador();
    document.getElementById('game-panel').style.display = 'none';
    document.getElementById('ganador-texto').innerText = `🎉 ¡Ganó ${g.nombre} con ${g.puntos} puntos! 🎉`;
    document.getElementById('final-prompt').style.display = 'block';
}

// NUEVO: Función para generar los gráficos con Chart.js
function mostrarEstadisticas() {
    document.getElementById('final-prompt').style.display = 'none';
    document.getElementById('tabla-puntos').style.display = 'none';
    document.getElementById('charts-panel').style.display = 'block';

    const container = document.getElementById('charts-container');
    container.innerHTML = ''; // Limpiar gráficos anteriores

    // Generamos las etiquetas del eje X (Ronda 1, Ronda 2...)
    const labels = partida.rondas.map((c, i) => `R${i+1} (${c}c)`);

    partida.jugadores.forEach((jugador, index) => {
        // Crear contenedor para el canvas
        const chartDiv = document.createElement('div');
        chartDiv.style.marginBottom = '40px';
        chartDiv.style.padding = '15px';
        chartDiv.style.background = '#fff';
        chartDiv.style.borderRadius = '8px';
        chartDiv.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
        
        // Título del gráfico
        const title = document.createElement('h4');
        title.innerText = `Rendimiento: ${jugador.nombre}`;
        title.style.textAlign = 'center';
        chartDiv.appendChild(title);

        // Canvas
        const canvas = document.createElement('canvas');
        canvas.id = `chart-${index}`;
        chartDiv.appendChild(canvas);
        container.appendChild(chartDiv);

        // Configuración de Chart.js para barras agrupadas
        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Dijo que ganaba',
                        data: jugador.historialPredicciones,
                        backgroundColor: 'rgba(54, 162, 235, 0.6)', // Azul
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Realmente ganó',
                        data: jugador.historialReales,
                        backgroundColor: 'rgba(39, 174, 96, 0.7)', // Verde
                        borderColor: 'rgba(39, 174, 96, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 },
                        title: { display: true, text: 'Bazas' }
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        });
        chartsInstances.push(chart);
    });
}
