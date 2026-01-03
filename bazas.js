class JuegoPodrida {
    constructor(nombresJugadores, maxCartas) {
        this.jugadores = nombresJugadores.map(nombre => ({
            nombre: nombre,
            puntos: 0
        }));
        this.rondas = this.generarSecuenciaRondas(maxCartas);
        this.rondaActualIdx = 0;
    }

    generarSecuenciaRondas(max) {
        const subida = Array.from({ length: max }, (_, i) => i + 1);
        const bajada = [...subida].reverse();
        return subida.concat(bajada);
    }

    // Regla 1: Las apuestas NO pueden sumar igual a las cartas
    validarApuestas(apuestas) {
        const cartas = this.rondas[this.rondaActualIdx];
        const suma = apuestas.reduce((a, b) => a + b, 0);
        if (suma === cartas) {
            throw new Error(`¡Regla de la Podrida! La suma de apuestas no puede ser ${cartas}. Alguien tiene que cambiar.`);
        }
        return true;
    }

    // Regla 2: Los resultados reales DEBEN sumar igual a las cartas
    validarResultados(resultados) {
        const cartas = this.rondas[this.rondaActualIdx];
        const suma = resultados.reduce((a, b) => a + b, 0);
        if (suma !== cartas) {
            throw new Error(`Error en resultados: La suma de bazas ganadas debe ser exactamente ${cartas} (cargaste ${suma}).`);
        }
        return true;
    }

    calcularPuntajeRonda(apuesta, reales) {
        if (apuesta === reales) {
            return 10 + (reales * 3);
        } else {
            return -(Math.abs(apuesta - reales) * 3);
        }
    }

    procesarRonda(apuestas, resultados) {
        // Ejecutar ambas validaciones
        this.validarApuestas(apuestas);
        this.validarResultados(resultados);

        this.jugadores.forEach((jugador, i) => {
            jugador.puntos += this.calcularPuntajeRonda(apuestas[i], resultados[i]);
        });
        this.rondaActualIdx++;
    }

    obtenerGanador() {
        return [...this.jugadores].sort((a, b) => b.puntos - a.puntos)[0];
    }
}

let partida;

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
            const g = partida.obtenerGanador();
            alert(`¡Fin! Ganó ${g.nombre} con ${g.puntos} puntos.`);
        }
    } catch (e) {
        alert(e.message); // Aquí mostrará el error de suma incorrecta o de la regla de la podrida
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
