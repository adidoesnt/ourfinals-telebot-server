import express, { urlencoded } from 'express';
const { MongoClient, ServerApiVersion } = require('mongodb');
import { Collection } from 'mongodb';

class Server {
    mdb_username: string = "ourfinalsdev" as string;
    mdb_pass: string = "3VDLSpQj4263Yuih" as string;
    mdb_cluster: string = "ourfinals-cluster" as string;
    mdb_database: string = "ourfinals-database" as string;
    mdb_users: string = "ourfinals-users" as string;
    uri: string = `mongodb+srv://${this.mdb_username}:${this.mdb_pass}`+
        `@${this.mdb_cluster}.ufb3z.mongodb.net/${this.mdb_database}`+
        `?retryWrites=true&w=majority`;
    user_collection: Collection<Document> | undefined;
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
            return res.send('server listening...');
        });

        this.app.post('/api/users/add', (req, res) => {
            const userData = req.body;
            this.server.user_collection?.insertOne(userData);
            return res.sendStatus(200);
        });
    }
}

const app = new Application();
app.init();
