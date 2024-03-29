const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const axios = require('axios');
const dotenv = require('dotenv');
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const fs = require("fs");
const https = require('https');

dotenv.config();

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

const PORT = process.env.PORT || 448;
const subscriptionKey = process.env.SPEECH_KEY;
const serviceRegion = process.env.SPEECH_REGION;
//const filename = process.env.FILE_NAME_LOCAL;

//console.log("Transcribing from: " + filename);

//process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const httpsAgent = new https.Agent({ rejectUnauthorized: false });


var speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
speechConfig.speechRecognitionLanguage = "es-MX";


const usuariosArray =  process.env.ARRUSUARIOS.split(',');
const passwordsArray = process.env.ARRPASSWORD.split(',');

// Crea un objeto que mapee usuarios a contraseñas
const users = usuariosArray.reduce((obj, usuario, index) => {
  obj[usuario] = passwordsArray[index];
  return obj;
}, {});


async function handleCrearINC(incidentData, res,logEntry) {
    const config = {
        method: 'post',
        url: 'https://entelqa.service-now.com/api/now/table/incident?sysparm_input_display_value=true',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Basic ' + Buffer.from(`${process.env.USERNAMEAPI}:${process.env.PASSWORDAPI}`).toString('base64')
        },
        data: {
            "sys_domain": "6ad48d221b4564101df3bb7f034bcb57",
            "company": "Comercial Kaufmann S A",
            "caller_id": "coe bot 004",
            "state": "Nuevo",
            "u_std_responsible": "Entel",
            "business_service": "Serv Ti - Incidencias Generales",
            "service_offering": "Reportar Incidente",
            "u_gbl_service_string": "Reportar Incidente",
            "category": "Incidentes Plataformas, De Eventos Y Monitoreo",
            "subcategory": "Falla Servicio",
            "u_std_fail_condition": "sin_perdida",
            "impact": "2-Significativo/Amplio",
            "urgency": "4-Baja",
            "assignment_group": "Sdc_Sop_N1_Inc",
            "short_description": "Incidente generado por IA",
            "description": `${incidentData.text}`,
            "u_gbl_operational_unit": "SSGG"
        },
        httpsAgent: httpsAgent
    };

    try {
        const response = await axios(config);
        logEntry.events.push({
            action: "Creación de incidente en ServiceNow",
            status: "Éxito",
            message: "Incidencia creada correctamente en ServiceNow.",
            incidentID: response.data.result.number // Suponiendo que esta es la estructura de la respuesta
        });
        console.log(JSON.stringify(logEntry));
        res.status(200).json({ success: true, message: 'Incidencia creada correctamente', data: response.data });
    } catch (error) {
        logEntry.events.push({
            action: "Creación de incidente en ServiceNow",
            status: "Error",
            message: "Error al enviar la incidencia.",
            error: error.message
        });
        console.error(JSON.stringify(logEntry));
        res.status(500).json({ success: false, message: 'Error al enviar la incidencia' });
    }
}



/**
 * async function handleCrearINC(incidentData, res) {
    const config = {
        method: 'post',
        url: 'https://entelqa.service-now.com/api/now/table/incident?sysparm_input_display_value=true',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Basic ' + Buffer.from(`${process.env.USERNAMEAPI}:${process.env.PASSWORDAPI}`).toString('base64')
        },
        data: {
            "sys_domain": "6ad48d221b4564101df3bb7f034bcb57",
            "company": "Comercial Kaufmann S A",
            "caller_id": "coe bot 004",
            "state": "Nuevo",
            "u_std_responsible": "Entel",
            "business_service": "Serv Ti - Incidencias Generales",
            "service_offering": "Reportar Incidente",
            "u_gbl_service_string": "Reportar Incidente",
            "category": "Incidentes Plataformas, De Eventos Y Monitoreo",
            "subcategory": "Falla Servicio",
            "u_std_fail_condition": "sin_perdida",
            "impact": "2-Significativo/Amplio",
            "urgency": "4-Baja",
            "assignment_group": "Sdc_Sop_N1_Inc",
            "short_description": "Incidente generado por IA",
            "description": `${incidentData.text}`,
            "u_gbl_operational_unit": "SSGG"
        },
        httpsAgent: httpsAgent
    };

    try {
        const response = await axios(config);
        console.log("Response from ServiceNow:", response.data);
        res.status(200).json({ success: true, message: 'Incidencia creada correctamente', data: response.data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al enviar la incidencia' });
    }
}
 * 
 */

