import async from 'async'
import validator from 'express-validator'

import genre from '../models/genre.mjs'
import book from '../models/book.mjs'

// Показать список всех жанров.
export function genreList(req, res, next) {
    genre.find()
        .sort([['name', 'ascending']])
        .exec(function(err, genreList) {
            if (err) { return next(err) }
            // Успешное завершение, поэтому нужно отрисовать
            res.render('genreList', { title: 'Список жанров', genreList })
        })
};

// Показать подробную страницу для заданного жанра.
export function genreDetail(req, res, next) {
    async.parallel({
        genre: function(callback) {
            genre.findById(req.params.id)
                .exec(callback)
        },
        genreBooks: function(callback) {
            book.find({ 'genre': req.params.id })
                .exec(callback)
        }
    }, function(err, results) {
        if (err) { return next(err) }
        if (results.genre === null) { // Результаты отсутствуют.
            const err = new Error('Жанр не найден')
            err.status = 404
            return next(err)
        }
        // Успешное завершение, поэтому нужно отрисовать
        res.render('genreDetail', { title: 'Подробности жанра', genre: results.genre, genreBooks: results.genreBooks })
    })
};

// Показать форму создания жанра по запросу GET.
export function genreCreateGet(req, res) {
    res.render('genreForm', { title: 'Добавить жанр' })
};

// Создать жанр по запросу POST.
export const genreCreatePost = [
    // Проверить, что контрол name не пустой.
    validator.body('name', 'Название жанра должно быть заполнено.').trim().isLength({ min: 1 }),

    // Очистить (заэкранировать) контрол name.
    validator.body('name').escape(),

    // Выполнить запрос после проверки и очистки.
    (req, res, next) => {
        // Извлечь ошибки проверки из запроса.
        const errors = validator.validationResult(req)

        // Добавить объект жанра с заэкранированными данными, у которых также отсечены начальные и хвостовые пробелы.
        const currentGenre = new genre(
            { name: req.body.name }
        )

        if (!errors.isEmpty()) {
            // Ошибки существуют. Отрисовать форму повторно с очищенными значениями и сообщениями об ошибке.
            res.render('genreForm', { title: 'Добавить жанр', genre: currentGenre, errors: errors.array() })
            return
        }
        else {
            // Данные из формы правильные.
            // Проверить наличие жанра с таким же названием.
            genre.findOne({ 'name': req.body.name })
                .exec(function(err, foundGenre) {
                    if (err) { return next(err) }
                    if (foundGenre) {
                        // Жанр существует - перенаправить на страницу с его подробностями.
                        res.redirect(foundGenre.url)
                    }
                    else {
                        currentGenre.save(function(err) {
                            if (err) { return next(err) }
                            // Жанр сохранён - перенаправить на страницу с его подробностями.
                            res.redirect(currentGenre.url)
                        })
                    }
                })
        }
    }
]

// Показать форму удаления жанра по запросу GET.
export function genreDeleteGet(req, res, next) {
    async.parallel({
        genre: function(callback) {
            genre.findById(req.params.id).exec(callback)
        },
        genreBooks: function(callback) {
            book.find({ 'genre': req.params.id }).exec(callback)
        }
    }, function(err, results) {
        if (err) { return next(err) }
        if (results.genre === null) { // Результаты отсутствуют.
            res.redirect('/catalog/genres')
        }
        // Успешное завершение, поэтому нужно отрисовать
        res.render('genreDelete', { title: 'Удаление жанра', genre: results.genre, genreBooks: results.genreBooks })
    })
};

// Удалить жанр по запросу POST.
export function genreDeletePost(req, res, next) {
    async.parallel({
        genre: function(callback) {
            genre.findById(req.body.genreid).exec(callback)
        },
        genreBooks: function(callback) {
            book.find({ 'genre': req.body.genreid }).exec(callback)
        }
    }, function(err, results) {
        if (err) { return next(err) }
        // Успешное завершение
        if (results.genreBooks.length > 0) {
            // В библиотеке одна или более книг жанра. Визуализация выполняется так же, как и по запросу GET.
            res.render('genreDelete', { title: 'Удаление жанра', genre: results.genre, genreBooks: results.genreBooks })
        }
        else {
            // Нет никаких книг данного жанра. Удалить объект жанра и перенаправить в список жанров.
            genre.findByIdAndRemove(req.body.genreid, function deleteGenre(err) {
                if (err) { return next(err) }
                // Успешное завершение. Перейти к списку жанров.
                res.redirect('/catalog/authors')
            })
        }
    })
};

// Показать форму обновления жанра по запросу GET.
export function genreUpdateGet(req, res, next) {
    // Запросить жанр для размещения в форме.
    genre.findById(req.params.id, function(err, genre) {
        if (err) { return next(err) }
        if (genre === null) { // Результаты отсутствуют.
            const err = new Error('Жанр не найден')
            err.status = 404
            return next(err)
        }
        // Успешное завершение, поэтому нужно отрисовать
        res.render('genreForm', { title: 'Обновить жанр', genre })
    })
};

// Обновить жанр по запросу POST.
export const genreUpdatePost = [
    // Проверить, что контрол name не пустой.
    validator.body('name', 'Название жанра должно быть заполнено.').trim().isLength({ min: 1 }),

    // Очистить (заэкранировать) контрол name.
    validator.body('name').escape(),

    // Выполнить запрос после проверки и очистки.
    (req, res, next) => {
        // Извлечь ошибки проверки из запроса.
        const errors = validator.validationResult(req)

        // Добавить объект жанра со старым идентификатором, с заэкранированными данными, у которых также отсечены начальные и хвостовые пробелы.
        const currentGenre = new genre(
            {
                name: req.body.name,
                _id: req.params.id // Существующий идентификатор предотвращает создание нового.
            })

        if (!errors.isEmpty()) {
            // Ошибки существуют. Отрисовать форму повторно с очищенными значениями и сообщениями об ошибке.
            res.render('genreForm', { title: 'Обновить жанр', genre: currentGenre, errors: errors.array() })
            return
        }
        else {
            // Данные из формы верны. Обновить жанр.
            genre.findByIdAndUpdate(req.params.id, currentGenre, {}, function(err, genre) {
                if (err) { return next(err) }
                // Жанр обновлён - перенаправить на страницу с его подробностями.
                res.redirect(genre.url)
            })
        }
    }
];
