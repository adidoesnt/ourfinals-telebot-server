/**            OURFINALS TELEGRAM BOT SERVER             **/
/**      AUTHORED BY ADITYA BANERJEE AND PARTH KABRA     **/
/**              V1.0.1 (TEST) - 2 MAY 2022              **/

const express = require('express');
const request = require("request")
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
    url = 'https://ourfinals-telebot-server.herokuapp.com/'
    
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

        this.app.get('/users/username/:username', async (req, res) => {
            const username = req.params.username;
            const user = await this.server.user_collection.findOne({username: username});
            if(user) {
                return res.status(200).send(user);
            } else {
                return res.status(404).send('not found');
            }
        });

        this.app.get('users/faculty/:faculty', async (req, res) => {
            const faculty = req.params.faculty;
            const cursor = await this.server.user_collection.find({faculty: faculty});
            const users = await cursor.toArray();
            if(!users || users == [] || users.length == 0) {
                return res.status(404).send([]);
            } else {
                return res.status(200).send(users);
            }
        })

        // ASSIGNMENT ENDPOINTS
        this.app.post('/assignments/add', async (req, res) => {
            const assignmentData = req.body;
            const body = await this.server.assignment_collection.insertOne(assignmentData);
            return res.status(200).send({
                _id: body.insertedId.toString()
            });
        });

        this.app.get('/assignments/id/:id', async (req, res) => {
            const id = new ObjectId(req.params.id);
            const assignment = await this.server.assignment_collection.findOne({ _id: id });
            if(assignment) {
                return res.status(200).send(assignment);
            } else {
                return res.status(404).send('not found');
            }
        });

        this.app.post('/assignments/id/:id/tutor/add', async (req, res) => {
            const tutor_username = req.body['tutor_username'];
            const assignment_id = req.params.id
            const query = { "_id": ObjectId(assignment_id) }
            const update = { "$set": { "tutor_username": tutor_username }}
            await this.server.assignment_collection.updateOne(query, update);
            return res.sendStatus(200);
        });

        this.app.get('/assignments/code/:code', async (req, res) => {
            const code = req.params.code.toUpperCase();
            const query = {
                $and: [
                    { module_code: code },
                    { tutor_username: "" }
                ]
            }
            const options = { 
                sort: { title: 1 },
                projection: { 
                    _id: 1, 
                    module_code: 1, 
                    title: 1, 
                    description: 1, 
                    file_link: 1, 
                    student_username: 1 
                }
            }
            const cursor = await this.server.assignment_collection.find(query, options);
            const assignments = await cursor.toArray();
            if(!assignments || assignments == [] || assignments.length == 0) {
                return res.status(404).send([]);
            } else {
                return res.status(200).send(assignments);
            }
        });

        // COMBINED ENDPOINTS
        this.app.post('/users/:username/assignments_as_student/add', async (req, res) => {
            const assignment_id = req.body['_id'];
            const username = req.params.username
            const self = this;
            request(`${this.url}users/username/${username}`, async function (error, response, body) {
                const result = await response.body;
                const student = JSON.parse(result);
                const assignments = student["assignments_as_student"]
                    ? student["assignments_as_student"]
                    : [];
                assignments.push(assignment_id);
                const query = { "username": username }
                const update = { "$set": { "assignments_as_student": assignments }}
                await self.server.user_collection.updateOne(query, update);
                return res.sendStatus(200);
            }).setHeader('x-api-key', process.env.API_KEY);
        });

        this.app.post('/users/:username/assignments_as_tutor/add', async(req, res) => {
            const assignment_id = req.body['_id'];
            const username = req.params.username
            const self = this;
            request(`${this.url}users/username/${username}`, async function (error, response, body) {
                const result = await response.body;
                const tutor = JSON.parse(result);
                const assignments = tutor["assignments_as_tutor"]
                    ? tutor["assignments_as_tutor"]
                    : [];
                assignments.push(assignment_id);
                const query = { "username": username }
                const update = { "$set": { "assignments_as_tutor": assignments }}
                await self.server.user_collection.updateOne(query, update);
                return res.sendStatus(200);
            }).setHeader('x-api-key', process.env.API_KEY);
        });
    }
}

const app = new Application();
app.init();
