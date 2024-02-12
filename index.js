import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';

const app = express();
const port = 3000;


const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "library",
  password: "heslo123",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


async function getBooks() {
    let books = [];
    try {
        const result = await db.query("SELECT book.title AS book_title, author.name AS author_name, book.about AS book_about, book.rating AS book_rating FROM book INNER JOIN author ON book.author_id = author.id ORDER BY book.id DESC;");
        books = result.rows;
    }catch (err) {
        // Handle any errors
        console.error(err);
        res.status(500).send("An error occurred while processing your request.");
    }

    return books;
}

async function createNewAuthor(name) {
    try {
        await db.query("INSERT INTO author (name) VALUES ($1)", [name]);
        const result = await db.query("SELECT id FROM author WHERE name = $1", [name]);
        return result.rows[0].id;
    }catch (err) {
        // Handle any errors
        console.error(err);
        res.status(500).send("An error occurred while processing your request.");
    }
}

async function checkAuthor(name) {
    try {
        const result = await db.query("SELECT id FROM author WHERE name = $1", [name]);
        if (result.rows.length > 0) {
            return result.rows[0].id;
        } else {
            const newAuthorID = await createNewAuthor(name);
            return newAuthorID;
        }
    }catch (err) {
        // Handle any errors
        console.error(err);
        res.status(500).send("An error occurred while processing your request.");
    }
}

async function getBooksSortedBy(sortField, sortOrder, res) {
    try {
        let orderClause = '';
        if (sortField === "author") {
            orderClause = "ORDER BY author.name " + sortOrder;
        } else if (sortField === "rating") {
            orderClause = "ORDER BY book.rating " + sortOrder;
        } else if (sortField === "name") {
            orderClause = "ORDER BY book.title " + sortOrder;
        } else {
            // Default sorting criteria if none specified
            orderClause = "ORDER BY author.name ASC";
        }

        const result = await db.query(`SELECT book.title AS book_title, author.name AS author_name, book.about AS book_about, book.rating AS book_rating FROM book INNER JOIN author ON book.author_id = author.id ${orderClause};`);
        const books = result.rows;
        res.render("index.ejs", { books: books });
    }catch (err) {
        // Handle any errors
        console.error(err);
        res.status(500).send("An error occurred while processing your request.");
    }
}

app.get("/", async (req, res) => {
    let books = await getBooks();
    /* console.log(books); */
    res.render('index.ejs', { books: books,  })
});

app.get("/add", async (req, res) => {
    res.render("add.ejs");
});

app.get("/edit", async (req, res) => {
    const noteId = req.query.noteId;
    const bookTitle = req.query.bookTitle;
    const note = req.query.note
    

    try {
        const result = await db.query("SELECT note FROM notes WHERE id = $1", [noteId]);
        if (result.rows.length > 0) {
            const note = result.rows[0].note; // Extract the note value from the query result
            res.render("edit.ejs", { noteId, bookTitle, note });
        } else {
            // Handle case where note is not found
            console.log("Note with ID", noteId, "not found.");
            res.status(404).send("Note not found");
        }
    }catch (err) {
        // Handle any errors
        console.error(err);
        res.status(500).send("An error occurred while processing your request.");
    }
});

app.get("/book", async (req, res) => {
    const bookTitle = req.query.title;

    try {
        const result = await db.query("SELECT Book.id, Author.name AS author_name, Book.title, Book.rating, Book.about FROM Book JOIN Author ON Book.author_id = Author.id WHERE Book.title = $1;",
            [bookTitle]);
        
        const book = {
            title: bookTitle,
            author: result.rows[0].author_name, // Access the author name from the first row
            rating: result.rows[0].rating, // Access the rating from the first row
            about: result.rows[0].about, // Access the about from the first row
            id: result.rows[0].id // Access the ID from the first row
        };

        // Retrieve notes for the book
        const notesResult = await db.query("SELECT id, note FROM notes WHERE book_id = $1;",
            [book.id]); // Use book.id to filter notes
        
        const notes = notesResult.rows;

        res.render("book.ejs", { book: book, notes: notes });
    }catch (err) {
        // Handle any errors
        console.error(err);
        res.status(500).send("An error occurred while processing your request.");
    }
});

app.post("/new", async (req,res) => {
    const book = {
        title: req.body.title,
        author: req.body.author,
        about: req.body.about,
        rating: req.body.rating
    };

    const author_id = await checkAuthor(book.author);

    try {
        await db.query("INSERT INTO book (title, author_id, rating, about) VALUES ($1, $2, $3, $4)",
            [book.title, author_id, book.rating, book.about]);
    }catch (err) {
        // Handle any errors
        console.error(err);
        res.status(500).send("An error occurred while processing your request.");
    }

    res.redirect("/");
});

app.post("/newNote", async (req, res) => {
    try {
        const note = req.body.note; 
        const bookTitle = req.body.bookTitle; 

        // Retrieve the book ID corresponding to the bookTitle
        const bookResult = await db.query("SELECT id FROM book WHERE title = $1", [bookTitle]);
        const bookID = bookResult.rows[0].id; // Access the ID from the first row

        // Insert the note into the database along with the bookID
        await db.query("INSERT INTO notes (note, book_id) VALUES ($1, $2)", [note, bookID]);

        // Redirect the user back to the "/book" page with the bookTitle in the query string
        res.redirect("/book?title=" + encodeURIComponent(bookTitle));
    } catch (err) {
        // Handle any errors
        console.error(err);
        res.status(500).send("An error occurred while processing your request.");
    }
});

app.post("/delete", async(req, res) => {
    const noteId = req.body.noteId;
    const bookTitle = req.body.bookTitle;

    try{
        await db.query("DELETE FROM notes WHERE id = $1", [noteId]);
        res.redirect("/book?title=" + encodeURIComponent(bookTitle));
    }catch (err) {
        // Handle any errors
        console.error(err);
        res.status(500).send("An error occurred while processing your request.");
    }
});

app.post("/save", async(req, res) => {
    const noteId = req.body.noteId;
    const bookTitle = req.body.bookTitle;
    const note = req.body.note;

    console.log(note, bookTitle, noteId);

    try{
        await db.query("UPDATE notes SET note = $1 WHERE id = $2;", [note, noteId]);
        res.redirect("/book?title=" + encodeURIComponent(bookTitle));
    }catch (err) {
        // Handle any errors
        console.error(err);
        res.status(500).send("An error occurred while processing your request.");
    }
});


app.post("/edit", async(req, res) => {
    const noteId = req.body.noteId;
    const bookTitle = req.body.bookTitle;
    const updatedNote = req.body.note;

    res.render("edit.ejs", {noteId:noteId, bookTitle:bookTitle, note:updatedNote});
});


app.get("/byAuthor", async (req, res) => {
    await getBooksSortedBy("author", "ASC", res);
});

app.get("/rating", async (req, res) => {
    await getBooksSortedBy("rating", "DESC", res);
});

app.get("/name", async (req, res) => {
    await getBooksSortedBy("name", "ASC", res);
});


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});