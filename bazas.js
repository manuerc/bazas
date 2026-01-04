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
    container.innerHTML = ''; 

    // El eje X ahora son los valores posibles de bazas (0, 1, 2... hasta el máximo de cartas)
    const maxPosible = Math.max(...partida.rondas);
    const labelsEjeX = Array.from({ length: maxPosible + 1 }, (_, i) => i.toString());

    partida.jugadores.forEach((jugador, index) => {
        // --- 1. PROCESAMIENTO DE DATOS (FRECUENCIAS) ---
        // Contamos cuántas veces ocurre cada valor en las predicciones y en los reales
        const frecPredicciones = new Array(maxPosible + 1).fill(0);
        const frecReales = new Array(maxPosible + 1).fill(0);

        jugador.historialPredicciones.forEach(val => frecPredicciones[val]++);
        jugador.historialReales.forEach(val => frecReales[val]++);

        // --- 2. CREACIÓN DE LA INTERFAZ ---
        const playerSection = document.createElement('div');
        playerSection.className = 'player-stats-section';
        playerSection.style.marginBottom = '50px';
        playerSection.innerHTML = `<h3 style="text-align:center; color:var(--primary);">${jugador.nombre}</h3>`;
        
        // Contenedor para los dos gráficos del jugador (lado a lado o uno bajo el otro)
        const chartsWrapper = document.createElement('div');
        chartsWrapper.style.display = 'flex';
        chartsWrapper.style.flexWrap = 'wrap';
        chartsWrapper.style.gap = '10px';
        
        playerSection.appendChild(chartsWrapper);
        container.appendChild(playerSection);

        // --- 3. RENDERIZADO DE LOS 2 GRÁFICOS POR JUGADOR ---
        crearGraficoBarra(
            chartsWrapper, 
            `Dijo que ganaba (Frecuencia)`, 
            frecPredicciones, 
            labelsEjeX, 
            'rgba(54, 162, 235, 0.7)'
        );

        crearGraficoBarra(
            chartsWrapper, 
            `Realmente ganó (Frecuencia)`, 
            frecReales, 
            labelsEjeX, 
            'rgba(39, 174, 96, 0.7)'
        );
    });
}

// Función auxiliar para no repetir código de Chart.js
function crearGraficoBarra(contenedor, titulo, data, labels, color) {
    const div = document.createElement('div');
    div.style.flex = '1 1 250px'; // Se adapta al ancho
    div.style.minWidth = '250px';
    
    const canvas = document.createElement('canvas');
    div.appendChild(canvas);
    contenedor.appendChild(div);

    new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: titulo,
                data: data,
                backgroundColor: color,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { 
                    beginAtZero: true, 
                    ticks: { stepSize: 1 },
                    title: { display: true, text: 'Cantidad de Rondas' }
                },
                x: {
                    title: { display: true, text: 'N° de Bazas' }
                }
            },
            plugins: {
                legend: { display: true, position: 'top' }
            }
        }
    });
}
