const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();


app.use(bodyParser.json());

const users = [];
const PORT = process.env.PORT || 80;

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Simulación de guardado en base de datos
    const user = { username, password: hashedPassword };
    users.push(user);

    res.status(201).send({ message: 'User created' });
});

// Ruta de login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    
    if (user && await bcrypt.compare(password, user.password)) {
        // Generar un token
        const token = jwt.sign({ username: user.username }, 'secret', { expiresIn: '1h' });
        res.status(200).send({ message: 'Authenticated', token });
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
