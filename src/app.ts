import express from 'express';
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
import { Collection } from 'mongodb';
require('dotenv').config('./env');

class Server {
    mdb_username: string = process.env.MDB_USERNAME as string;
    mdb_pass: string = process.env.MDB_PASSWORD as string;
    mdb_cluster: string = process.env.MDB_CLUSTER as string;
    mdb_database: string = process.env.MDB_DATABASE as string;
    mdb_users: string = process.env.MDB_USERS as string;
    mdb_assignments: string = process.env.MDB_ASSIGNMENTS as string;
    uri: string = `mongodb+srv://${this.mdb_username}:${this.mdb_pass}`+
        `@${this.mdb_cluster}.ufb3z.mongodb.net/${this.mdb_database}`+
        `?retryWrites=true&w=majority`;
    user_collection: Collection<Document> | undefined;
    assignment_collection: Collection<Document> | undefined;
    client = new MongoClient(this.uri, { 
        useNewUrlParser: true, 
        useUnifiedTopology: true, 
        serverApi: ServerApiVersion.v1 
    });

    init() {
        this.client.connect((err: Error) => {
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
    port = process.env.PORT || 3000

    init() {
        this.server.init()
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.initRoutes()
    }

    initRoutes() {
        this.app.listen(this.port, () => {
            console.log(`server listening at port http://localhost:${this.port}`)
        });

        this.app.get('/', (req, res) => {
            return res.send('ourfinals server listening...');
        });

        // USER ENDPOINTS
        this.app.post('/users/add', (req, res) => {
            const userData = req.body;
            this.server.user_collection?.insertOne(userData);
            return res.sendStatus(200);
        });

        this.app.get('/users/:username', async (req, res) => {
            const username = req.params.username;
            const user = await this.server.user_collection?.findOne({username: username});
            return res.send(user);
        });

        // ASSIGNMENT ENDPOINTS
        this.app.post('/assignments/add', (req, res) => {
            const assignmentData = req.body;
            this.server.assignment_collection?.insertOne(assignmentData);
            return res.sendStatus(200);
        });

        this.app.get('/assignments/:id', async (req, res) => {
            const id = new ObjectId(req.params.id);
            const assignment = await this.server.assignment_collection?.findOne({ _id: id });
            return res.send(assignment);
        });

    }
}

const app = new Application();
app.init();
