import express from 'express';

const app = express();
const port = process.env.PORT || 3000

app.get('/', (req, res) => {
    return res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`server listening at port http://localhost:${port}`)
});

