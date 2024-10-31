const express = require("express");
const cors = require("cors");
const app = express();
const port = 3000;
const jwt = require('jsonwebtoken');
const secret_jwt = 'azerty12345';

app.use(cors());
app.use(express.json());

const mysql = require("mysql2");
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "tier_list_dfs_24",
    connectionLimit: 10,
});

app.post("/login", (req, res) => {
    const utilisateur = req.body;

    connection.execute(
        `SELECT id, blocked
         FROM utilisateur u
         WHERE u.email = ?
           AND u.password = ?`,
        [utilisateur.email, utilisateur.password],
        (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).send(JSON.stringify({ "message": "Server error" }));
            }

            if (rows.length === 0) {
                res.status(403).send(JSON.stringify({ "message": "cet utilisateur n'existe pas" }));
            } else {
                const user = rows[0];

                if (user.blocked) {
                    // If the user is blocked, return a 403 status with a specific message
                    res.status(403).send(JSON.stringify({ "message": "Compte bloqué" }));
                } else {
                    // Generate and send JWT token for non-blocked users
                    const jwt_utilisateur = jwt.sign({ sub: user.id }, secret_jwt, {});
                    res.status(200).send(JSON.stringify({ jwt: jwt_utilisateur }));
                }
            }
        }
    );
});


app.get("/categories", (req, res) => {
    connection.query(` SELECT url, i.id AS id_image, c.id as id_categorie, nom AS nom_categorie
                       FROM image i
                                RIGHT JOIN categorie c ON i.id_categorie = c.id
                       WHERE c.id_utilisateur = 1`, (err, rows) => {
        if (err) throw err;

        const categories = rows.reduce((accumulateur, image) => {
            const categorieExistante = accumulateur.filter(
                (categorie) => categorie.nom === image.nom_categorie
            );

            if (categorieExistante.length >= 1) {
                categorieExistante[0].images.push(image.url);
            } else {
                accumulateur.push({
                    nom: image.nom_categorie,
                    id: image.id_categorie,
                    images: image.url ? [image.url] : [],
                });
            }

            return accumulateur;
        }, []);

        res.send(JSON.stringify(categories));
    });
});


// Users getting - endpoint
app.get("/utilisateurs", (req, res) => {
    connection.query(`SELECT id, email, password FROM utilisateur u`, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send(JSON.stringify({ message: 'Server error' }));
        }
        console.log(JSON.stringify((rows)))
        res.send(JSON.stringify(rows));
    });
});


// Block the user from connexion - ENDPOINT
app.put("/utilisateurs/:id/block", (req, res) => {
    const userId = req.params.id;

    connection.query(
        `UPDATE utilisateur SET blocked = 1 WHERE id = ?`,
        [userId],
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send(JSON.stringify({ message: 'Server error' }));
            }
            if (result.affectedRows === 0) {
                return res.status(404).send(JSON.stringify({ message: 'User not found' }));
            }
            res.send(JSON.stringify({ message: 'User blocked successfully' }));
        }
    );
});

// Unblock user - endpoint
app.put("/utilisateurs/:id/unblock", (req, res) => {
    const userId = req.params.id;

    connection.query(
        `UPDATE utilisateur SET blocked = 0 WHERE id = ?`,
        [userId],
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send(JSON.stringify({ message: 'Server error' }));
            }
            if (result.affectedRows === 0) {
                return res.status(404).send(JSON.stringify({ message: 'User not found' }));
            }
            res.send(JSON.stringify({ message: 'User unblocked successfully' }));
        }
    );
});



app.listen(port, () => {
    console.log(`Example app listening on port ${port} !!!!!!`);
});
