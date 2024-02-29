require('dotenv').config();

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const axios = require('axios'); // Importa Axios



const app = express();

app.use(bodyParser.json());

app.use(express.static('public'));

const users = [];
const PORT = process.env.PORT || 448;

app.post('/registro', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Simulación de guardado en base de datos
    const user = { username, password: hashedPassword };
    users.push(user);

    res.status(201).send({ message: 'User created' ,PORT });
});

// Ruta de login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    
    if (user && await bcrypt.compare(password, user.password)) {
        // Generar un token
        const token = jwt.sign({ username: user.username }, 'secret', { expiresIn: '1h' });
        res.status(200).send({ message: 'Authenticated', token , PORT });
    } else {
        res.status(400).send({ message: 'User or password is incorrect' });
    }
});

// Ruta protegida
app.get('/protected', (req, res) => {
    // Lógica para verificar el token
    // ...
    res.send('Protected route');
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const httpsAgent = new require('https').Agent({
    rejectUnauthorized: false // Ignora la validación del certificado SSL
});


app.post('/CrearINC', async (req, res) => {
    // Aquí asumimos que el body ya viene formateado correctamente desde el cliente
    const incidentData = req.body;
      
    const config = {
        method: 'post',
        url: 'https://entelqa.service-now.com/api/now/table/incident?sysparm_input_display_value=true',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            // Aquí se configura la autenticación básica
            'Authorization': 'Basic ' + Buffer.from(`${process.env.USERNAMEAPI}:${process.env.PASSWORDAPI}`).toString('base64')
        },
        data : incidentData,
        httpsAgent: httpsAgent
    };

    try {
        const response = await axios(config);
        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al enviar la incidencia' });
    }
});
