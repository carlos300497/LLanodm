// Configuración de MQTT
const broker = 'wss://broker.emqx.io:8084/mqtt';
const topics = [
    'sensor/temperatura/tablero',
    'sensor/humedad/arandano',
    'sensor/temperatura/rasberry',
    'inomax/frecuencia',
    'inomax/activacion',
    'inomax/control',
    'inomax/estadoVariador',
    'inomax/temperaturaVariador',
    'inomax/torque',
    'inomax/busdevoltaje'
];
const client = new Paho.Client(broker, "clientId-" + Math.floor(Math.random() * 10000));

// Configuración de Supabase
const SUPABASE_URL = "https://ymvefmbijzqwloeepelx.supabase.co";
const SUPABASE_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltdmVmbWJpanpxd2xvZWVwZWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NjU0MzAsImV4cCI6MjA1ODQ0MTQzMH0.oSdMfCAW3QxjH8O5UsVlDHCHVtWO_sEG9DId3LtTrnk"; // Reemplaza con tu clave
const SUPABASE_TABLE = 'mqtt_readings';  // Cambiar el nombre de la tabla a mqtt_readings

// Historial de datos promediados por hora
let humedadData = [], humedadLabels = [];
let tempTableroData = [], tempTableroLabels = [];
let tempRaspberryData = [], tempRaspberryLabels = [];
let frecuenciaData = [], frecuenciaLabels = [];
let activacionData = [], activacionLabels = [];
let controlData = [], controlLabels = [];
let estadoVariadorData = [], estadoVariadorLabels = [];
let temperaturaVariadorData = [], temperaturaVariadorLabels = [];
let torqueData = [], torqueLabels = [];
let busdevoltajeData = [], busdevoltajeLabels = [];

function createLightweightChart(containerId, title, lineColor) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    // Ajustar el ancho y alto a las dimensiones del contenedor
    const chartWidth = container.clientWidth;
    const chartHeight = container.clientHeight;

    const chart = LightweightCharts.createChart(container, {
        width: chartWidth,
        height: chartHeight,
        layout: {
            backgroundColor: '#ffffff',
            textColor: '#000',
        },
        grid: {
            vertLines: { color: '#e1e1e1' },
            horzLines: { color: '#e1e1e1' },
        },
        timeScale: {
            timeVisible: true,
            secondsVisible: false,
        },
    });

    const series = chart.addLineSeries({
        color: lineColor,
        lineWidth: 2,
    });

    return series;
}

// Al cambiar el tamaño de la ventana, se actualiza el tamaño de los gráficos
window.addEventListener('resize', () => {
    document.querySelectorAll('.chart-container div').forEach(div => {
        const chart = div.querySelector('canvas');
        if (chart) {
            chart.chart.resize();
        }
    });
});
// Crear gráficos
const humedadArandanoChart = createLightweightChart('humedadArandanoChart', 'Humedad (%)', '#36A2EB');
const temperaturaTableroChart = createLightweightChart('temperaturaTableroChart', 'Temperatura Tablero (°C)', '#FF6384');
const temperaturaRaspberryChart = createLightweightChart('temperaturaRaspberryChart', 'Temperatura Raspberry (°C)', '#FFA500');
const frecuenciaChart = createLightweightChart('frecuenciaChart', 'Frecuencia (Hz)', '#00FF00');
const activacionChart = createLightweightChart('activacionChart', 'Activación', '#0000FF');
const controlChart = createLightweightChart('controlChart', 'Control', '#8B4513');
const estadoVariadorChart = createLightweightChart('estadoVariadorChart', 'Estado Variador', '#FF1493');
const temperaturaVariadorChart = createLightweightChart('temperaturaVariadorChart', 'Temperatura Variador (°C)', '#FFD700');
const torqueChart = createLightweightChart('torqueChart', 'Torque (Nm)', '#A52A2A');
const busdevoltajeChart = createLightweightChart('busdevoltajeChart', 'Bus de Voltaje (V)', '#FF6347');

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
        let value = parseFloat(message.payloadString.replace(/\[|\]|"/g, "")); // Eliminar corchetes y comillas
        
        sendDataToSupabase(message.destinationName, value); // Guardar en Supabase
        switch (message.destinationName) {
            case 'sensor/temperatura/tablero':
                elementId = 'temperaturaTablero';
                updateLightweightChart(temperaturaTableroChart, value);
                break;
            case 'sensor/humedad/arandano':
                elementId = 'humedadArandano';
                updateLightweightChart(humedadArandanoChart, value);
                break;
            case 'sensor/temperatura/rasberry':
                elementId = 'temperaturaRaspberry';
                updateLightweightChart(temperaturaRaspberryChart, value);
                break;
            case 'inomax/frecuencia':
                elementId = 'frecuencia';
                updateLightweightChart(frecuenciaChart, value);
                break;
            case 'inomax/activacion':
                elementId = 'activacion';
                updateLightweightChart(activacionChart, value);
                break;
            case 'inomax/control':
                elementId = 'control';
                updateLightweightChart(controlChart, value);
                break;
            case 'inomax/estadoVariador':
                elementId = 'estadoVariador';
                updateLightweightChart(estadoVariadorChart, value);
                break;
            case 'inomax/temperaturaVariador':
                elementId = 'temperaturaVariador';
                updateLightweightChart(temperaturaVariadorChart, value);
                break;
            case 'inomax/torque':
                elementId = 'torque';
                updateLightweightChart(torqueChart, value);
                break;
            case 'inomax/busdevoltaje':
                elementId = 'busdevoltaje';
                updateLightweightChart(busdevoltajeChart, value);
                break;
            default:
                console.warn(`⚠️ Tópico desconocido: ${message.destinationName}`);
                return;
        }

        let element = document.getElementById(elementId);
        if (element) {
            element.innerText = message.payloadString;
        } else {
            console.error(`❌ Elemento '${elementId}' no encontrado`);
        }
    };
}

