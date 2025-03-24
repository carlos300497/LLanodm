// Configuración del broker MQTT con WebSockets
const broker = 'wss://broker.emqx.io:8084/mqtt'; // Broker MQTT con WebSockets seguros
const topics = [
    'sensor/temperatura/tablero',
    'sensor/humedad/arandano',
    'sensor/temperatura/rasberry',
]; // Lista de tópicos a suscribir

// Crear cliente MQTT
const client = new Paho.Client(broker, "clientId-" + Math.floor(Math.random() * 10000));

// Historial de datos (máximo 30 registros)
let humedadData = [], humedadLabels = [];
let tempTableroData = [], tempTableroLabels = [];
let tempRaspberryData = [], tempRaspberryLabels = [];

// Función para inicializar gráficos de línea si el canvas existe
function createChart(canvasId, label, borderColor) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.warn(`⚠️ No se encontró el elemento '${canvasId}' en el DOM.`);
        return null;
    }
    
    const ctx = canvas.getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: label,
                data: [],
                borderColor: borderColor,
                backgroundColor: borderColor.replace('1)', '0.3)'), // Fondo más claro
                borderWidth: 2,
                tension: 0.3, // Suaviza la curva de la línea
                pointRadius: 3 // Tamaño de los puntos en la línea
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: 'Hora' } },
                y: {
                    suggestedMin: 0,
                    suggestedMax: 100,
                    beginAtZero: true,
                    title: { display: true, text: 'Valor' }
                }
            }
        }
    });
}

// Crear gráficos si los elementos existen en el DOM
const humedadArandanoChar = createChart('humedadArandanoChar', 'Humedad (%)', 'rgba(54, 162, 235, 1)');
const temperaturaTableroChar = createChart('temperaturaTableroChar', 'Temperatura Tablero (°C)', 'rgba(255, 99, 132, 1)');
const temperaturaRaspberryChar = createChart('temperaturaRaspberryChar', 'Temperatura Raspberry (°C)', 'rgba(255, 165, 0, 1)');

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

        let elementId;
        let value = parseFloat(message.payloadString); // Convertir a número

        switch (message.destinationName) {
            case 'sensor/temperatura/tablero':
                elementId = 'temperaturaTablero';
                updateChart(temperaturaTableroChar, tempTableroData, tempTableroLabels, value);
                break;
            case 'sensor/humedad/arandano':
                elementId = 'humedadArandano';
                updateChart(humedadArandanoChar, humedadData, humedadLabels, value);
                break;
            case 'sensor/temperatura/rasberry':
                elementId = 'temperaturaRaspberry';
                updateChart(temperaturaRaspberryChar, tempRaspberryData, tempRaspberryLabels, value);
                break;
            case 'inomax/busdevoltaje':
                elementId = 'busVoltaje';
                break;
            default:
                console.warn(`⚠️ Tópico desconocido: ${message.destinationName}`);
                return;
        }

        // Actualizar elemento HTML con el dato recibido
        let element = document.getElementById(elementId);
        if (element) {
            element.innerText = message.payloadString;
        } else {
            console.error(`❌ Elemento '${elementId}' no encontrado`);
        }
    };
}

// Función que actualiza un gráfico de línea
function updateChart(chart, dataArray, labelArray, value) {
    let now = new Date();
    let timestamp = now.toLocaleTimeString(); // Guardar solo la hora

    // Agregar nueva lectura
    dataArray.push(value);
    labelArray.push(timestamp);

    // Mantener solo las últimas 30 lecturas
    if (dataArray.length > 30) {
        dataArray.shift(); // Eliminar el dato más antiguo
        labelArray.shift();
    }

    // Actualizar gráfico si existe
    if (chart) {
        chart.data.labels = labelArray;
        chart.data.datasets[0].data = dataArray;
        chart.update();
    }
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
