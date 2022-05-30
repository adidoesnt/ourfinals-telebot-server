const express = require('express');
const request = require("supertest");
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
        this.app.post('/users/add', async (req, res) => {
            const userData = req.body;
            const body = await this.server.user_collection.insertOne(userData);
            return res.status(200).send({
                _id: body.insertedId.toString()
            });
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
        this.app.post('/assignments/add', async (req, res) => {
            const assignmentData = req.body;
            const body = await this.server.assignment_collection.insertOne(assignmentData);
            return res.status(200).send({
                _id: body.insertedId.toString()
            });
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

        // COMBINED ENDPOINTS
        this.app.post('/users/:username/assignments_as_student/add', async(req, res) => {
            const assignment_id = req.body['_id'];
            const client = request(req.app);
            const student = client.get(`/users/${req.params.username}`);
            const assignments = student['assignments_as_student'];
            assignments.push(assignment_id);
            const query = { "username": username }
            const update = { "$set": { "assignments_as_student": assignments }}
            const body = await this.server.user_collection.updateOne(query, update);
            return res.sendStatus(200);
        });

        this.app.post('/users/:username/assignments_as_tutor/add', async(req, res) => {
            const assignment_id = req.body['_id'];
            const client = request(req.app);
            const tutor = client.get(`/users/${req.params.username}`);
            const assignments = tutor['assignments_as_tutor'];
            assignments.push(assignment_id);
            const query = { "username": username }
            const update = { "$set": { "assignments_as_tutor": assignments }}
            const body = await this.server.user_collection.updateOne(query, update);
            return res.sendStatus(200);
        });
    }
}

const app = new Application();
app.init();