// Enviar datos a Supabase
async function sendDataToSupabase(topic, value) {
    try {
        const data = { topic, value, time: new Date().toISOString() };  // Cambiar 'timestamp' por 'time'

        const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_API_KEY,
                "Authorization": `Bearer ${SUPABASE_API_KEY}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        console.log(`📡 Enviado a Supabase: ${topic} -> ${value}`);
    } catch (error) {
        console.error(`❌ Error al enviar a Supabase: ${error.message}`);
    }
}

// Función para actualizar gráfico con todos los datos almacenados en Supabase
async function loadDataFromSupabase(chart, dataArray, labelArray, topic) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?topic=eq.${topic}&order=time.asc`, {  // Cambiar 'timestamp' por 'time'
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
        dataArray.length = 0;
        labelArray.length = 0;

        data.forEach(entry => {
            const date = new Date(entry.time);  // Cambiar 'timestamp' por 'time'
            const timestamp = Math.floor(date.getTime() / 1000); // Convertir a segundos

            const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

            dataArray.push(entry.value);
            labelArray.push(formattedDate);

            // Actualizar la serie de gráficos con los datos históricos
            chart.update({
                time: timestamp,
                value: entry.value
            });
        });

        console.log(`✅ Datos cargados: ${data.length} registros para el tópico "${topic}"`);
    } catch (error) {
        console.error(`❌ Error al cargar datos desde Supabase: ${error.message}`);
    }
}

// Función para actualizar gráficos en tiempo real con promedio de 5 lecturas
function updateLightweightChart(series, value) {
    let now = new Date();
    let timestamp = Math.floor(now.getTime() / 1000); // Tiempo en segundos

    series.update({ time: timestamp, value: value });
}

function onFailure(response) {
    console.error('❌ Error de conexión:', response.errorMessage);
}

client.onConnectionLost = function (responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log(`⚠️ Desconexión de MQTT: ${responseObject.errorMessage}`);
    }
};

// Cargar datos históricos al iniciar
window.onload = () => {
    loadDataFromSupabase(humedadArandanoChart, humedadData, humedadLabels, "sensor/humedad/arandano");
    loadDataFromSupabase(temperaturaTableroChart, tempTableroData, tempTableroLabels, "sensor/temperatura/tablero");
    loadDataFromSupabase(temperaturaRaspberryChart, tempRaspberryData, tempRaspberryLabels, "sensor/temperatura/rasberry");
    loadDataFromSupabase(frecuenciaChart, frecuenciaData, frecuenciaLabels, "inomax/frecuencia");
    loadDataFromSupabase(activacionChart, activacionData, activacionLabels, "inomax/activacion");
    loadDataFromSupabase(controlChart, controlData, controlLabels, "inomax/control");
    loadDataFromSupabase(estadoVariadorChart, estadoVariadorData, estadoVariadorLabels, "inomax/estadoVariador");
    loadDataFromSupabase(temperaturaVariadorChart, temperaturaVariadorData, temperaturaVariadorLabels, "inomax/temperaturaVariador");
    loadDataFromSupabase(torqueChart, torqueData, torqueLabels, "inomax/torque");
    loadDataFromSupabase(busdevoltajeChart, busdevoltajeData, busdevoltajeLabels, "inomax/busdevoltaje");
};
