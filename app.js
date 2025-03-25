// Configuración de MQTT
const broker = 'wss://broker.emqx.io:8084/mqtt';
const topics = [
    'sensor/temperatura/tablero',
    'sensor/humedad/arandano',
    'sensor/temperatura/rasberry',
];
const client = new Paho.Client(broker, "clientId-" + Math.floor(Math.random() * 10000));

// Configuración de Supabase
const SUPABASE_URL = "https://ymvefmbijzqwloeepelx.supabase.co";  // Reemplaza con tu URL de Supabase
const SUPABASE_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltdmVmbWJpanpxd2xvZWVwZWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NjU0MzAsImV4cCI6MjA1ODQ0MTQzMH0.oSdMfCAW3QxjH8O5UsVlDHCHVtWO_sEG9DId3LtTrnk"; // Genera una API Key en Supabase
const SUPABASE_TABLE = "Datos llano"; // Nombre de la tabla en Supabase

async function sendDataToSupabase(topic, value) {
    try {
        const data = { topic, value, timestamp: new Date().toISOString() };

        const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_API_KEY,
                "Authorization": `Bearer ${SUPABASE_API_KEY}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        console.log(`📡 Enviado a Supabase: ${topic} -> ${value}`);
    } catch (error) {
        console.error(`❌ Error al enviar a Supabase: ${error.message}`);
    }
}
// Historial de datos
let humedadData = [], humedadLabels = [];
let tempTableroData = [], tempTableroLabels = [];
let tempRaspberryData = [], tempRaspberryLabels = [];

// Función para inicializar gráficos
function createChart(canvasId, label, borderColor) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: label,
                data: [],
                borderColor: borderColor,
                backgroundColor: borderColor.replace('1)', '0.3)'),
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: 'Hora' } },
                y: { suggestedMin: 0, suggestedMax: 100, beginAtZero: true, title: { display: true, text: 'Valor' } }
            }
        }
    });
}

// Crear gráficos
const humedadArandanoChart = createChart('humedadArandanoChar', 'Humedad (%)', 'rgba(54, 162, 235, 1)');
const temperaturaTableroChart = createChart('temperaturaTableroChar', 'Temperatura Tablero (°C)', 'rgba(255, 99, 132, 1)');
const temperaturaRaspberryChart = createChart('temperaturaRaspberryChar', 'Temperatura Raspberry (°C)', 'rgba(255, 165, 0, 1)');

// Conectar al broker MQTT
client.connect({
    onSuccess: onConnect,
    onFailure: onFailure,
    useSSL: true
});

function onConnect() {
    console.log('✅ Conectado al broker MQTT');
    topics.forEach(topic => {
        client.subscribe(topic, {
            onSuccess: () => console.log(`✅ Suscrito a: ${topic}`),
            onFailure: (error) => console.error(`❌ Error al suscribirse a ${topic}:`, error.errorMessage)
        });
    });

    client.onMessageArrived = async function (message) {
        console.log(`📩 Mensaje en ${message.destinationName}:`, message.payloadString);
        
        let elementId;
        let value = message.payloadString.replace(/\[|\]|"/g, ""); // Eliminar corchetes y comillas
        value = parseFloat(value);
        
        sendDataToSupabase(message.destinationName, value); // Guardar en Supabase
        switch (message.destinationName) {
            case 'sensor/temperatura/tablero':
                elementId = 'temperaturaTablero';
                updateChart(temperaturaTableroChart, tempTableroData, tempTableroLabels, value);
                break;
            case 'sensor/humedad/arandano':
                elementId = 'humedadArandano';
                updateChart(humedadArandanoChart, humedadData, humedadLabels, value);
                break;
            case 'sensor/temperatura/rasberry': // Posible corrección de "rasberry" a "raspberry"
                elementId = 'temperaturaRaspberry';
                updateChart(temperaturaRaspberryChart, tempRaspberryData, tempRaspberryLabels, value);
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
    let timestamp = now.toLocaleTimeString();

    dataArray.push(value);
    labelArray.push(timestamp);

    if (dataArray.length > 200) {
        dataArray.splice(0, dataArray.length - 200);
        labelArray.splice(0, labelArray.length - 200);
    }

    if (chart) {
        chart.data.labels = labelArray;
        chart.data.datasets[0].data = dataArray;
        chart.update();
    }
}


function onFailure(response) {
    console.error('❌ Error de conexión:', response.errorMessage);
}

client.onConnectionLost = function (responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log(`⚠️ Desconexión de MQTT: ${responseObject.errorMessage}`);
    }
};

// Función para cargar datos desde Supabase y graficarlos al iniciar
async function loadDataFromSupabase(chart, dataArray, labelArray, topic) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?topic=eq.${topic}&order=timestamp.desc&limit=1000`, {
        headers: {
            "apikey": SUPABASE_API_KEY,
            "Authorization": `Bearer ${SUPABASE_API_KEY}`
        }
    });

    if (!response.ok) {
        console.error(`❌ Error al obtener datos de Supabase:`, await response.text());
        return;
    }

    const data = await response.json();
    data.reverse(); // Ordenar de más antiguo a más reciente

    dataArray.length = 0;
    labelArray.length = 0;

    data.forEach(entry => {
        dataArray.push(entry.value);
        labelArray.push(new Date(entry.timestamp).toLocaleTimeString());
    });

    if (chart) {
        chart.data.labels = labelArray;
        chart.data.datasets[0].data = dataArray;
        chart.update();
    }
}

// Cargar datos históricos al iniciar
window.onload = () => {
    loadDataFromSupabase(humedadArandanoChart, humedadData, humedadLabels, "sensor/humedad/arandano");
    loadDataFromSupabase(temperaturaTableroChart, tempTableroData, tempTableroLabels, "sensor/temperatura/tablero");
    loadDataFromSupabase(temperaturaRaspberryChart, tempRaspberryData, tempRaspberryLabels, "sensor/temperatura/rasberry");
};
