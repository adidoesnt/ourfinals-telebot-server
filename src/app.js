const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config('./env');

class Server {
    mdb_username = process.env.MDB_USERNAME
    mdb_pass = process.env.MDB_PASSWORD
    mdb_cluster = process.env.MDB_CLUSTER
    mdb_database = process.env.MDB_DATABASE
    mdb_users = process.env.MDB_USERS
    mdb_assignments = process.env.MDB_ASSIGNMENTS
    uri = `mongodb+srv://${this.mdb_username}:${this.mdb_pass}`+
        `@${this.mdb_cluster}.ufb3z.mongodb.net/${this.mdb_database}`+
        `?retryWrites=true&w=majority`;
    user_collection
    assignment_collection
    client = new MongoClient(this.uri, { 
        useNewUrlParser: true, 
        useUnifiedTopology: true, 
        serverApi: ServerApiVersion.v1 
    });

    init() {
        this.client.connect((err) => {
            if(err) {
                console.warn(err);
            } else {
                this.user_collection = this.client.db(this.mdb_database).collection(this.mdb_users);
                this.assignment_collection = this.client.db(this.mdb_database).collection(this.mdb_assignments);
                console.log('connected to database.')
            }
        });
    }
    
    destroy() {
       this.client.close();
    }
}

class Application {
    server = new Server();
    app = express();
    port = Number(process.env.PORT) || 3000
    
    init() {
        this.server.init()
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use((req, res, next) => {
            if (req.headers["x-api-key"] == process.env.API_KEY) {
                next();
            } else {
                return res.status(401).send('unauthorized');
            }
        })
        this.initRoutes()
    }

    initRoutes() {
        this.app.listen(this.port, () => {
            console.log(`server listening at port ${this.port}`)
        });

        this.app.get('/', (req, res) => {
            return res.status(200).send('ourfinals server listening...');
        });

        // USER ENDPOINTS
        this.app.post('/users/add', (req, res) => {
            const userData = req.body;
            this.server.user_collection.insertOne(userData);
            return res.sendStatus(200);
        });

        this.app.get('/users/:username', async (req, res) => {
            const username = req.params.username;
            const user = await this.server.user_collection.findOne({username: username});
            if(user) {
                return res.status(200).send(user);
            } else {
                return res.status(404).send('not found');
            }
        });

        // ASSIGNMENT ENDPOINTS
        this.app.post('/assignments/add', (req, res) => {
            const assignmentData = req.body;
            this.server.assignment_collection.insertOne(assignmentData);
            return res.sendStatus(200);
        });

        this.app.get('/assignments/:id', async (req, res) => {
            const id = new ObjectId(req.params.id);
            const assignment = await this.server.assignment_collection.findOne({ _id: id });
            if(assignment) {
                return res.status(200).send(assignment);
            } else {
                return res.status(404).send('not found');
            }
        });

    }
}

const app = new Application();
app.init();
