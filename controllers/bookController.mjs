import async from 'async'
import validator from 'express-validator'

import book from '../models/book.mjs'
import author from '../models/author.mjs'
import genre from '../models/genre.mjs'
import bookinstance from '../models/bookinstance.mjs'

// Страница приветствия.
export function index(req, res) {
    async.parallel({
        bookCount: function(callback) {
            book.countDocuments({}, callback) // Нужно передать пустой объект как условие выборки для извлечения всех документов из данной коллекции
            // countDocuments не работает, работает только просто count
        },
        bookinstanceCount: function(callback) {
            bookinstance.countDocuments({}, callback)
        },
        bookinstanceAvailableCount: function(callback) {
            bookinstance.countDocuments({status: 'Доступен'}, callback)
        },
        authorCount: function(callback) {
            author.countDocuments({}, callback)
        },
        genreCount: function(callback) {
            genre.countDocuments({}, callback)
        }
    }, function(err, results) {
        res.render('index', { title: 'Домашняя страница местной библиотеки', error: err, data: results })
    })
};

// Показать список всех книг.
export function bookList(req, res, next) {
    book.find({}, 'title author')
        .populate({path: 'author'})
        .exec(function(err, bookList) {
            if (err) { return next(err) }
            // Успешное завершение, поэтому нужно отрисовать
            res.render('bookList', { title: 'Список книг', bookList})
        })
};

// Показать подробную страницу для заданной книги.
export function bookDetail(req, res, next) {
    async.parallel({
        book: function(callback) {
            book.findById(req.params.id)
                .populate('author')
                .populate('genre')
                .exec(callback)
        },
        bookinstance: function(callback) {
            bookinstance.find({ 'book': req.params.id })
                .exec(callback)
        }
    }, function(err, results) {
        if (err) { return next(err) }
        if (results.book === null) { // Результаты отсутствуют.
            const err = new Error('Книга не найдена')
            err.status = 404
            return next(err)
        }
        // Успешное завершение, поэтому нужно отрисовать
        res.render('bookDetail', { title: results.book.title, book: results.book, bookinstances: results.bookinstance })
    })
};

// Показать форму создания книги по запросу GET.
export function bookCreateGet(req, res, next) {
    // Запросить авторов, один из которых написал книгу, и жанры, к одному из которых относится книга, которая добавляется.
    async.parallel({
        authors: function(callback) {
            author.find(callback)
        },
        genres: function(callback) {
            genre.find(callback)
        }
    }, function(err, results) {
        if (err) { return next(err) }
        res.render('bookForm', { title: 'Добавить книгу', authors: results.authors, genres: results.genres })
    })
};

// Создать книгу по запросу POST.
export const bookCreatePost = [
    // Преобразовать единичный жанр в массив из одного элемента.
    (req, res, next) => {
        if (!(req.body.genre instanceof Array)) {
            if (typeof req.body.genre === 'undefined')
                req.body.genre = []
            else
                req.body.genre = new Array(req.body.genre)
        }
        next()
    },

    // Проверить контролы.
    validator.body('title', 'Название книги должно быть заполнено.').trim().isLength({ min: 1 }),
    validator.body('author', 'Автор должен быть указан.').trim().isLength({ min: 1 }),
    validator.body('summary', 'Краткое содержание должно быть приведено.').trim().isLength({ min: 1 }),
    validator.body('isbn', 'ISBN должен быть заполнен.').trim().isLength({ min: 1 }),

    // Очистить контролы с помощью символов подстановки.
    validator.body('title').escape(),
    validator.body('author').escape(),
    validator.body('summary').escape(),
    validator.body('isbn').escape(),

    // Выполнить запрос после проверки и очистки.
    (req, res, next) => {
        // Извлечь ошибки проверки из запроса.
        const errors = validator.validationResult(req)

        // Добавить объект книги с заэкранированными данными, у которых также отсечены начальные и хвостовые пробелы.
        const currentBook = new book(
            {
                title: req.body.title,
                author: req.body.author,
                summary: req.body.summary,
                isbn: req.body.isbn,
                genre: req.body.genre
            })

        if (!errors.isEmpty()) {
            // Ошибки существуют. Отрисовать форму повторно с очищенными значениями и сообщениями об ошибке.
            // Запросить авторов, один из которых написал книгу, и жанры, к одному из которых относится книга, для отображения формы.
            async.parallel({
                authors: function(callback) {
                    author.find(callback)
                },
                genres: function(callback) {
                    genre.find(callback)
                }
            }, function(err, results) {
                if (err) { return next(err) }
                // Выделить выбранные жанры как помеченные.
                for (let i = 0; i < results.genres.length; i++) {
                    if (currentBook.genre.indexOf(results.genres[i]._id) > -1) {
                        results.genres[i].checked = 'true'
                    }
                }
                res.render('bookForm', {
                    title: 'Добавить книгу',
                    authors: results.authors,
                    genres: results.genres,
                    book: currentBook,
                    errors: errors.array()
                })
            })
            return
        }
        else {
            // Данные из формы верны. Сохранить книгу.
            currentBook.save(function(err) {
                if (err) { return next(err) }
                // Книга сохранена - перенаправить на страницу с информацией о ней.
                res.redirect(currentBook.url)
            })
        }
    }
];

