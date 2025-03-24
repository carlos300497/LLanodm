// Configuración del broker MQTT con WebSockets
const broker = 'wss://broker.emqx.io:8084/mqtt'; // Broker MQTT con WebSockets seguros
const topics = ['inomax/busdevoltaje']; // Lista de tópicos a suscribir

// Crear cliente MQTT
const client = new Paho.Client(broker, "clientId-" + Math.floor(Math.random() * 10000));

// Historial de voltaje (máximo 30 registros)
let voltajeData = [];
let voltajeLabels = [];

// Verificar si el gráfico está en la página antes de inicializarlo
let busvoltajeChar = null;
const chartElement = document.getElementById('busvoltajeChar');
if (chartElement) {
    const ctx = chartElement.getContext('2d');
    busvoltajeChar = new Chart(ctx, {
        type: 'line', // Cambio a línea para mejor visualización de tendencia
        data: {
            labels: [],
            datasets: [{
                label: 'Voltaje (V)',
                data: [],
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.3)',
                borderWidth: 2,
                tension: 0.3, // Suaviza la curva de la línea
                pointRadius: 3 // Tamaño de los puntos en la línea
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: { display: true, text: 'Hora' }
                },
                y: {
                    suggestedMin: 0,
                    suggestedMax: 100,
                    beginAtZero: true,
                    title: { display: true, text: 'Voltaje (V)' }
                }
            }
        }
    });
}

// Conectar al broker MQTT
client.connect({
    onSuccess: onConnect,
    onFailure: onFailure,
    useSSL: true
});

// Función ejecutada al conectar con éxito
function onConnect() {
    console.log('✅ Conectado al broker MQTT');

    // Suscribirse a los tópicos
    topics.forEach(topic => {
        client.subscribe(topic, {
            onSuccess: () => console.log(`✅ Suscrito a: ${topic}`),
            onFailure: (error) => console.error(`❌ Error al suscribirse a ${topic}:`, error.errorMessage)
        });
    });

    // Manejo de mensajes recibidos
    client.onMessageArrived = function (message) {
        console.log(`📩 Mensaje en ${message.destinationName}:`, message.payloadString);

        if (message.destinationName === 'inomax/busdevoltaje') {
            let voltaje = parseFloat(message.payloadString);
            actualizarElemento('busVoltaje', voltaje);

            // Actualizar gráfico si existe
            if (busvoltajeChar) {
                updateBusVoltajeChar(voltaje);
            }
        } else {
            console.warn(`⚠️ Tópico desconocido: ${message.destinationName}`);
        }
    };
}

// Función para actualizar un elemento HTML
function actualizarElemento(id, valor) {
    let element = document.getElementById(id);
    if (element) {
        element.innerText = valor;
    } else {
        console.error(`❌ Elemento '${id}' no encontrado`);
    }
}

// Función que actualiza el gráfico de voltaje
function updateBusVoltajeChar(value) {
    let now = new Date();
    let timestamp = now.toLocaleTimeString(); // Guardar solo la hora

    // Agregar nueva lectura
    voltajeData.push(value);
    voltajeLabels.push(timestamp);

    // Mantener solo las últimas 30 lecturas
    if (voltajeData.length > 30) {
        voltajeData.shift(); // Eliminar el dato más antiguo
        voltajeLabels.shift();
    }

    // Actualizar gráfico
    busvoltajeChar.data.labels = voltajeLabels;
    busvoltajeChar.data.datasets[0].data = voltajeData;
    busvoltajeChar.update();
}

// Función que se ejecuta si la conexión falla
function onFailure(response) {
    console.error('❌ Error de conexión:', response.errorMessage);
}

// Manejo de desconexión
client.onConnectionLost = function (responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log('⚠️ Desconexión de MQTT:', responseObject.errorMessage);
    }
};