// Ejemplo de cómo podría actualizarse fromBufferOrBase64
async function fromBufferOrBase64(audioInput, res, logEntry) {
    const buffer = (typeof audioInput === 'string') ? Buffer.from(audioInput, 'base64') : audioInput;
    let audioConfig = sdk.AudioConfig.fromWavFileInput(buffer);
    let speechRecognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    speechRecognizer.recognizeOnceAsync(result => {
        if (result.reason === sdk.ResultReason.RecognizedSpeech) {
            logEntry.events.push({ action: "Reconocimiento de habla", status: "Éxito", message: `Texto reconocido: ${result.text}` });
            handleCrearINC({ text: result.text }, res, logEntry);
        } else {
            logEntry.events.push({ action: "Reconocimiento de habla", status: "Error", message: "Error durante el reconocimiento del habla." });
            console.error(JSON.stringify(logEntry));
            res.status(500).json({ success: false, message: 'Error durante la transcripción del audio' });
        }
        speechRecognizer.close();
    });
}



//Transforma buffer a audio
/**app.post('/login', async (req, res) => {
    const { username, password, audioBuffer } = req.body;

    if (users[username] && password === users[username]) {
        
        try {
            // Verifica si audioBuffer está presente y no está vacío
            if (audioBuffer) {
                // Convierte la cadena que representa el array a un array real
                const audioArray = JSON.parse(audioBuffer);
                
                // Convierte el array a Buffer
                const buffer = Buffer.from(audioArray);

                await fromBufferOrBase64(buffer, res);
            } else {
                res.status(200).send({ message: 'Authenticated', token });
            }
        } catch (error) {
            console.error("Error during speech recognition:", error);
            res.status(500).send({ message: 'Internal Server Error', error: error.message });
        }
    } else {
        res.status(400).send({ message: 'User or password is incorrect' });
    }
});
 * */
app.post('/login', async (req, res) => {
    const { username, password, audioBuffer, empresa, cliente } = req.body;
    
    // Inicializa el objeto de log
    let logEntry = {
        timestamp: new Date().toISOString(),
        empresa,
        cliente,
        username,
        events: [] // Este array almacenará los eventos del proceso
    };

    if (users[username] && password === users[username]) {
        // Agrega un evento al log
        logEntry.events.push({ action: "Inicio de sesión", status: "Éxito", message: "Usuario autenticado con éxito." });

        try {
            if (audioBuffer) {
                const audioArray = JSON.parse(audioBuffer);    
                // Convierte el array a Buffer
                const buffer = Buffer.from(audioArray);
                await fromBufferOrBase64(buffer, res, logEntry); // Pasa el logEntry a la función
            } else {
                // Agrega un evento al log si no hay audioBuffer
                logEntry.events.push({ action: "Procesamiento de audio", status: "Error", message: "No se proporcionó buffer de audio." });
                console.log(JSON.stringify(logEntry));
                res.status(200).send({ message: 'Authenticated', token });
            }
        } catch (error) {
            logEntry.events.push({ action: "Procesamiento de audio", status: "Error", message: `Error: ${error.message}` });
            console.error(JSON.stringify(logEntry));
            res.status(500).send({ message: 'Internal Server Error', error: error.message });
        }
    } else {
        logEntry.events.push({ action: "Inicio de sesión", status: "Error", message: "Usuario o contraseña incorrectos." });
        console.log(JSON.stringify(logEntry)); // Loguea el evento de error
        res.status(400).send({ message: 'User or password is incorrect' });
    }
});




/**
 * Transforma base64 a audio
 * app.post('/login', async (req, res) => {
    const { username, password, audioBuffer } = req.body;
    const user = users.find(u => u.username === username);

    if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ username: user.username }, 'secret', { expiresIn: '1h' });

        try {
            if (audioBuffer) {
                await fromBufferOrBase64(audioBuffer, res);
            } else {
                res.status(200).send({ message: 'Authenticated', token });
            }
        } catch (error) {
            console.error("Error during speech recognition:", error);
            res.status(500).send({ message: 'Internal Server Error' });
        }
    } else {
        res.status(400).send({ message: 'User or password is incorrect' });
    }
});

 * 
 */

// Tu código restante aquí...

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