// Показать форму удаления книги по запросу GET.
export function bookDeleteGet(req, res, next) {
    async.parallel({
        book: function(callback) {
            book.findById(req.params.id).exec(callback)
        },
        bookBookinstances: function(callback) {
            bookinstance.find({ 'book': req.params.id }).exec(callback)
        }
    }, function(err, results) {
        if (err) { return next(err) }
        if (results.book === null) { // Результаты отсутствуют.
            res.redirect('/catalog/books')
        }
        // Успешное завершение, поэтому нужно отрисовать
        res.render('bookDelete', { title: 'Удаление книги', book: results.book, bookBookinstances: results.bookBookinstances })
    })
};

// Удалить книгу по запросу POST.
export function bookDeletePost(req, res, next) {
    async.parallel({
        book: function(callback) {
            book.findById(req.body.bookid).exec(callback)
        },
        bookBookinstances: function(callback) {
            bookinstance.find({ 'book': req.body.bookid }).exec(callback)
        }
    }, function(err, results) {
        if (err) { return next(err) }
        // Успешное завершение
        if (results.bookBookinstances.length > 0) {
            // В библиотеке один или более экземпляров данной книги. Визуализация выполняется так же, как и по запросу GET.
            res.render('bookDelete', { title: 'Удаление книги', book: results.book, bookBookinstances: results.bookBookinstances })
            return
        }
        else {
            // Для данной книги нет никаких экземпляров книги. Удалить объект книги и перенаправить в список книг.
            book.findByIdAndRemove(req.body.bookid, function deleteBook(err) {
                if (err) { return next(err) }
                // Успешное завершение. Перейти к списку книг.
                res.redirect('/catalog/books')
            })
        }
    })
};

// Показать форму обновления книги по запросу GET.
export function bookUpdateGet(req, res, next) {
    // Запросить книгу, авторов и жанры для размещения в форме.
    async.parallel({
        book: function(callback) {
            book.findById(req.params.id).populate('author').populate('genre').exec(callback)
        },
        authors: function(callback) {
            author.find(callback)
        },
        genres: function(callback) {
            genre.find(callback)
        }
    }, function(err, results) {
        if (err) { return next(err) }
        if (results.book === null) { // Результаты отсутствуют.
            const err = new Error('Книга не найдена')
            err.status = 404
            return next(err)
        }
        // Успешное завершение. Выделить выбранные жанры как помеченные.
        for (let allGIter = 0; allGIter < results.genres.length; allGIter++) {
            for (let bookGIter = 0; bookGIter < results.book.genre.length; bookGIter++) {
                if (results.genres[allGIter]._id.toString() === results.book.genre[bookGIter]._id.toString()) {
                    results.genres[allGIter].checked = 'true'
                }
            }
        }
        res.render('bookForm', { title: 'Обновить книгу', authors: results.authors, genres: results.genres, book: results.book })
    })
};

// Обновить книгу по запросу POST.
export const bookUpdatePost = [
    // Преобразовать единичный жанр в массив из одного элемента, не указанный жанр - в пустой массив.
    (req, res, next) => {
        if (!(req.body.genre instanceof Array)) {
            if (typeof req.body.genre === 'undefined') {
                req.body.genre = []
            }
            else {
                req.body.genre = new Array(req.body.genre)
            }
        }
        next()
    },

    // Проверить контролы.
    validator.body('title', 'Название книги должно быть заполнено.').trim().isLength({ min: 1 }),
    validator.body('author', 'Автор должен быть указан.').trim().isLength({ min: 1 }),
    validator.body('summary', 'Краткое содержание должно быть приведено.').trim().isLength({ min: 1 }),
    validator.body('isbn', 'ISBN должен быть заполнен.').trim().isLength({ min: 1 }),

    // Очистить контролы с помощью символов подстановки.
    validator.body('title').trim().escape(),
    validator.body('author').trim().escape(),
    validator.body('summary').trim().escape(),
    validator.body('isbn').trim().escape(),
    validator.body('genre.*').trim().escape(),

    // Выполнить запрос после проверки и очистки.
    (req, res, next) => {
        // Извлечь ошибки проверки из запроса.
        const errors = validator.validationResult(req)

        // Добавить объект книги со старым идентификатором, с заэкранированными данными, у которых также отсечены начальные и хвостовые пробелы.
        const currentBook = new book(
            {
                title: req.body.title,
                author: req.body.author,
                summary: req.body.summary,
                isbn: req.body.isbn,
                genre: (typeof req.body.genre === 'undefined') ? [] : req.body.genre,
                _id: req.params.id // Существующий идентификатор предотвращает создание нового.
            })

        if (!errors.isEmpty()) {
            // Ошибки существуют. Отрисовать форму повторно с очищенными значениями и сообщениями об ошибке.
            // Запросить авторов, один из которых написал книгу, и жанры, к одному из которых относится книга, для отображения формы.
            async.parallel({
                authors: function(callback) {
                    author.find(callback)
                },
                genres: function(callback) {
                    genre.find(callback)
                }
            }, function(err, results) {
                if (err) { return next(err) }

                // Выделить выбранные жанры как помеченные.
                for (let i = 0; i < results.genres.length; i++) {
                    if (currentBook.genre.indexOf(results.genres[i]._id) > -1) {
                        results.genres[i].checked = 'true'
                    }
                }
                res.render('bookForm', {
                    title: 'Обновить книгу',
                    authors: results.authors,
                    genres: results.genres,
                    book: currentBook,
                    errors: errors.array()
                })
            })
            return
        }
        else {
            // Данные из формы верны. Обновить книгу.
            book.findByIdAndUpdate(req.params.id, currentBook, {}, function(err, book) {
                if (err) { return next(err) }
                // Книга обновлена - перенаправить на страницу с информацией о ней.
                res.redirect(book.url)
            })
        }
    }
];
