const fs = require('fs');
const mqtt = require('mqtt');
const simpleGit = require('simple-git');

const FILE_PATH = 'datos.json'; // Archivo donde se guardarán los datos
const REPO_PATH = '/Users/carlosmunevar/Downloads/llano'; // ⚠️ Cambia esto por la ruta de tu repo local
const git = simpleGit(REPO_PATH);

// Conectar al broker MQTT
const client = mqtt.connect('mqtt://broker.emqx.io');

client.on('connect', () => {
    console.log('✅ Conectado a MQTT');
    client.subscribe('inomax/busdevoltaje');
});

client.on('message', (topic, message) => {
    const voltaje = parseFloat(message.toString());
    console.log(`📩 Voltaje recibido: ${voltaje}V`);

    // Leer archivo JSON existente o crear uno nuevo
    let data = [];
    if (fs.existsSync(FILE_PATH)) {
        data = JSON.parse(fs.readFileSync(FILE_PATH, 'utf-8'));
    }

    // Agregar nueva lectura con timestamp
    data.push({ timestamp: new Date().toISOString(), voltaje });

    // Mantener solo las últimas 30 lecturas
    if (data.length > 30) {
        data.shift();
    }

    // Guardar en el archivo JSON
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));

    // Hacer commit y push a GitHub
    git.add(FILE_PATH)
        .commit(`📊 Actualización de datos: ${new Date().toISOString()}`)
        .push(['origin', 'main'], () => console.log('🚀 Datos subidos a GitHub.'));
});
