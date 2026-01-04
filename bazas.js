// --- LÓGICA DEL JUEGO (BACKEND) ---
class JuegoPodrida {
    constructor(nombresJugadores, maxCartas, repartidorInicialIdx) {
        this.jugadores = nombresJugadores.map(nombre => ({
            nombre: nombre,
            puntos: 0,
            historialPredicciones: [],
            historialReales: []
        }));
        this.rondas = this.generarSecuenciaRondas(maxCartas);
        this.rondaActualIdx = 0;
        // Seguimiento del repartidor
        this.repartidorActualIdx = repartidorInicialIdx;
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
            throw new Error(`¡Regla de la Podrida! La suma de apuestas no puede ser ${cartas}.`);
        }
    }

    validarResultados(resultados) {
        const cartas = this.rondas[this.rondaActualIdx];
        const suma = resultados.reduce((a, b) => a + b, 0);
        if (suma !== cartas) {
            throw new Error(`Error: La suma debe ser ${cartas} (pusiste ${suma}).`);
        }
    }

    calcularPuntajeRonda(apuesta, reales) {
        return (apuesta === reales) ? (10 + (reales * 3)) : -(Math.abs(apuesta - reales) * 3);
    }

    procesarRonda(apuestas, resultados) {
        this.validarApuestas(apuestas);
        this.validarResultados(resultados);

        this.jugadores.forEach((jugador, i) => {
            jugador.puntos += this.calcularPuntajeRonda(apuestas[i], resultados[i]);
            jugador.historialPredicciones.push(apuestas[i]);
            jugador.historialReales.push(resultados[i]);
        });

        this.rondaActualIdx++;
        // ROTACIÓN DEL REPARTIDOR: Pasa al siguiente según el orden de la lista
        this.repartidorActualIdx = (this.repartidorActualIdx + 1) % this.jugadores.length;
    }

    obtenerGanador() {
        return [...this.jugadores].sort((a, b) => b.puntos - a.puntos)[0];
    }
}

// --- LÓGICA DE INTERFAZ (UI) ---
let partida;
let indiceSorteado = -1;

// FUNCIÓN DE SORTEO
function sortearRepartidor() {
    const nombresInput = document.getElementById('nombres').value;
    const nombres = nombresInput.split(',').map(n => n.trim()).filter(n => n);

    if (nombres.length < 2) {
        return alert("Ingresá los nombres primero para sortear.");
    }

    // Efecto visual simple (opcional)
    const resElem = document.getElementById('resultado-sorteo');
    resElem.innerText = "Sorteando...";

    setTimeout(() => {
        indiceSorteado = Math.floor(Math.random() * nombres.length);
        resElem.innerText = `👉 Empieza repartiendo: ${nombres[indiceSorteado]}`;
    }, 500);
}

function iniciarPartida() {
    const nombres = document.getElementById('nombres').value.split(',').map(n => n.trim()).filter(n => n);
    const max = parseInt(document.getElementById('max-cartas').value);
    
    if (nombres.length < 2) return alert("Ingresá al menos 2 nombres.");
    
    // Si no sortearon, elegimos el primero por defecto
    if (indiceSorteado === -1) {
        indiceSorteado = 0;
    }

    partida = new JuegoPodrida(nombres, max, indiceSorteado);
    
    document.getElementById('setup').style.display = 'none';
    document.getElementById('game-panel').style.display = 'block';
    document.getElementById('tabla-puntos').style.display = 'block';
    
    renderizarHeaders(nombres);
    actualizarInterfazRonda();
}

function renderizarHeaders(nombres) {
    const header = document.getElementById('header-jugadores');
    header.innerHTML = '<th>Cartas</th>';
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
    
    // MOSTRAR REPARTIDOR ACTUAL
    const repartidor = partida.jugadores[partida.repartidorActualIdx].nombre;
    document.getElementById('display-repartidor').innerText = `🃏 Reparte: ${repartidor}`;
    
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

function finDelJuegoUI() {
    const g = partida.obtenerGanador();
    document.getElementById('game-panel').style.display = 'none';
    document.getElementById('ganador-texto').innerText = `🎉 ¡Ganó ${g.nombre} con ${g.puntos} puntos! 🎉`;
    document.getElementById('final-prompt').style.display = 'block';
}

function mostrarEstadisticas() {
    document.getElementById('final-prompt').style.display = 'none';
    document.getElementById('tabla-puntos').style.display = 'none';
    document.getElementById('charts-panel').style.display = 'block';

    const container = document.getElementById('charts-container');
    container.innerHTML = ''; 

    const maxPosible = Math.max(...partida.rondas);
    const labelsEjeX = Array.from({ length: maxPosible + 1 }, (_, i) => i.toString());

    partida.jugadores.forEach((jugador, index) => {
        const frecPredicciones = new Array(maxPosible + 1).fill(0);
        const frecReales = new Array(maxPosible + 1).fill(0);

        jugador.historialPredicciones.forEach(val => frecPredicciones[val]++);
        jugador.historialReales.forEach(val => frecReales[val]++);

        const playerSection = document.createElement('div');
        playerSection.style.marginBottom = '50px';
        playerSection.innerHTML = `<h3 style="text-align:center; margin-top:30px;">Análisis de ${jugador.nombre}</h3>`;
        
        const chartsWrapper = document.createElement('div');
        chartsWrapper.style.display = 'flex';
        chartsWrapper.style.flexWrap = 'wrap';
        chartsWrapper.style.gap = '20px';
        
        playerSection.appendChild(chartsWrapper);
        container.appendChild(playerSection);

        crearGraficoBarra(chartsWrapper, `Dijo que ganaba`, frecPredicciones, labelsEjeX, 'rgba(54, 162, 235, 0.7)');
        crearGraficoBarra(chartsWrapper, `Realmente ganó`, frecReales, labelsEjeX, 'rgba(39, 174, 96, 0.7)');
    });
}

function crearGraficoBarra(contenedor, titulo, data, labels, color) {
    const div = document.createElement('div');
    div.style.flex = '1 1 300px';
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
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}
