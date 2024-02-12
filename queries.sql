CREATE TABLE author (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE book (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100),
    author_id INT REFERENCES author(id), -- Reference to author.id
    rating FLOAT,
    about TEXT
);

CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    note TEXT,
    book_id INT REFERENCES book(id) -- Reference to book.id
);